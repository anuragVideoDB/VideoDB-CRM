// ─────────────────────────────────────────────────────────────
// The agent: reads a lead's full context + your knowledge base, then drafts
// outreach or replies. It never sends anything itself — every output is
// parked in `agent_actions` as a proposal for a human to approve.
// ─────────────────────────────────────────────────────────────

import { createClient } from "@/lib/supabase/server";
import { complete, completeJSON } from "@/lib/llm";
import { ACTIVITY_LABELS } from "@/lib/constants";

export type LeadContext = {
  leadId: string;
  contactName: string;
  email: string | null;
  linkedinUrl: string | null;
  title: string | null;
  companyName: string | null;
  companyDomain: string | null;
  industry: string | null;
  employeeCount: number | null;
  status: string;
  channel: string;
  source: string;
  inboundMessage: string | null;
  timeline: string[];
  lastInbound: { body: string; channel: string; at: string } | null;
};

/** Gather everything the agent should know about one lead. */
export async function buildLeadContext(leadId: string): Promise<LeadContext> {
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*, contact:contacts(*), company:companies(*)")
    .eq("id", leadId)
    .single();

  if (error || !lead) throw new Error("Lead not found");

  const contact = lead.contact as {
    full_name: string | null; first_name: string | null; email: string | null;
    title: string | null; linkedin_url: string | null;
  } | null;
  const company = lead.company as {
    name: string | null; domain: string | null; industry: string | null;
    employee_count: number | null;
  } | null;

  const { data: activities } = await supabase
    .from("activities")
    .select("type, title, body, direction, channel, occurred_at")
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: true })
    .limit(50);

  const timeline = (activities ?? []).map((a) => {
    const when = new Date(a.occurred_at).toISOString().slice(0, 10);
    const label = a.title || ACTIVITY_LABELS[a.type] || a.type;
    const snippet = a.body ? ` — "${a.body.slice(0, 300)}"` : "";
    return `[${when}] ${label}${snippet}`;
  });

  // The most recent thing they said to us — what a reply must respond to.
  const lastInboundRow = [...(activities ?? [])]
    .reverse()
    .find((a) => a.direction === "inbound" && a.body);

  return {
    leadId,
    contactName: contact?.full_name || contact?.first_name || "there",
    email: contact?.email ?? null,
    linkedinUrl: contact?.linkedin_url ?? null,
    title: contact?.title ?? null,
    companyName: company?.name ?? null,
    companyDomain: company?.domain ?? null,
    industry: company?.industry ?? null,
    employeeCount: company?.employee_count ?? null,
    status: lead.status,
    channel: lead.channel,
    source: lead.source,
    inboundMessage: lead.message ?? null,
    timeline,
    lastInbound: lastInboundRow
      ? {
          body: lastInboundRow.body!,
          channel: lastInboundRow.channel ?? "email",
          at: lastInboundRow.occurred_at,
        }
      : null,
  };
}

/** Pull knowledge base entries, preferring ones matching the lead's industry. */
export async function getKnowledge(industry?: string | null): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("knowledge_base")
    .select("category, industry, title, content")
    .eq("is_active", true)
    .limit(100);

  const rows = (data ?? []).filter(
    (r) => !r.industry || !industry || r.industry.toLowerCase() === industry.toLowerCase()
  );

  if (!rows.length) return "(No knowledge base entries yet.)";

  return rows
    .map((r) => `## ${r.category}${r.industry ? ` (${r.industry})` : ""}: ${r.title}\n${r.content}`)
    .join("\n\n");
}

function contextBlock(ctx: LeadContext): string {
  const lines = [
    `Name: ${ctx.contactName}`,
    ctx.title && `Title: ${ctx.title}`,
    ctx.companyName && `Company: ${ctx.companyName}`,
    ctx.industry && `Industry: ${ctx.industry}`,
    ctx.employeeCount && `Company size: ~${ctx.employeeCount} employees`,
    ctx.companyDomain && `Domain: ${ctx.companyDomain}`,
    `Pipeline stage: ${ctx.status}`,
    `Motion: ${ctx.channel} (source: ${ctx.source})`,
    ctx.inboundMessage && `What they told us on our website form: "${ctx.inboundMessage}"`,
  ].filter(Boolean);

  const history = ctx.timeline.length
    ? `\n\nInteraction history (oldest first):\n${ctx.timeline.join("\n")}`
    : "\n\nNo interaction history yet — this is a first touch.";

  return lines.join("\n") + history;
}

const BASE_RULES = `
You write outbound sales messages for the company described in the KNOWLEDGE BASE.

Hard rules:
- Lead with the prospect's situation or problem, never with a feature list.
- Be specific to this person, their role, company and industry. Generic lines are failures.
- Keep it short: 60-120 words for email, under 60 words for LinkedIn.
- Plain, direct language. No hype, no "I hope this finds you well", no "circling back",
  no "revolutionary", no exclamation marks.
- One clear, low-friction ask at the end.
- Never invent facts about the prospect, their company, or our product. If you do not
  know something, leave it out. Do not fabricate metrics, customer names, or case studies
  that are not in the KNOWLEDGE BASE.
- Never use placeholders like [Name] or [Company] — you have the real values; use them.
`.trim();

