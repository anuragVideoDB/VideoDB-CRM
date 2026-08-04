// ─────────────────────────────────────────────────────────────
// HeyReach API client (LinkedIn outreach)
//
// Auth: X-API-KEY header (raw key, no Bearer prefix).
// Base: https://api.heyreach.io/api/public
// Most "read" endpoints are POST with a JSON body, not GET.
// Rate limit: 300 requests/minute across the whole key.
// ─────────────────────────────────────────────────────────────

const BASE = "https://api.heyreach.io/api/public";

// 300 req/min = 5/s. Keep a little headroom.
const MIN_GAP_MS = 220;
let lastCall = 0;

async function throttle() {
  const wait = Math.max(0, lastCall + MIN_GAP_MS - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export class HeyReachError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "HeyReachError";
  }
}

function apiKey(): string {
  const key = process.env.HEYREACH_API_KEY;
  if (!key) throw new HeyReachError("HEYREACH_API_KEY is not configured");
  return key;
}

async function call<T>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Record<string, string | number> } = {}
): Promise<T> {
  const qs = opts.query
    ? "?" + new URLSearchParams(
        Object.fromEntries(Object.entries(opts.query).map(([k, v]) => [k, String(v)]))
      )
    : "";

  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    await throttle();

    let res: Response;
    try {
      res = await fetch(`${BASE}${path}${qs}`, {
        method: opts.method ?? (opts.body ? "POST" : "GET"),
        headers: {
          "X-API-KEY": apiKey(),
          "Content-Type": "application/json",
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        cache: "no-store",
      });
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      lastErr = new HeyReachError(`HeyReach ${res.status}`, res.status);
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      continue;
    }

    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = text;
    }

    if (!res.ok) {
      const msg =
        (body as { message?: string })?.message ??
        (typeof body === "string" && body ? body.slice(0, 200) : `HTTP ${res.status}`);
      throw new HeyReachError(`HeyReach error: ${msg}`, res.status);
    }

    return body as T;
  }

  throw lastErr instanceof Error
    ? lastErr
    : new HeyReachError("HeyReach request failed after retries");
}

// ── Types ────────────────────────────────────────────────────

export type HeyReachCampaign = {
  id: number;
  name: string;
  status: string; // DRAFT | IN_PROGRESS | PAUSED | FINISHED | CANCELED | FAILED | STARTING
  campaignAccountIds?: number[];
};

export type HeyReachAccount = {
  id: number;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  isActive?: boolean;
  authIsValid?: boolean;
};

export type HeyReachLeadInput = {
  profileUrl: string; // the one genuinely required field
  firstName?: string;
  lastName?: string;
  companyName?: string;
  position?: string;
  location?: string;
  emailAddress?: string;
  summary?: string;
  about?: string;
  customUserFields?: { name: string; value: string }[];
};

type Paged<T> = { items: T[]; totalCount: number };

// ── Operations ───────────────────────────────────────────────

export async function checkApiKey(): Promise<boolean> {
  try {
    await call("/auth/CheckApiKey");
    return true;
  } catch {
    return false;
  }
}

/** Fetch every campaign, following HeyReach's offset/limit pagination. */
export async function listCampaigns(): Promise<HeyReachCampaign[]> {
  const out: HeyReachCampaign[] = [];
  let offset = 0;
  const limit = 100; // documented maximum

  for (;;) {
    const page = await call<Paged<HeyReachCampaign>>("/campaign/GetAll", {
      body: { offset, limit, keyword: "" },
    });
    const items = page?.items ?? [];
    out.push(...items);
    offset += items.length;
    if (!items.length || offset >= (page?.totalCount ?? 0)) break;
  }
  return out;
}

export async function listLinkedInAccounts(): Promise<HeyReachAccount[]> {
  const page = await call<Paged<HeyReachAccount>>("/li_account/GetAll", {
    body: { keyword: "", offset: 0, limit: 100 },
  });
  return page?.items ?? [];
}

/**
 * Enrol leads into a campaign — this is how first-touch LinkedIn actions
 * (connection requests, messages) are triggered; there is no direct
 * "send connection request" endpoint.
 *
 * Note: HeyReach rejects leads added to a DRAFT campaign, so we check first
 * and fail with a clear message rather than a bare 400.
 */
