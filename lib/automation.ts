// ─────────────────────────────────────────────────────────────
// The autonomous worker.
//
// Runs on a schedule with no user session, so all database access goes
// through the secret-gated automation_* SECURITY DEFINER functions rather
// than a service-role key.
//
// Today it does the job the outreach tools can't: react intelligently to
// replies. Smartlead and HeyReach already run their own multi-step cadences,
// so re-implementing "day 1 / day 3" here would duplicate them. What they
// cannot do is read a reply, understand it, and write a grounded response.
// ─────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { completeJSON } from "@/lib/llm";
import * as smartlead from "@/lib/smartlead";
import * as heyreach from "@/lib/heyreach";

type Json = Record<string, unknown>;

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

function secret(): string {
  const s = process.env.INGEST_SECRET;
  if (!s) throw new Error("INGEST_SECRET is not configured");
  return s;
}

export type AutomationSettings = {
  auto_draft_replies: boolean;
  auto_send_replies: boolean;
  pause_on_reply: boolean;
  send_window_start: number;
  send_window_end: number;
  timezone: string;
  max_actions_per_run: number;
  auto_enroll_leads?: boolean;
};

type ReplyWork = {
  activity_id: string;
  lead_id: string;
  channel: string | null;
  reply_body: string;
  thread: Json | null;
  status: string;
  source: string;
  inbound_message: string | null;
  full_name: string | null;
  first_name: string | null;
  email: string | null;
  title: string | null;
  linkedin_url: string | null;
  company_name: string | null;
  company_domain: string | null;
  industry: string | null;
  employee_count: number | null;
  timeline: { at: string; what: string; dir: string; text: string }[];
};

type KnowledgeRow = {
  category: string;
  industry: string | null;
  title: string;
  content: string;
};

/** Is "now" inside the configured sending window for the configured timezone? */
export function withinSendWindow(s: AutomationSettings, now = new Date()): boolean {
  if (s.send_window_start === 0 && s.send_window_end === 0) return true;
  let hour: number;
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "numeric",
        hour12: false,
        timeZone: s.timezone || "UTC",
      }).format(now)
    );
  } catch {
    hour = now.getUTCHours();
  }
  const { send_window_start: start, send_window_end: end } = s;
  return start <= end
    ? hour >= start && hour < end
    : hour >= start || hour < end; // window wrapping midnight
}

function knowledgeFor(rows: KnowledgeRow[], industry: string | null): string {
  const relevant = rows.filter(
    (r) => !r.industry || !industry || r.industry.toLowerCase() === industry.toLowerCase()
  );
  if (!relevant.length) return "(No knowledge base entries yet.)";
  return relevant
    .map((r) => `## ${r.category}${r.industry ? ` (${r.industry})` : ""}: ${r.title}\n${r.content}`)
    .join("\n\n");
}

function contextBlock(r: ReplyWork): string {
  const lines = [
    `Name: ${r.full_name || r.first_name || "there"}`,
    r.title && `Title: ${r.title}`,
    r.company_name && `Company: ${r.company_name}`,
    r.industry && `Industry: ${r.industry}`,
    r.employee_count && `Company size: ~${r.employee_count} employees`,
    `Pipeline stage: ${r.status}`,
    r.inbound_message && `They told us on our website form: "${r.inbound_message}"`,
  ].filter(Boolean);

  const timeline = (r.timeline ?? [])
    .map((t) => `[${t.at}] ${t.dir === "inbound" ? "THEM" : "US"}: ${t.what}${t.text ? ` — "${t.text}"` : ""}`)
    .join("\n");

  return `${lines.join("\n")}\n\nInteraction history:\n${timeline || "(none)"}`;
}

const REPLY_RULES = `
You write replies to prospects on behalf of the company in the KNOWLEDGE BASE.

Hard rules:
- Respond to what they actually said. Answer their question, address their objection,
  or move to concrete next steps.
- Plain, direct language. No hype, no "I hope this finds you well", no exclamation marks.
- Never invent facts, metrics, customers, or capabilities that are not in the
  KNOWLEDGE BASE. If you don't know, say you'll find out.
- Never use placeholders like [Name] — you have the real values.
- One clear next step.
- If they are asking to be left alone, write a short polite close instead of a pitch.
`.trim();

