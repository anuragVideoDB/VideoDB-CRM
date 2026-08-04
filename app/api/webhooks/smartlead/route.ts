import { NextResponse } from "next/server";
import { ingest, verifyWebhookSecret } from "@/lib/ingest";
import { pick, domainFromEmail, splitName } from "@/lib/normalize";

export const runtime = "nodejs";

// Map Smartlead event types → CRM activity types + lead stage hints.
const EVENT_MAP: Record<
  string,
  { type: string; title: string; status?: string }
> = {
  EMAIL_SENT: { type: "email_sent", title: "Email sent (Smartlead)", status: "sequenced" },
  EMAIL_OPEN: { type: "email_opened", title: "Opened an email", status: "engaged" },
  EMAIL_LINK_CLICK: { type: "email_clicked", title: "Clicked a link in an email", status: "engaged" },
  EMAIL_REPLY: { type: "email_replied", title: "Replied to an email", status: "engaged" },
  EMAIL_BOUNCE: { type: "email_bounced", title: "Email bounced" },
  LEAD_UNSUBSCRIBED: { type: "email_unsubscribed", title: "Unsubscribed" },
  EMAIL_UNSUBSCRIBE: { type: "email_unsubscribed", title: "Unsubscribed" },
};

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

  const rawEvent =
    pick(body, "event_type", "webhook_event_type", "type") ?? "UNKNOWN";
  const mapped = EVENT_MAP[rawEvent.toUpperCase()] ?? {
    type: "email_sent",
    title: `Smartlead: ${rawEvent}`,
  };

  const email = pick(body, "to_email", "lead_email", "email", "to");
  const name = splitName(
    pick(body, "to_name", "lead_name", "name"),
    pick(body, "first_name"),
    pick(body, "last_name")
  );

  // Build a de-dup id so retries don't create duplicate timeline rows.
  const externalId =
    pick(body, "id", "stats_id", "message_id", "sl_email_lead_id") &&
    `${rawEvent}:${pick(body, "id", "stats_id", "message_id", "sl_email_lead_id")}`;

  const occurredAt = pick(body, "event_timestamp", "time", "timestamp", "created_at");

  try {
    const result = await ingest({
      provider: "smartlead",
      source: "smartlead",
      channel: "outbound",
      eventType: rawEvent,
      externalId: externalId ?? null,
      company: {
        domain: domainFromEmail(email),
      },
      contact: {
        ...name,
        email,
      },
      lead: mapped.status ? { status: mapped.status } : {},
      activity: {
        type: mapped.type,
        channel: "email",
        direction: rawEvent.toUpperCase() === "EMAIL_REPLY" ? "inbound" : "outbound",
        title: mapped.title,
        body:
          pick(body, "reply_body", "preview_text", "email_body", "subject") ??
          undefined,
        occurred_at: occurredAt,
        metadata: {
          campaign_id: pick(body, "campaign_id"),
          campaign_name: pick(body, "campaign_name"),
        },
      },
      raw: body,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ingest failed" },
      { status: 500 }
    );
  }
}
