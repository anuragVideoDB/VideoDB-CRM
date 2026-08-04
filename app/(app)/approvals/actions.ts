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
  return { supabase, user };
}

type Payload = Record<string, unknown>;

function str(p: Payload, k: string): string | undefined {
  const v = p[k];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function num(p: Payload, k: string): number | undefined {
  const v = p[k];
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() && !isNaN(Number(v))) return Number(v);
  return undefined;
}

/**
 * Approve an action: execute it against the right provider, log the result to
 * the lead timeline, and mark the action executed. The edited body from the
 * reviewer always wins over the agent's original draft.
 */
export async function approveAction(
  id: string,
  edits?: { body?: string; subject?: string }
) {
  const { supabase, user } = await requireUser();

  const { data: action, error } = await supabase
    .from("agent_actions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !action) return { error: "Action not found" };
  if (action.status === "executed") return { error: "Already executed." };

  const payload = { ...((action.payload as Payload) ?? {}) };
  if (edits?.body) payload.body = edits.body;
  if (edits?.subject) payload.subject = edits.subject;

  // Mark in-flight so a double click can't send twice.
  await supabase
    .from("agent_actions")
    .update({
      status: "executing",
      approved_by: user.id,
      decided_at: new Date().toISOString(),
      payload: payload as never,
    })
    .eq("id", id);

  const body = str(payload, "body");
  const channel = str(payload, "channel") ?? "email";

  try {
    if (!body) throw new Error("Nothing to send — the draft is empty.");

    let result: unknown;
    let activityType: string;
    let activityTitle: string;

    if (action.type === "draft_reply" && channel === "email") {
      const campaignId = num(payload, "campaign_id");
      const statsId = str(payload, "stats_id");
      const replyMessageId = str(payload, "message_id");
      if (!campaignId || !statsId || !replyMessageId) {
        throw new Error(
          "Missing Smartlead thread details (campaign_id / stats_id / message_id) — cannot reply into the original thread."
        );
      }
      result = await smartlead.replyToThread(campaignId, {
        statsId,
        replyMessageId,
        body,
      });
      activityType = "email_sent";
      activityTitle = "Replied by agent (approved)";
    } else if (
      (action.type === "draft_reply" || action.type === "send_li_message") &&
      channel === "linkedin"
    ) {
      const conversationId = str(payload, "conversation_id");
      const accountId = num(payload, "linkedin_account_id");
      if (!conversationId || !accountId) {
        throw new Error(
          "Missing HeyReach conversation details (conversation_id / linkedin_account_id)."
        );
      }
      result = await heyreach.sendMessage({
        conversationId,
        linkedInAccountId: accountId,
        message: body,
      });
      activityType = "li_message_sent";
      activityTitle = "LinkedIn reply sent by agent (approved)";
    } else if (action.type === "add_to_sequence") {
      const campaignId = num(payload, "campaign_id");
      const email = str(payload, "email");
      if (!campaignId || !email) throw new Error("Missing campaign or email.");
      result = await smartlead.addLeadsToCampaign(campaignId, [
        {
          email,
          first_name: str(payload, "first_name"),
          last_name: str(payload, "last_name"),
          company_name: str(payload, "company_name"),
          custom_fields: {
            ...(str(payload, "subject") ? { Subject: str(payload, "subject")! } : {}),
            First_Line: body,
          },
        },
      ]);
      activityType = "email_sent";
      activityTitle = "Added to Smartlead sequence by agent (approved)";
    } else if (action.type === "draft_email") {
      // A first-touch email with no thread to reply into. We record the
      // approved copy; sending happens by enrolling into a sequence.
      throw new Error(
        "This is a first-touch draft. Use 'Add to sequence' to send it via Smartlead, or copy the text."
      );
    } else {
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    await supabase
      .from("agent_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        result: (result ?? {}) as never,
      })
      .eq("id", id);

    await supabase.from("activities").insert({
      lead_id: action.lead_id,
      contact_id: action.contact_id,
      type: activityType,
      channel: channel === "linkedin" ? "linkedin" : "email",
      direction: "outbound",
      source: "crm",
      title: activityTitle,
      body,
      created_by: user.id,
    });

    revalidatePath("/approvals");
    revalidatePath(`/leads/${action.lead_id}`);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Execution failed";
    await supabase
      .from("agent_actions")
      .update({ status: "failed", result: { error: message } as never })
      .eq("id", id);
    revalidatePath("/approvals");
    return { error: message };
  }
}

export async function rejectAction(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("agent_actions")
    .update({
      status: "rejected",
      approved_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/approvals");
  return { ok: true };
}

/** Save reviewer edits without sending. */
export async function saveDraft(
  id: string,
  edits: { body?: string; subject?: string }
) {
  const { supabase } = await requireUser();
  const { data: action } = await supabase
    .from("agent_actions")
    .select("payload")
    .eq("id", id)
    .single();

  const payload = { ...((action?.payload as Payload) ?? {}), ...edits };
  const { error } = await supabase
    .from("agent_actions")
    .update({ payload: payload as never })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/approvals");
  return { ok: true };
}
