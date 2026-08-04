"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  buildLeadContext,
  draftEmail,
  draftReply,
  draftLinkedInMessage,
  summarizeLead,
  proposeAction,
} from "@/lib/agent";
import { isConfigured } from "@/lib/llm";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return supabase;
}

/**
 * Find the provider identifiers needed to send back into the original thread.
 * These were stashed in activity metadata by the webhook handlers.
 */
async function threadDetails(leadId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("channel, direction, metadata, occurred_at")
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false })
    .limit(30);

  const rows = data ?? [];

  // Prefer the most recent inbound message — that's the thread to reply into.
  const source =
    rows.find((r) => r.direction === "inbound" && r.metadata) ??
    rows.find((r) => r.metadata);

  const m = (source?.metadata ?? {}) as Record<string, unknown>;
  return {
    channel: source?.channel === "linkedin" ? "linkedin" : "email",
    campaign_id: m.campaign_id ?? null,
    stats_id: m.stats_id ?? null,
    message_id: m.message_id ?? null,
    conversation_id: m.conversation_id ?? null,
    linkedin_account_id: m.linkedin_account_id ?? null,
  };
}

export async function agentDraftReply(leadId: string) {
  await requireUser();
  if (!isConfigured()) return { error: "OPENAI_API_KEY is not configured." };

  try {
    const ctx = await buildLeadContext(leadId);
    if (!ctx.lastInbound) {
      return {
        error:
          "This lead hasn't sent us anything yet, so there's nothing to reply to. Use 'Draft outreach' instead.",
      };
    }

    const draft = await draftReply(ctx);
    const thread = await threadDetails(leadId);

    await proposeAction({
      leadId,
      type: "draft_reply",
      title: `Reply to ${ctx.contactName}`,
      reasoning: draft.reasoning,
      payload: {
        body: draft.body,
        intent: draft.intent,
        ...thread,
        email: ctx.email,
      },
    });

    revalidatePath("/approvals");
    revalidatePath(`/leads/${leadId}`);
    return { ok: true, preview: draft.body };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Drafting failed" };
  }
}

export async function agentDraftOutreach(leadId: string) {
  await requireUser();
  if (!isConfigured()) return { error: "OPENAI_API_KEY is not configured." };

  try {
    const ctx = await buildLeadContext(leadId);

    // LinkedIn-only leads get a LinkedIn note; everyone else gets email.
    if (!ctx.email && ctx.linkedinUrl) {
      const draft = await draftLinkedInMessage(ctx, "message");
      const thread = await threadDetails(leadId);
      await proposeAction({
        leadId,
        type: "send_li_message",
        title: `LinkedIn message to ${ctx.contactName}`,
        reasoning: draft.reasoning,
        // Spread thread first so the explicit channel below wins.
        payload: { ...thread, body: draft.body, channel: "linkedin" },
      });
    } else {
      const draft = await draftEmail(ctx);
      await proposeAction({
        leadId,
        type: "draft_email",
        title: `Email to ${ctx.contactName}`,
        reasoning: draft.reasoning,
        payload: {
          subject: draft.subject,
          body: draft.body,
          channel: "email",
          email: ctx.email,
        },
      });
    }

    revalidatePath("/approvals");
    revalidatePath(`/leads/${leadId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Drafting failed" };
  }
}

export async function agentSummarize(leadId: string) {
  await requireUser();
  if (!isConfigured()) return { error: "OPENAI_API_KEY is not configured." };
  try {
    const ctx = await buildLeadContext(leadId);
    return { ok: true, summary: await summarizeLead(ctx) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Summary failed" };
  }
}
