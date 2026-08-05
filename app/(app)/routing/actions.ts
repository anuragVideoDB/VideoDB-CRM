"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import * as smartlead from "@/lib/smartlead";
import * as heyreach from "@/lib/heyreach";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return supabase;
}

export type CampaignOption = {
  provider: "smartlead" | "heyreach";
  id: string;
  name: string;
  status: string;
  /** HeyReach cannot accept leads into a DRAFT campaign. */
  enrollable: boolean;
};

/** Campaigns from both tools, so rules are built by picking, not typing IDs. */
export async function listCampaigns(): Promise<{
  campaigns: CampaignOption[];
  linkedinAccounts: { id: number; name: string }[];
  errors: string[];
}> {
  await requireUser();
  const campaigns: CampaignOption[] = [];
  const linkedinAccounts: { id: number; name: string }[] = [];
  const errors: string[] = [];

  if (smartlead.isConfigured()) {
    try {
      for (const c of await smartlead.listCampaigns()) {
        campaigns.push({
          provider: "smartlead",
          id: String(c.id),
          name: c.name,
          status: c.status,
          enrollable: true,
        });
      }
    } catch (e) {
      errors.push(`Smartlead: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  if (heyreach.isConfigured()) {
    try {
      for (const c of await heyreach.listCampaigns()) {
        campaigns.push({
          provider: "heyreach",
          id: String(c.id),
          name: c.name,
          status: c.status,
          enrollable: c.status !== "DRAFT",
        });
      }
      for (const a of await heyreach.listLinkedInAccounts()) {
        linkedinAccounts.push({
          id: a.id,
          name: [a.firstName, a.lastName].filter(Boolean).join(" ") || `Account ${a.id}`,
        });
      }
    } catch (e) {
      errors.push(`HeyReach: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  return { campaigns, linkedinAccounts, errors };
}

export type RuleInput = {
  id?: string;
  name: string;
  priority: number;
  provider: "smartlead" | "heyreach";
  campaign_external_id: string;
  campaign_name?: string | null;
  linkedin_account_id?: number | null;
  match_source?: string[] | null;
  match_channel?: string | null;
  match_industry?: string[] | null;
  min_employees?: number | null;
  max_employees?: number | null;
  requires_email?: boolean;
  requires_linkedin?: boolean;
  auto_enroll?: boolean;
  is_active?: boolean;
};

export async function saveRule(input: RuleInput) {
  const supabase = await requireUser();

  if (!input.name?.trim()) return { error: "Give the rule a name." };
  if (!input.campaign_external_id) return { error: "Pick a campaign." };
  if (input.provider === "heyreach" && !input.linkedin_account_id) {
    return { error: "HeyReach needs a sending LinkedIn account." };
  }

  const row = {
    name: input.name.trim(),
    priority: input.priority ?? 100,
    provider: input.provider,
    campaign_external_id: String(input.campaign_external_id),
    campaign_name: input.campaign_name ?? null,
    linkedin_account_id: input.linkedin_account_id ?? null,
    match_source: input.match_source?.length ? input.match_source : null,
    match_channel: input.match_channel || null,
    match_industry: input.match_industry?.length ? input.match_industry : null,
    min_employees: input.min_employees ?? null,
    max_employees: input.max_employees ?? null,
    // Enrolling into an email campaign without an address can never work.
    requires_email:
      input.provider === "smartlead" ? true : Boolean(input.requires_email),
    requires_linkedin:
      input.provider === "heyreach" ? true : Boolean(input.requires_linkedin),
    auto_enroll: Boolean(input.auto_enroll),
    is_active: input.is_active ?? true,
  };

  const { error } = input.id
    ? await supabase.from("routing_rules").update(row).eq("id", input.id)
    : await supabase.from("routing_rules").insert(row);

  if (error) return { error: error.message };
  revalidatePath("/routing");
  return { ok: true };
}

export async function deleteRule(id: string) {
  const supabase = await requireUser();
  const { error } = await supabase.from("routing_rules").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/routing");
  return { ok: true };
}

export async function toggleRule(id: string, isActive: boolean) {
  const supabase = await requireUser();
  const { error } = await supabase
    .from("routing_rules")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/routing");
  return { ok: true };
}

/** Show which leads the current rules would pick up, without enrolling them. */
export async function previewMatches() {
  const supabase = await requireUser();
  const { data, error } = await supabase.rpc("automation_get_enrollments", {
    p_secret: process.env.INGEST_SECRET!,
    p_limit: 25,
  });
  if (error) return { error: error.message };
  return { ok: true, matches: (data ?? []) as Record<string, unknown>[] };
}
