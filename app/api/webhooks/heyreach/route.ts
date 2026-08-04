import { NextResponse } from "next/server";
import { ingest, verifyWebhookSecret } from "@/lib/ingest";
import { pick, splitName, cleanDomain } from "@/lib/normalize";

export const runtime = "nodejs";

// Map HeyReach event types → CRM activity types + stage hints.
const EVENT_MAP: Record<
  string,
  { type: string; title: string; status?: string; direction: string }
> = {
  CONNECTION_REQUEST_SENT: { type: "li_connection_sent", title: "LinkedIn connection request sent", status: "sequenced", direction: "outbound" },
  CONNECTION_REQUEST_ACCEPTED: { type: "li_connected", title: "Accepted LinkedIn connection", status: "engaged", direction: "inbound" },
  CONNECTION_ACCEPTED: { type: "li_connected", title: "Accepted LinkedIn connection", status: "engaged", direction: "inbound" },
  MESSAGE_SENT: { type: "li_message_sent", title: "LinkedIn message sent", status: "sequenced", direction: "outbound" },
  INMAIL_SENT: { type: "li_message_sent", title: "LinkedIn InMail sent", status: "sequenced", direction: "outbound" },
  MESSAGE_REPLY: { type: "li_replied", title: "Replied on LinkedIn", status: "engaged", direction: "inbound" },
  MESSAGE_REPLY_RECEIVED: { type: "li_replied", title: "Replied on LinkedIn", status: "engaged", direction: "inbound" },
  INMAIL_REPLY: { type: "li_replied", title: "Replied to InMail", status: "engaged", direction: "inbound" },
};

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request, process.env.HEYREACH_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // HeyReach nests contact data under `lead` (or `prospect`); fall back to top level.
  const lead =
    (body.lead as Record<string, unknown>) ??
    (body.prospect as Record<string, unknown>) ??
    body;

  const rawEvent = pick(body, "eventType", "event_type", "type") ?? "UNKNOWN";
  const mapped = EVENT_MAP[rawEvent.toUpperCase()] ?? {
    type: "li_message_sent",
    title: `HeyReach: ${rawEvent}`,
    direction: "outbound",
  };

  const name = splitName(
    pick(lead, "fullName", "name"),
    pick(lead, "firstName", "first_name"),
    pick(lead, "lastName", "last_name")
  );
  const linkedin = pick(lead, "profileUrl", "linkedinUrl", "linkedin_url", "profile_url");
  const companyName = pick(lead, "companyName", "company", "company_name");
  const domain = cleanDomain(
    pick(lead, "companyDomain", "company_domain", "companyWebsite", "website")
  );

  const externalId =
    pick(body, "id", "eventId", "messageId") &&
    `${rawEvent}:${pick(body, "id", "eventId", "messageId")}`;

  try {
    const result = await ingest({
      provider: "heyreach",
      source: "heyreach",
      channel: "outbound",
      eventType: rawEvent,
      externalId: externalId ?? null,
      company: { name: companyName, domain },
      contact: {
        ...name,
        email: pick(lead, "emailAddress", "email"),
        title: pick(lead, "position", "headline", "title"),
        linkedin_url: linkedin,
        location: pick(lead, "location"),
      },
      lead: mapped.status ? { status: mapped.status } : {},
      activity: {
        type: mapped.type,
        channel: "linkedin",
        direction: mapped.direction,
        title: mapped.title,
        body: pick(body, "message", "messageText", "reply", "text"),
        occurred_at: pick(body, "timestamp", "eventTime", "created_at", "time"),
        metadata: {
          campaign_id: pick(body, "campaignId", "campaign_id"),
          campaign_name: pick(body, "campaignName", "campaign_name"),
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
