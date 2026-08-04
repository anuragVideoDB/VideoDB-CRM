// ─────────────────────────────────────────────────────────────
// Smartlead API client (email outreach)
//
// Auth: every request carries ?api_key=… (Smartlead uses a query param,
// not a header). Base host is server.smartlead.ai — api.smartlead.ai only
// serves the docs site.
//
// Defensive by design: Smartlead returns HTTP 200 with { ok: false } for
// some failures, so we check the body as well as the status.
// ─────────────────────────────────────────────────────────────

const BASE = "https://server.smartlead.ai/api/v1";

// Smartlead documents ~10 requests / 2s. Stay under it with a simple
// serialized queue plus a small gap between calls.
const MIN_GAP_MS = 220;
let lastCall = 0;

async function throttle() {
  const wait = Math.max(0, lastCall + MIN_GAP_MS - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export class SmartleadError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "SmartleadError";
  }
}

function apiKey(): string {
  const key = process.env.SMARTLEAD_API_KEY;
  if (!key) throw new SmartleadError("SMARTLEAD_API_KEY is not configured");
  return key;
}

async function call<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number> }
): Promise<T> {
  const params = new URLSearchParams({ api_key: apiKey() });
  for (const [k, v] of Object.entries(init?.query ?? {})) {
    params.set(k, String(v));
  }

  // Retry on 429 / 5xx with exponential backoff.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    await throttle();
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}?${params}`, {
        ...init,
        headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
        cache: "no-store",
      });
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      lastErr = new SmartleadError(`Smartlead ${res.status}`, res.status);
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
      continue;
    }

    const text = await res.text();
    let body: unknown = undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      // Some endpoints (lead export) return CSV rather than JSON.
      body = text;
    }

    if (!res.ok) {
      const msg =
        (body as { message?: string })?.message ??
        (typeof body === "string" ? body.slice(0, 200) : "") ??
        `HTTP ${res.status}`;
      throw new SmartleadError(`Smartlead error: ${msg}`, res.status);
    }

    // 200 with ok:false is a real failure in Smartlead's API.
    if (
      body &&
      typeof body === "object" &&
      "ok" in body &&
      (body as { ok: unknown }).ok === false
    ) {
      throw new SmartleadError(
        `Smartlead rejected the request: ${JSON.stringify(body).slice(0, 200)}`,
        res.status
      );
    }

    return body as T;
  }

  throw lastErr instanceof Error
    ? lastErr
    : new SmartleadError("Smartlead request failed after retries");
}

// ── Types ────────────────────────────────────────────────────

export type SmartleadCampaign = {
  id: number;
  name: string;
  status: string; // DRAFTED | ACTIVE | COMPLETED | STOPPED | PAUSED
  created_at?: string;
};

export type SmartleadLeadInput = {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  website?: string;
  location?: string;
  phone_number?: string;
  linkedin_profile?: string;
  company_url?: string;
  custom_fields?: Record<string, string>;
};

export type AddLeadsResult = {
  ok?: boolean;
  upload_count?: number;
  total_leads?: number;
  already_added_to_campaign?: number;
  duplicate_count?: number;
  invalid_email_count?: number;
  unsubscribed_leads?: number;
};

export type MessageHistoryEntry = {
  type: "SENT" | "REPLY" | string;
  message_id?: string;
  stats_id?: string;
  time?: string;
  email_body?: string;
  subject?: string;
};

// ── Operations ───────────────────────────────────────────────

export async function listCampaigns(): Promise<SmartleadCampaign[]> {
  const res = await call<SmartleadCampaign[]>("/campaigns");
  return Array.isArray(res) ? res : [];
}

/**
 * Add leads to a campaign. Smartlead caps each request, so callers can pass
 * any number and we chunk automatically.
 */
export async function addLeadsToCampaign(
  campaignId: number,
  leads: SmartleadLeadInput[],
  settings?: {
    ignore_global_block_list?: boolean;
    ignore_unsubscribe_list?: boolean;
    ignore_duplicate_leads_in_other_campaign?: boolean;
  }
): Promise<AddLeadsResult[]> {
  const CHUNK = 100;
  const results: AddLeadsResult[] = [];

  for (let i = 0; i < leads.length; i += CHUNK) {
    const chunk = leads.slice(i, i + CHUNK).map((l) => ({
      ...l,
      // Phone numbers can carry a leading zero — always send as a string.
      phone_number: l.phone_number ? String(l.phone_number) : undefined,
    }));

    results.push(
      await call<AddLeadsResult>(`/campaigns/${campaignId}/leads`, {
        method: "POST",
        body: JSON.stringify({
          lead_list: chunk,
          settings: {
            ignore_global_block_list: false,
            ignore_unsubscribe_list: false,
            ignore_duplicate_leads_in_other_campaign: false,
            ...settings,
          },
        }),
      })
    );
  }

  return results;
}

export async function getMessageHistory(
  campaignId: number,
  leadId: string | number
): Promise<{ history: MessageHistoryEntry[]; from?: string; to?: string }> {
  return call(`/campaigns/${campaignId}/leads/${leadId}/message-history`);
}

/**
 * Reply inside an existing email thread. `statsId` and `replyMessageId` come
 * from the EMAIL_REPLY webhook (stats_id / message_id) or message history.
 * Smartlead queues the send, so a 200 means "accepted", not "delivered".
 */
export async function replyToThread(
  campaignId: number,
  args: {
    statsId: string;
    replyMessageId: string;
    body: string;
    replyEmailTime?: string;
    replyEmailBody?: string;
    cc?: string;
    bcc?: string;
    addSignature?: boolean;
  }
): Promise<unknown> {
  return call(`/campaigns/${campaignId}/reply-email-thread`, {
    method: "POST",
    body: JSON.stringify({
      email_stats_id: args.statsId,
      reply_message_id: args.replyMessageId,
      email_body: args.body,
      // Must be a full ISO datetime with milliseconds + Z.
      reply_email_time: args.replyEmailTime ?? new Date().toISOString(),
      reply_email_body: args.replyEmailBody ?? "",
      cc: args.cc ?? "",
      bcc: args.bcc ?? "",
      add_signature: args.addSignature ?? true,
    }),
  });
}

export async function pauseLead(campaignId: number, leadId: string | number) {
  return call(`/campaigns/${campaignId}/leads/${leadId}/pause`, { method: "POST" });
}

export async function resumeLead(
  campaignId: number,
  leadId: string | number,
  delayDays = 0
) {
  return call(`/campaigns/${campaignId}/leads/${leadId}/resume`, {
    method: "POST",
    body: JSON.stringify({ resume_lead_with_delay_days: delayDays }),
  });
}

// ── Webhooks ─────────────────────────────────────────────────

export type SmartleadWebhook = {
  id: number | null;
  name: string;
  webhook_url: string;
  event_types: string[];
  categories?: string[];
};

export const DEFAULT_WEBHOOK_EVENTS = [
  "EMAIL_SENT",
  "EMAIL_OPEN",
  "EMAIL_LINK_CLICK",
  "EMAIL_REPLY",
  "LEAD_UNSUBSCRIBED",
];

export async function listWebhooks(campaignId: number): Promise<SmartleadWebhook[]> {
  const res = await call<SmartleadWebhook[] | { data?: SmartleadWebhook[] }>(
    `/campaigns/${campaignId}/webhooks`
  );
  if (Array.isArray(res)) return res;
  return res?.data ?? [];
}

/**
 * Create or update the CRM webhook on a campaign. Smartlead scopes webhooks
 * per campaign, so this must run for every campaign we want to track.
 * Idempotent: reuses the existing webhook id when one with our name exists.
 */
export async function upsertWebhook(
  campaignId: number,
  webhookUrl: string,
  name = "VideoDB CRM",
  eventTypes: string[] = DEFAULT_WEBHOOK_EVENTS
): Promise<{ campaignId: number; created: boolean }> {
  let existingId: number | null = null;
  try {
    const hooks = await listWebhooks(campaignId);
    const mine = hooks.find(
      (h) => h?.name === name || h?.webhook_url === webhookUrl
    );
    existingId = mine?.id ?? null;
  } catch {
    // Listing can fail on some campaigns; fall through and create.
  }

  // Only send `id` when updating — some Smartlead accounts reject an explicit
  // null. `categories` is omitted entirely when empty for the same reason.
  const payload: Record<string, unknown> = {
    name,
    webhook_url: webhookUrl,
    event_types: eventTypes,
  };
  if (existingId !== null) payload.id = existingId;

  try {
    await call(`/campaigns/${campaignId}/webhooks`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Retry once with the fuller shape the docs describe, in case this
    // account expects the explicit null id / categories array.
    await call(`/campaigns/${campaignId}/webhooks`, {
      method: "POST",
      body: JSON.stringify({
        id: existingId,
        name,
        webhook_url: webhookUrl,
        event_types: eventTypes,
        categories: [],
      }),
    }).catch(() => {
      throw e; // surface the original, more informative error
    });
  }

  return { campaignId, created: existingId === null };
}

export function isConfigured(): boolean {
  return Boolean(process.env.SMARTLEAD_API_KEY);
}
