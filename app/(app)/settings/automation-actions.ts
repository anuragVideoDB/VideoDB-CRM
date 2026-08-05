"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tick } from "@/lib/automation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return supabase;
}

export type AutomationSettingsRow = {
  auto_draft_replies: boolean;
  auto_send_replies: boolean;
  auto_advance_sequences: boolean;
  pause_on_reply: boolean;
  send_window_start: number;
  send_window_end: number;
  timezone: string;
  max_actions_per_run: number;
};

export async function getAutomationSettings(): Promise<{
  settings: AutomationSettingsRow | null;
  lastRun: {
    started_at: string;
    replies_drafted: number;
    actions_sent: number;
    errors: unknown;
  } | null;
}> {
  const supabase = await requireUser();

  const [{ data: settings }, { data: runs }] = await Promise.all([
    supabase.from("automation_settings").select("*").eq("id", true).single(),
    supabase
      .from("automation_runs")
      .select("started_at, replies_drafted, actions_sent, errors")
      .order("started_at", { ascending: false })
      .limit(1),
  ]);

  return {
    settings: (settings ?? null) as AutomationSettingsRow | null,
    lastRun: runs?.[0] ?? null,
  };
}

export async function saveAutomationSettings(
  patch: Partial<AutomationSettingsRow>
) {
  const supabase = await requireUser();
  const { error } = await supabase
    .from("automation_settings")
    .update(patch)
    .eq("id", true);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

/** Run the worker immediately, ignoring the send window. */
export async function runAutomationNow() {
  await requireUser();
  try {
    const res = await tick({ force: true });
    if (!res.ran) return { ok: true, message: res.reason ?? "Nothing to do." };
    const parts = [
      `${res.repliesDrafted} repl${res.repliesDrafted === 1 ? "y" : "ies"} drafted`,
    ];
    if (res.actionsSent) parts.push(`${res.actionsSent} sent automatically`);
    if (res.errors.length) parts.push(`${res.errors.length} error(s)`);
    const detail = res.errors.length ? ` — ${res.errors[0].error}` : "";
    revalidatePath("/approvals");
    return { ok: true, message: parts.join(", ") + "." + detail };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Run failed" };
  }
}
