import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { ingest, verifyWebhookSecret } from "@/lib/ingest";
import { pick, splitName, cleanDomain } from "@/lib/normalize";

export const runtime = "nodejs";

// HeyReach's configured event enum is UPPER_SNAKE, but delivered payloads have
// been observed in lower snake too, so we normalize before matching.
const EVENT_MAP: Record<
  string,
  { type: string; title: string; status?: string; direction: string }
> = {
  CONNECTION_REQUEST_SENT: { type: "li_connection_sent", title: "LinkedIn connection request sent", status: "sequenced", direction: "outbound" },
  CONNECTION_REQUEST_ACCEPTED: { type: "li_connected", title: "Accepted LinkedIn connection", status: "engaged", direction: "inbound" },
  MESSAGE_SENT: { type: "li_message_sent", title: "LinkedIn message sent", status: "sequenced", direction: "outbound" },
  INMAIL_SENT: { type: "li_message_sent", title: "LinkedIn InMail sent", status: "sequenced", direction: "outbound" },
  MESSAGE_REPLY_RECEIVED: { type: "li_replied", title: "Replied on LinkedIn", status: "engaged", direction: "inbound" },
  EVERY_MESSAGE_REPLY_RECEIVED: { type: "li_replied", title: "Replied on LinkedIn", status: "engaged", direction: "inbound" },
  INMAIL_REPLY_RECEIVED: { type: "li_replied", title: "Replied to InMail", status: "engaged", direction: "inbound" },
  FOLLOW_SENT: { type: "li_connection_sent", title: "Followed on LinkedIn", direction: "outbound" },
  VIEWED_PROFILE: { type: "li_connection_sent", title: "Viewed LinkedIn profile", direction: "outbound" },
};

type Obj = Record<string, unknown>;

function obj(parent: Obj, key: string): Obj | undefined {
  const v = parent[key];
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : undefined;
}

async function handleEvent(body: Obj) {
  // HeyReach lets workspaces customize payload templates, so read both the
  // snake_case shape seen in delivered webhooks and the camelCase API shape.
  const lead = obj(body, "lead") ?? obj(body, "prospect") ?? body;
  const campaign = obj(body, "campaign");

  const rawEvent = (
    pick(body, "event_type", "eventType", "type") ?? "UNKNOWN"
  ).toUpperCase();
  const mapped = EVENT_MAP[rawEvent];

  const name = splitName(
    pick(lead, "full_name", "fullName", "name"),
    pick(lead, "first_name", "firstName"),
    pick(lead, "last_name", "lastName")
  );
  const linkedin = pick(
    lead,
    "profile_url",
    "profileUrl",
    "linkedin_url",
    "linkedinUrl"
  );
  const companyName = pick(lead, "company_name", "companyName", "company");
  const domain = cleanDomain(
    pick(lead, "company_domain", "companyDomain", "company_website", "companyWebsite", "website")
  );

  const messageBody =
    pick(body, "message_body", "messageText", "message", "text", "reply") ??
    pick(body, "connection_message", "connectionMessage");

  const occurredAt = pick(
    body,
    "timestamp", "eventTime", "event_time", "created_at", "creation_time", "time"
  );

  const conversationId = pick(body, "conversation_id", "conversationId");
  const campaignId = campaign ? pick(campaign, "id") : pick(body, "campaign_id", "campaignId");

  // HeyReach sends no reliable unique event id, so derive a stable de-dup key
  // from the event's identifying content.
  const explicitId = pick(body, "id", "event_id", "eventId", "correlation_id");
  const externalId = explicitId
    ? `${rawEvent}:${explicitId}`
    : `${rawEvent}:${createHash("sha256")
        .update(
          [rawEvent, linkedin ?? "", campaignId ?? "", conversationId ?? "", messageBody ?? "", occurredAt ?? ""].join("|")
        )
        .digest("hex")
        .slice(0, 32)}`;

  const activity = mapped
    ? {
        type: mapped.type,
        channel: "linkedin",
        direction: mapped.direction,
        title: mapped.title,
        body: messageBody,
        occurred_at: occurredAt,
        metadata: {
          campaign_id: campaignId,
          campaign_name: campaign ? pick(campaign, "name") : pick(body, "campaign_name", "campaignName"),
          // Needed so the agent can reply into this LinkedIn thread later.
          conversation_id: conversationId,
          linkedin_account_id: pick(body, "linkedInAccountId", "linkedin_account_id"),
          tags: body.tags,
        },
      }
    : {};

  return ingest({
    provider: "heyreach",
    source: "heyreach",
    channel: "outbound",
    eventType: rawEvent,
    externalId,
    company: { name: companyName, domain },
    contact: {
      ...name,
      email: pick(lead, "email_address", "emailAddress", "email"),
      title: pick(lead, "position", "headline", "title"),
      linkedin_url: linkedin,
      location: pick(lead, "location"),
    },
    lead: mapped?.status ? { status: mapped.status } : {},
    activity,
    raw: body,
  });
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request, process.env.HEYREACH_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Some HeyReach configurations post a batch of events rather than one.
  const events: Obj[] = Array.isArray(payload)
    ? (payload as Obj[])
    : [payload as Obj];

  try {
    const results = [];
    for (const evt of events) {
      results.push(await handleEvent(evt));
    }
    return NextResponse.json(
      events.length === 1 ? results[0] : { status: "ok", processed: results.length }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ingest failed" },
      { status: 500 }
    );
  }
}
