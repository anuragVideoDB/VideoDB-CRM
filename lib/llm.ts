// ─────────────────────────────────────────────────────────────
// LLM layer.
//
// Deliberately provider-agnostic: the rest of the app talks to `complete()`
// and never to OpenAI directly, so swapping or adding a provider later is a
// change in this one file.
//
// Model selection order:
//   1. OPENAI_MODEL env var (explicit override — always wins)
//   2. Best match from the account's live /v1/models list, by preference
//   3. A conservative fallback
// Discovering at runtime means a new model generation doesn't require a
// code change, and we never hardcode an id the account can't access.
// ─────────────────────────────────────────────────────────────

const OPENAI_BASE = "https://api.openai.com/v1";

// Preferred families, best-first. Matched as prefixes against live model ids.
const MODEL_PREFERENCE = [
  "gpt-5.6-terra", // balances quality and cost — good default for drafting
  "gpt-5.6-luna",
  "gpt-5.6-sol",
  "gpt-5.6",
  "gpt-5.5",
  "gpt-5",
  "gpt-4.1",
  "gpt-4o",
];

const FALLBACK_MODEL = "gpt-4.1";

export class LLMError extends Error {}

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new LLMError("OPENAI_API_KEY is not configured");
  return key;
}

let cachedModel: string | null = null;
let cachedAt = 0;
const MODEL_TTL_MS = 30 * 60 * 1000;

export async function resolveModel(): Promise<string> {
  const override = process.env.OPENAI_MODEL?.trim();
  if (override) return override;

  if (cachedModel && Date.now() - cachedAt < MODEL_TTL_MS) return cachedModel;

  try {
    const res = await fetch(`${OPENAI_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
      cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json()) as { data?: { id: string }[] };
      const ids = (body.data ?? []).map((m) => m.id);
      for (const pref of MODEL_PREFERENCE) {
        // Prefer an exact id, otherwise the shortest id starting with the
        // preferred family (avoids dated/preview variants when a stable
        // alias exists).
        const exact = ids.find((id) => id === pref);
        if (exact) {
          cachedModel = exact;
          cachedAt = Date.now();
          return exact;
        }
        const matches = ids.filter((id) => id.startsWith(pref)).sort((a, b) => a.length - b.length);
        if (matches.length) {
          cachedModel = matches[0];
          cachedAt = Date.now();
          return matches[0];
        }
      }
    }
  } catch {
    // Fall through to the static fallback.
  }

  cachedModel = FALLBACK_MODEL;
  cachedAt = Date.now();
  return FALLBACK_MODEL;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type CompleteOptions = {
  system?: string;
  messages: ChatMessage[];
  /** Ask the model to return a JSON object. */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
};

/**
 * Single entry point for text generation. Uses Chat Completions, which is the
 * most broadly supported surface across model generations.
 */
export async function complete(opts: CompleteOptions): Promise<string> {
  const model = await resolveModel();

  const messages: ChatMessage[] = opts.system
    ? [{ role: "system", content: opts.system }, ...opts.messages]
    : opts.messages;

  const payload: Record<string, unknown> = { model, messages };
  if (opts.json) payload.response_format = { type: "json_object" };
  if (opts.temperature !== undefined) payload.temperature = opts.temperature;
  if (opts.maxTokens !== undefined) payload.max_completion_tokens = opts.maxTokens;

  let lastErr: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (res.status === 429 || res.status >= 500) {
      lastErr = `OpenAI ${res.status}`;
      await new Promise((r) => setTimeout(r, 700 * 2 ** attempt));
      continue;
    }

    const body = (await res.json().catch(() => null)) as
      | {
          choices?: { message?: { content?: string } }[];
          error?: { message?: string; param?: string };
        }
      | null;

    if (!res.ok) {
      const msg = body?.error?.message ?? `OpenAI HTTP ${res.status}`;

      // Some models reject a non-default temperature or the JSON response
      // format. Drop the offending parameter and retry once rather than
      // failing the whole draft.
      if (/temperature/i.test(msg) && "temperature" in payload) {
        delete payload.temperature;
        continue;
      }
      if (/response_format|json/i.test(msg) && "response_format" in payload) {
        delete payload.response_format;
        continue;
      }

      throw new LLMError(msg);
    }

    const text = body?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new LLMError("The model returned an empty response.");
    return text;
  }

  throw new LLMError(lastErr ?? "OpenAI request failed after retries");
}

/** Convenience wrapper that parses a JSON object response. */
export async function completeJSON<T>(opts: CompleteOptions): Promise<T> {
  const raw = await complete({ ...opts, json: true });
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Models occasionally wrap JSON in prose or a code fence.
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new LLMError("The model did not return valid JSON.");
  }
}

export function isConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