export async function addLeadsToCampaign(
  campaignId: number,
  linkedInAccountId: number,
  leads: HeyReachLeadInput[]
): Promise<{ addedLeadsCount: number; updatedLeadsCount: number; failedLeadsCount: number }> {
  const campaign = await call<HeyReachCampaign>("/campaign/GetById", {
    query: { campaignId },
  }).catch(() => null);

  if (campaign && campaign.status === "DRAFT") {
    throw new HeyReachError(
      `Campaign "${campaign.name}" is still a DRAFT — HeyReach will not accept leads until it is started.`
    );
  }

  const CHUNK = 100;
  const totals = { addedLeadsCount: 0, updatedLeadsCount: 0, failedLeadsCount: 0 };

  for (let i = 0; i < leads.length; i += CHUNK) {
    const res = await call<typeof totals>("/campaign/AddLeadsToCampaignV2", {
      body: {
        campaignId,
        accountLeadPairs: leads.slice(i, i + CHUNK).map((lead) => ({
          linkedInAccountId,
          lead,
        })),
        resumeFinishedCampaign: false,
        resumePausedCampaign: false,
      },
    });
    totals.addedLeadsCount += res?.addedLeadsCount ?? 0;
    totals.updatedLeadsCount += res?.updatedLeadsCount ?? 0;
    totals.failedLeadsCount += res?.failedLeadsCount ?? 0;
  }

  return totals;
}

/** Reply inside an existing LinkedIn conversation. */
export async function sendMessage(args: {
  conversationId: string;
  linkedInAccountId: number;
  message: string;
  subject?: string;
}): Promise<unknown> {
  return call("/inbox/SendMessage", {
    body: {
      conversationId: args.conversationId,
      linkedInAccountId: args.linkedInAccountId,
      message: args.message,
      ...(args.subject ? { subject: args.subject } : {}),
    },
  });
}

export async function getConversations(filters: {
  campaignIds?: number[];
  linkedInAccountIds?: number[];
  leadProfileUrl?: string;
  seen?: boolean;
  offset?: number;
  limit?: number;
}): Promise<Paged<Record<string, unknown>>> {
  const { offset = 0, limit = 50, ...rest } = filters;
  return call("/inbox/GetConversationsV2", {
    body: { offset, limit, filters: { searchString: "", ...rest } },
  });
}

export async function stopLeadInCampaign(
  campaignId: number,
  args: { leadMemberId?: string; leadUrl?: string }
) {
  return call("/campaign/StopLeadInCampaign", {
    body: { campaignId, ...args },
  });
}

// ── Webhooks ─────────────────────────────────────────────────

// One webhook per event type. Empty campaignIds means "all campaigns".
export const DEFAULT_WEBHOOK_EVENTS = [
  "CONNECTION_REQUEST_ACCEPTED",
  "EVERY_MESSAGE_REPLY_RECEIVED",
  "INMAIL_REPLY_RECEIVED",
  "MESSAGE_SENT",
  "CONNECTION_REQUEST_SENT",
];

export type HeyReachWebhook = {
  id: number;
  webhookName?: string;
  webhookUrl?: string;
  eventType?: string;
  isActive?: boolean;
};

export async function listWebhooks(): Promise<HeyReachWebhook[]> {
  const page = await call<Paged<HeyReachWebhook>>("/webhooks/GetAllWebhooks", {
    body: { offset: 0, limit: 100 },
  });
  return page?.items ?? [];
}

export async function createWebhook(
  webhookName: string,
  webhookUrl: string,
  eventType: string,
  campaignIds: number[] = []
): Promise<unknown> {
  return call("/webhooks/CreateWebhook", {
    body: {
      // HeyReach caps the name at 25 characters.
      webhookName: webhookName.slice(0, 25),
      webhookUrl,
      eventType,
      campaignIds,
    },
  });
}

export async function deleteWebhook(webhookId: number): Promise<unknown> {
  return call("/webhooks/DeleteWebhook", {
    method: "DELETE",
    query: { webhookId },
  });
}

/**
 * Ensure the CRM has one active webhook per event type, covering all
 * campaigns. Idempotent — skips event types already pointing at our URL.
 */
export async function syncWebhooks(
  webhookUrl: string,
  events: string[] = DEFAULT_WEBHOOK_EVENTS
): Promise<{ created: string[]; existing: string[]; failed: { event: string; error: string }[] }> {
  const created: string[] = [];
  const existing: string[] = [];
  const failed: { event: string; error: string }[] = [];

  let current: HeyReachWebhook[] = [];
  try {
    current = await listWebhooks();
  } catch {
    // Proceed with creation if listing fails.
  }

  for (const event of events) {
    const already = current.some(
      (w) => w.eventType === event && w.webhookUrl === webhookUrl
    );
    if (already) {
      existing.push(event);
      continue;
    }
    try {
      await createWebhook(`VideoDB CRM ${event}`.slice(0, 25), webhookUrl, event, []);
      created.push(event);
    } catch (e) {
      failed.push({ event, error: e instanceof Error ? e.message : "unknown error" });
    }
  }

  return { created, existing, failed };
}

export function isConfigured(): boolean {
  return Boolean(process.env.HEYREACH_API_KEY);
}