/**
 * Draft a reply for one inbound message. Returns null if the model declines to
 * produce usable output.
 */
async function draftReplyFor(
  r: ReplyWork,
  knowledge: KnowledgeRow[]
): Promise<{ body: string; intent: string; reasoning: string; confidence: number } | null> {
  const isLinkedIn = r.channel === "linkedin";

  const out = await completeJSON<{
    body?: string;
    intent?: string;
    reasoning?: string;
    confidence?: number;
    needs_human?: boolean;
  }>({
    system: `${REPLY_RULES}

${isLinkedIn ? "This is a LinkedIn message: under 60 words, conversational." : "This is an email reply: under 120 words."}

Return a JSON object with keys:
  "body"        - the reply text, plain text with line breaks, no signature block
  "intent"      - one of: answer_question, handle_objection, book_meeting,
                  share_resource, qualify, polite_close
  "reasoning"   - one sentence on your read of their message, for the human reviewer
  "confidence"  - 0.0 to 1.0, how confident you are this reply is correct to send
  "needs_human" - true if this genuinely needs a person (pricing negotiation, complaint,
                  legal, anything you cannot answer from the KNOWLEDGE BASE)`,
    messages: [
      {
        role: "user",
        content: `KNOWLEDGE BASE
${knowledgeFor(knowledge, r.industry)}

PROSPECT
${contextBlock(r)}

THEIR MESSAGE (${r.channel ?? "email"})
"""
${r.reply_body}
"""

Draft our reply.`,
      },
    ],
    temperature: 0.6,
    maxTokens: 900,
  });

  if (!out?.body?.trim()) return null;

  return {
    body: out.body.trim(),
    intent: out.intent ?? "answer_question",
    reasoning: out.needs_human
      ? `⚠️ Flagged for a human: ${out.reasoning ?? "needs judgement"}`
      : out.reasoning ?? "",
    // A human-flagged reply is never auto-sent regardless of confidence.
    confidence: out.needs_human ? 0 : Math.max(0, Math.min(1, out.confidence ?? 0.5)),
  };
}

export type TickResult = {
  ran: boolean;
  reason?: string;
  repliesDrafted: number;
  actionsSent: number;
  leadsEnrolled: number;
  errors: { lead?: string; error: string }[];
};

type EnrollmentWork = {
  lead_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  title: string | null;
  linkedin_url: string | null;
  location: string | null;
  company_name: string | null;
  company_domain: string | null;
  industry: string | null;
  rule_id: string;
  rule_name: string;
  provider: "smartlead" | "heyreach";
  campaign_external_id: string;
  campaign_name: string | null;
  linkedin_account_id: number | null;
  auto_enroll: boolean;
};

/**
 * Push matching new leads into the campaign their routing rule points at.
 * A rule with auto_enroll off produces an approval item instead of sending.
 */
