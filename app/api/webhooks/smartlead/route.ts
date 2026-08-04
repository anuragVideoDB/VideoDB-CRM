import { NextResponse } from "next/server";
import { ingest, verifyWebhookSecret } from "@/lib/ingest";
import { pick, domainFromEmail, splitName } from "@/lib/normalize";

export const runtime = "nodejs";

// Smartlead's docs and its live payloads disagree on event spelling: the API
// enum uses EMAIL_OPEN / EMAIL_LINK_CLICK / EMAIL_REPLY / LEAD_UNSUBSCRIBED,
// while the help centre (and some accounts in the wild) use the -ED forms and
// EMAIL_BOUNCE. Accept every spelling and never silently drop an event.
const EVENT_MAP: Record<
  string,
  { type: string; title: string; status?: string; inbound?: boolean }
> = {
  EMAIL_SENT: { type: "email_sent", title: "Email sent (Smartlead)", status: "sequenced" },

  EMAIL_OPEN: { type: "email_opened", title: "Opened an email", status: "engaged" },
  EMAIL_OPENED: { type: "email_opened", title: "Opened an email", status: "engaged" },

  EMAIL_LINK_CLICK: { type: "email_clicked", title: "Clicked a link in an email", status: "engaged" },
  EMAIL_CLICKED: { type: "email_clicked", title: "Clicked a link in an email", status: "engaged" },

  EMAIL_REPLY: { type: "email_replied", title: "Replied to an email", status: "engaged", inbound: true },
  EMAIL_REPLIED: { type: "email_replied", title: "Replied to an email", status: "engaged", inbound: true },

  EMAIL_BOUNCE: { type: "email_bounced", title: "Email bounced" },
  EMAIL_BOUNCED: { type: "email_bounced", title: "Email bounced" },

  LEAD_UNSUBSCRIBED: { type: "email_unsubscribed", title: "Unsubscribed" },
  EMAIL_UNSUBSCRIBED: { type: "email_unsubscribed", title: "Unsubscribed" },
};

// Read a string out of a nested object, e.g. reply_message.text
function nested(
  body: Record<string, unknown>,
  parent: string,
  key: string
): string | undefined {
  const obj = body[parent];
  if (!obj || typeof obj !== "object") return undefined;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request, process.env.SMARTLEAD_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const rawEvent = (
    pick(body, "event_type", "webhook_event_type", "type") ?? "UNKNOWN"
  ).toUpperCase();
  const mapped = EVENT_MAP[rawEvent];

  // `sl_lead_email` is the canonical prospect address. `to_email` is wrong when
  // the prospect replies from a different mailbox, so it's only a fallback.
  const email = pick(
    body,
    "sl_lead_email",
    "lead_email",
    "to_email",
    "email",
    "to"
  );
  const name = splitName(
    pick(body, "to_name", "lead_name", "name"),
    pick(body, "first_name"),
    pick(body, "last_name")
  );

  // No documented top-level event id, so build a composite de-dup key.
  const statsId = pick(body, "stats_id", "id");
  const msgId =
    pick(body, "message_id") ?? nested(body, "reply_message", "message_id");
  const dedupParts = [statsId, msgId, pick(body, "event_timestamp", "time_replied", "time_sent")]
    .filter(Boolean)
    .join(":");
  const externalId = dedupParts ? `${rawEvent}:${dedupParts}` : null;

  const occurredAt = pick(
    body,
    "event_timestamp",
    "time_replied",
    "time_sent",
    "time_opened",
    "time",
    "timestamp",
    "created_at"
  );

  // Prefer plain text over the HTML bodies (which include the quoted thread).
  const messageBody =
    nested(body, "reply_message", "text") ??
    pick(body, "preview_text") ??
    nested(body, "sent_message", "text") ??
    pick(body, "reply_body", "sent_message_body", "subject");

  // An unmapped event is still recorded raw in integration_events for
  // inspection, but we don't invent an activity type for it.
  const activity = mapped
    ? {
        type: mapped.type,
        channel: "email",
        direction: mapped.inbound ? "inbound" : "outbound",
        title: mapped.title,
        body: messageBody,
        occurred_at: occurredAt,
        metadata: {
          campaign_id: pick(body, "campaign_id"),
          campaign_name: pick(body, "campaign_name"),
          subject: pick(body, "subject"),
          sequence_number: pick(body, "sequence_number"),
          // Needed to reply into this thread via the Smartlead API later.
          stats_id: statsId,
          message_id: msgId,
          sl_email_lead_id: pick(body, "sl_email_lead_id"),
        },
      }
    : {};

  try {
    const result = await ingest({
      provider: "smartlead",
      source: "smartlead",
      channel: "outbound",
      eventType: rawEvent,
      externalId,
      company: { domain: domainFromEmail(email) },
      contact: { ...name, email },
      lead: mapped?.status ? { status: mapped.status } : {},
      activity,
      raw: body,
    });

    return NextResponse.json({ ...result, event: rawEvent, mapped: Boolean(mapped) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ingest failed" },
      { status: 500 }
    );
  }
}