export type DraftedEmail = {
  subject: string;
  body: string;
  reasoning: string;
};

/** Draft a first-touch or follow-up email. */
export async function draftEmail(
  ctx: LeadContext,
  opts: { purpose?: string; stepNumber?: number } = {}
): Promise<DraftedEmail> {
  const knowledge = await getKnowledge(ctx.industry);

  const purpose =
    opts.purpose ??
    (ctx.timeline.length === 0
      ? "First-touch cold email introducing us and earning a reply."
      : `Follow-up email (touch #${opts.stepNumber ?? 2}). Add a new angle or piece of value — do not simply "bump" the thread.`);

  return completeJSON<DraftedEmail>({
    system: `${BASE_RULES}

Return a JSON object with exactly these keys:
  "subject"   - a short, lowercase-feeling, non-salesy subject line (max 8 words)
  "body"      - the email body as plain text, with line breaks. No signature block.
  "reasoning" - one sentence explaining the angle you chose, for the human reviewer.`,
    messages: [
      {
        role: "user",
        content: `KNOWLEDGE BASE
${knowledge}

PROSPECT
${contextBlock(ctx)}

TASK
${purpose}`,
      },
    ],
    temperature: 0.7,
    maxTokens: 900,
  });
}

export type DraftedReply = {
  body: string;
  intent: string;
  reasoning: string;
};

/**
 * Draft a contextual reply to whatever the prospect last said. This is the
 * highest-value agent action — it needs the full thread, not just the last line.
 */
export async function draftReply(ctx: LeadContext): Promise<DraftedReply> {
  if (!ctx.lastInbound) {
    throw new Error("This lead has no inbound message to reply to yet.");
  }

  const knowledge = await getKnowledge(ctx.industry);
  const isLinkedIn = ctx.lastInbound.channel === "linkedin";

  return completeJSON<DraftedReply>({
    system: `${BASE_RULES}

You are replying to a message the prospect sent us. Read their message carefully and
respond to what they actually said — answer their question, handle their objection, or
move to next steps if they are interested.

${isLinkedIn ? "This is a LinkedIn message: keep it under 60 words and conversational." : "This is an email reply: keep it under 120 words."}

Return a JSON object with exactly these keys:
  "body"      - the reply text, plain text with line breaks. No signature block.
  "intent"    - one of: "answer_question", "handle_objection", "book_meeting",
                "share_resource", "qualify", "polite_close"
  "reasoning" - one sentence explaining your read of their message, for the human reviewer.`,
    messages: [
      {
        role: "user",
        content: `KNOWLEDGE BASE
${knowledge}

PROSPECT
${contextBlock(ctx)}

THEIR LATEST MESSAGE (${ctx.lastInbound.channel}, ${ctx.lastInbound.at})
"""
${ctx.lastInbound.body}
"""

TASK
Draft our reply.`,
      },
    ],
    temperature: 0.6,
    maxTokens: 900,
  });
}

/** Draft a short LinkedIn connection note or first message. */
export async function draftLinkedInMessage(
  ctx: LeadContext,
  kind: "connection_note" | "message" = "message"
): Promise<{ body: string; reasoning: string }> {
  const knowledge = await getKnowledge(ctx.industry);

  return completeJSON({
    system: `${BASE_RULES}

${
  kind === "connection_note"
    ? "Write a LinkedIn connection request note. HARD LIMIT: 280 characters. No pitch — earn the accept."
    : "Write a first LinkedIn message after they accepted. Under 60 words. Conversational, not a pitch deck."
}

Return a JSON object with keys "body" and "reasoning".`,
    messages: [
      {
        role: "user",
        content: `KNOWLEDGE BASE
${knowledge}

PROSPECT
${contextBlock(ctx)}`,
      },
    ],
    temperature: 0.7,
    maxTokens: 500,
  });
}

/** Ask the agent to summarise where a lead stands and what to do next. */
export async function summarizeLead(ctx: LeadContext): Promise<string> {
  const knowledge = await getKnowledge(ctx.industry);
  return complete({
    system:
      "You are a sales analyst. Be concise and concrete. Three short bullets: where this lead stands, what they seem to care about, and the single best next action. No preamble.",
    messages: [
      { role: "user", content: `KNOWLEDGE BASE\n${knowledge}\n\nPROSPECT\n${contextBlock(ctx)}` },
    ],
    temperature: 0.3,
    maxTokens: 400,
  });
}

/** Record a proposed action for human approval. */
export async function proposeAction(args: {
  leadId: string;
  type: string;
  title: string;
  reasoning?: string;
  payload: Record<string, unknown>;
  threadId?: string | null;
}): Promise<string> {
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("contact_id")
    .eq("id", args.leadId)
    .single();

  const { data, error } = await supabase
    .from("agent_actions")
    .insert({
      lead_id: args.leadId,
      contact_id: lead?.contact_id ?? null,
      thread_id: args.threadId ?? null,
      type: args.type,
      title: args.title,
      reasoning: args.reasoning ?? null,
      payload: args.payload as never,
      status: "proposed",
      requires_approval: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}