async function runEnrollments(
  supabase: ReturnType<typeof db>,
  settings: AutomationSettings & { auto_enroll_leads?: boolean },
  errors: { lead?: string; error: string }[]
): Promise<number> {
  if (!settings.auto_enroll_leads) return 0;

  const { data, error } = await supabase.rpc("automation_get_enrollments", {
    p_secret: secret(),
    p_limit: 20,
  });
  if (error) {
    errors.push({ error: `enrollment lookup: ${error.message}` });
    return 0;
  }

  const items = (data ?? []) as EnrollmentWork[];
  let enrolled = 0;

  for (const it of items) {
    const who = it.full_name || it.email || it.lead_id;
    try {
      // A rule that isn't set to auto-enrol only proposes the action.
      if (!it.auto_enroll) {
        await supabase.rpc("automation_record_action", {
          p_secret: secret(),
          p_lead_id: it.lead_id,
          p_type: "add_to_sequence",
          p_title: `Add ${who} to ${it.campaign_name ?? it.campaign_external_id}`,
          p_reasoning: `Matched routing rule "${it.rule_name}".`,
          p_payload: {
            channel: it.provider === "heyreach" ? "linkedin" : "email",
            provider: it.provider,
            campaign_id: it.campaign_external_id,
            campaign_name: it.campaign_name,
            linkedin_account_id: it.linkedin_account_id,
            email: it.email,
            first_name: it.first_name,
            last_name: it.last_name,
            company_name: it.company_name,
            rule_id: it.rule_id,
          } as never,
          p_trigger_activity_id: null,
          p_status: "proposed",
        });
        continue;
      }

      let externalLeadId: string | null = null;

      if (it.provider === "smartlead") {
        if (!it.email) throw new Error("no email address");
        const res = await smartlead.addLeadsToCampaign(
          Number(it.campaign_external_id),
          [
            {
              email: it.email,
              first_name: it.first_name ?? undefined,
              last_name: it.last_name ?? undefined,
              company_name: it.company_name ?? undefined,
              website: it.company_domain ?? undefined,
              location: it.location ?? undefined,
              linkedin_profile: it.linkedin_url ?? undefined,
            },
          ]
        );
        const uploaded = res.reduce((n, r) => n + (r.upload_count ?? 0), 0);
        if (uploaded === 0) {
          throw new Error(
            "Smartlead accepted the request but uploaded 0 leads (duplicate, unsubscribed, or invalid address)"
          );
        }
      } else {
        if (!it.linkedin_url) throw new Error("no LinkedIn profile URL");
        if (!it.linkedin_account_id) {
          throw new Error("routing rule has no HeyReach sender account set");
        }
        const res = await heyreach.addLeadsToCampaign(
          Number(it.campaign_external_id),
          Number(it.linkedin_account_id),
          [
            {
              profileUrl: it.linkedin_url,
              firstName: it.first_name ?? undefined,
              lastName: it.last_name ?? undefined,
              companyName: it.company_name ?? undefined,
              position: it.title ?? undefined,
              location: it.location ?? undefined,
              emailAddress: it.email ?? undefined,
            },
          ]
        );
        if ((res.addedLeadsCount ?? 0) + (res.updatedLeadsCount ?? 0) === 0) {
          throw new Error("HeyReach added 0 leads (already present or rejected)");
        }
      }

      const { error: recErr } = await supabase.rpc(
        "automation_record_enrollment",
        {
          p_secret: secret(),
          p_lead_id: it.lead_id,
          p_provider: it.provider,
          p_external_id: it.campaign_external_id,
          p_name: it.campaign_name,
          p_rule_id: it.rule_id,
          p_external_lead_id: externalLeadId,
        }
      );
      if (recErr) throw new Error(recErr.message);

      enrolled++;
    } catch (e) {
      errors.push({
        lead: who,
        error: `enrol into ${it.campaign_name ?? it.campaign_external_id}: ${
          e instanceof Error ? e.message : "failed"
        }`,
      });
    }
  }

  return enrolled;
}

