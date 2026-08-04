"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import * as smartlead from "@/lib/smartlead";
import * as heyreach from "@/lib/heyreach";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || `${proto}://${host}`;
}

export type ConnectionStatus = {
  smartlead: {
    configured: boolean;
    ok: boolean;
    campaigns?: number;
    webhooksRegistered?: number;
    error?: string;
  };
  heyreach: {
    configured: boolean;
    ok: boolean;
    campaigns?: number;
    accounts?: number;
    webhooksRegistered?: number;
    error?: string;
  };
  openai: { configured: boolean };
};

/** Live check of each integration: is the key present, and does it work? */
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  await requireUser();
  const url = await baseUrl();

  const status: ConnectionStatus = {
    smartlead: { configured: smartlead.isConfigured(), ok: false },
    heyreach: { configured: heyreach.isConfigured(), ok: false },
    openai: { configured: Boolean(process.env.OPENAI_API_KEY) },
  };

  if (status.smartlead.configured) {
    try {
      const campaigns = await smartlead.listCampaigns();
      status.smartlead.ok = true;
      status.smartlead.campaigns = campaigns.length;

      const target = `${url}/api/webhooks/smartlead?key=${process.env.SMARTLEAD_WEBHOOK_SECRET}`;
      let registered = 0;
      // Only sample the first few campaigns to keep this page fast.
      for (const c of campaigns.slice(0, 10)) {
        try {
          const hooks = await smartlead.listWebhooks(c.id);
          if (hooks.some((h) => h?.webhook_url === target)) registered++;
        } catch {
          // ignore per-campaign failures in a status check
        }
      }
      status.smartlead.webhooksRegistered = registered;
    } catch (e) {
      status.smartlead.error = e instanceof Error ? e.message : "connection failed";
    }
  }

  if (status.heyreach.configured) {
    try {
      const [campaigns, accounts, hooks] = await Promise.all([
        heyreach.listCampaigns(),
        heyreach.listLinkedInAccounts(),
        heyreach.listWebhooks().catch(() => []),
      ]);
      status.heyreach.ok = true;
      status.heyreach.campaigns = campaigns.length;
      status.heyreach.accounts = accounts.length;

      const target = `${url}/api/webhooks/heyreach?key=${process.env.HEYREACH_WEBHOOK_SECRET}`;
      status.heyreach.webhooksRegistered = hooks.filter(
        (h) => h?.webhookUrl === target
      ).length;
    } catch (e) {
      status.heyreach.error = e instanceof Error ? e.message : "connection failed";
    }
  }

  return status;
}

/**
 * Register the CRM webhook on every Smartlead campaign. Smartlead scopes
 * webhooks per campaign, so this replaces pasting the URL into each one.
 */
export async function syncSmartleadWebhooks(): Promise<{
  ok: boolean;
  created: number;
  updated: number;
  failed: { campaign: string; error: string }[];
  message: string;
}> {
  await requireUser();

  if (!smartlead.isConfigured()) {
    return { ok: false, created: 0, updated: 0, failed: [], message: "SMARTLEAD_API_KEY is not set." };
  }

  const url = await baseUrl();
  const target = `${url}/api/webhooks/smartlead?key=${process.env.SMARTLEAD_WEBHOOK_SECRET}`;

  try {
    const campaigns = await smartlead.listCampaigns();
    let created = 0;
    let updated = 0;
    const failed: { campaign: string; error: string }[] = [];

    for (const c of campaigns) {
      try {
        const res = await smartlead.upsertWebhook(c.id, target);
        if (res.created) created++;
        else updated++;
      } catch (e) {
        failed.push({
          campaign: c.name ?? String(c.id),
          error: e instanceof Error ? e.message : "failed",
        });
      }
    }

    // Surface the actual reason — a bare "1 failed" is not diagnosable.
    const detail = failed.length
      ? ` First error (${failed[0].campaign}): ${failed[0].error}`
      : "";

    return {
      ok: failed.length === 0,
      created,
      updated,
      failed,
      message: `Connected ${created + updated} of ${campaigns.length} campaigns${
        failed.length ? `, ${failed.length} failed.` : "."
      }${detail}`,
    };
  } catch (e) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      failed: [],
      message: e instanceof Error ? e.message : "Sync failed",
    };
  }
}

/** Register one HeyReach webhook per event type, covering all campaigns. */
export async function syncHeyReachWebhooks(): Promise<{
  ok: boolean;
  created: string[];
  existing: string[];
  failed: { event: string; error: string }[];
  message: string;
}> {
  await requireUser();

  if (!heyreach.isConfigured()) {
    return { ok: false, created: [], existing: [], failed: [], message: "HEYREACH_API_KEY is not set." };
  }

  const url = await baseUrl();
  const target = `${url}/api/webhooks/heyreach?key=${process.env.HEYREACH_WEBHOOK_SECRET}`;

  try {
    const res = await heyreach.syncWebhooks(target);
    return {
      ok: res.failed.length === 0,
      ...res,
      message: `${res.created.length} created, ${res.existing.length} already connected${
        res.failed.length ? `, ${res.failed.length} failed` : ""
      }.`,
    };
  } catch (e) {
    return {
      ok: false,
      created: [],
      existing: [],
      failed: [],
      message: e instanceof Error ? e.message : "Sync failed",
    };
  }
}
