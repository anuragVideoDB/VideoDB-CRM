import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";

// Plain (cookie-less) Supabase client for server-side ingestion.
// It uses the public anon key + the INGEST_SECRET to call crm_ingest().
function ingestClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export type NormalizedEvent = {
  provider: "smartlead" | "heyreach" | "clay" | "form";
  source: "smartlead" | "heyreach" | "clay" | "inbound_form";
  channel: "inbound" | "outbound";
  eventType: string;
  externalId?: string | null;
  company?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  lead?: Record<string, unknown>;
  activity?: Record<string, unknown>;
  raw: unknown;
};

// Push a normalized event into the CRM via the crm_ingest DB function.
export async function ingest(evt: NormalizedEvent) {
  const supabase = ingestClient();
  const { data, error } = await supabase.rpc("crm_ingest", {
    p_secret: process.env.INGEST_SECRET!,
    p_provider: evt.provider,
    p_source: evt.source,
    p_channel: evt.channel,
    p_event_type: evt.eventType,
    // The DB function treats a null external_id as "no de-dup key". The
    // generated type marks it required, so we bridge with a cast.
    p_external_id: (evt.externalId ?? null) as string,
    p_company: (evt.company ?? {}) as Json,
    p_contact: (evt.contact ?? {}) as Json,
    p_lead: (evt.lead ?? {}) as Json,
    p_activity: (evt.activity ?? {}) as Json,
    p_raw: (evt.raw ?? {}) as Json,
  });

  if (error) throw new Error(error.message);
  return data as { status: string; lead_id?: string; event_id?: string };
}

// Confirm the ?key= (or x-webhook-secret header) matches the expected value.
export function verifyWebhookSecret(
  request: Request,
  expected: string | undefined
): boolean {
  if (!expected) return false;
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("key");
  const fromHeader = request.headers.get("x-webhook-secret");
  return fromQuery === expected || fromHeader === expected;
}