/** One pass of the worker. Safe to call repeatedly; work is de-duplicated in SQL. */
export async function tick(opts: { force?: boolean } = {}): Promise<TickResult> {
  const supabase = db();
  const errors: { lead?: string; error: string }[] = [];
  let repliesDrafted = 0;
  let actionsSent = 0;

  const { data, error } = await supabase.rpc("automation_get_work", {
    p_secret: secret(),
    p_limit: 20,
  });
  if (error) throw new Error(error.message);

  const work = data as {
    settings: AutomationSettings;
    knowledge: KnowledgeRow[];
    replies: ReplyWork[];
  };

  const settings = work.settings;
  if (!settings?.auto_draft_replies) {
    if (!settings?.auto_enroll_leads) {
      return { ran: false, reason: "Automation is turned off.", repliesDrafted: 0, actionsSent: 0, leadsEnrolled: 0, errors };
    }
    // Replies are off but enrolment is on — still do that half.
    const onlyEnrolled = await runEnrollments(supabase, settings, errors);
    await supabase.rpc("automation_log_run", {
      p_secret: secret(),
      p_replies_drafted: 0,
      p_actions_sent: onlyEnrolled,
      p_errors: errors as never,
      p_notes: "enrolment only",
    });
    return { ran: true, repliesDrafted: 0, actionsSent: 0, leadsEnrolled: onlyEnrolled, errors };
  }
  if (!opts.force && !withinSendWindow(settings)) {
    return { ran: false, reason: "Outside the configured send window.", repliesDrafted: 0, actionsSent: 0, leadsEnrolled: 0, errors };
  }

  const budget = Math.max(1, settings.max_actions_per_run ?? 25);
  const replies = (work.replies ?? []).slice(0, budget);

  for (const r of replies) {
    try {
      // A reply means the cadence should stop chasing them.
      if (settings.pause_on_reply) {
        await supabase.rpc("automation_pause_on_reply", {
          p_secret: secret(),
          p_lead_id: r.lead_id,
        });
      }

      const draft = await draftReplyFor(r, work.knowledge ?? []);
      if (!draft) {
        errors.push({ lead: r.full_name ?? r.lead_id, error: "Model returned no usable draft" });
        continue;
      }

      const thread = (r.thread ?? {}) as Json;
      const channel = r.channel === "linkedin" ? "linkedin" : "email";

      const payload: Json = {
        body: draft.body,
        intent: draft.intent,
        confidence: draft.confidence,
        channel,
        email: r.email,
        campaign_id: thread.campaign_id ?? null,
        stats_id: thread.stats_id ?? null,
        message_id: thread.message_id ?? null,
        conversation_id: thread.conversation_id ?? null,
        linkedin_account_id: thread.linkedin_account_id ?? null,
      };

      const { data: actionId, error: recErr } = await supabase.rpc(
        "automation_record_action",
        {
          p_secret: secret(),
          p_lead_id: r.lead_id,
          p_type: "draft_reply",
          p_title: `Reply to ${r.full_name || r.email || "lead"}`,
          p_reasoning: draft.reasoning,
          p_payload: payload as never,
          p_trigger_activity_id: r.activity_id,
          p_status: "proposed",
        }
      );

      if (recErr) {
        errors.push({ lead: r.full_name ?? r.lead_id, error: recErr.message });
        continue;
      }
      if (!actionId) continue; // another run already drafted this one

      repliesDrafted++;

      // Fully autonomous sending, only when explicitly enabled and the model
      // is confident and hasn't flagged it for a human.
      if (settings.auto_send_replies && draft.confidence >= 0.75) {
        try {
          await executeReply(channel, payload, draft.body);
          await supabase.rpc("automation_complete_action", {
            p_secret: secret(),
            p_action_id: actionId,
            p_status: "executed",
            p_result: { auto_sent: true } as never,
            p_activity: {
              type: channel === "linkedin" ? "li_message_sent" : "email_sent",
              channel,
              title: "Replied automatically by agent",
              body: draft.body,
            } as never,
          });
          actionsSent++;
        } catch (e) {
          const message = e instanceof Error ? e.message : "send failed";
          await supabase.rpc("automation_complete_action", {
            p_secret: secret(),
            p_action_id: actionId,
            p_status: "failed",
            p_result: { error: message } as never,
          });
          errors.push({ lead: r.full_name ?? r.lead_id, error: message });
        }
      }
    } catch (e) {
      errors.push({
        lead: r.full_name ?? r.lead_id,
        error: e instanceof Error ? e.message : "unknown error",
      });
    }
  }

  const leadsEnrolled = await runEnrollments(supabase, settings, errors);

  await supabase.rpc("automation_log_run", {
    p_secret: secret(),
    p_replies_drafted: repliesDrafted,
    p_actions_sent: actionsSent,
    p_errors: errors as never,
    p_notes: opts.force ? "manual run" : "cron",
  });

  return { ran: true, repliesDrafted, actionsSent, leadsEnrolled, errors };
}

async function executeReply(channel: string, payload: Json, body: string) {
  if (channel === "linkedin") {
    const conversationId = payload.conversation_id as string | null;
    const accountId = Number(payload.linkedin_account_id);
    if (!conversationId || !accountId) {
      throw new Error("Missing HeyReach conversation details for auto-send.");
    }
    return heyreach.sendMessage({
      conversationId,
      linkedInAccountId: accountId,
      message: body,
    });
  }

  const campaignId = Number(payload.campaign_id);
  const statsId = payload.stats_id as string | null;
  const replyMessageId = payload.message_id as string | null;
  if (!campaignId || !statsId || !replyMessageId) {
    throw new Error("Missing Smartlead thread details for auto-send.");
  }
  return smartlead.replyToThread(campaignId, { statsId, replyMessageId, body });
}
