import { NextResponse } from "next/server";
import { ingest, verifyWebhookSecret } from "@/lib/ingest";
import { pick, domainFromEmail, splitName, cleanDomain } from "@/lib/normalize";

export const runtime = "nodejs";

// Clay pushes enriched rows here (via a "Send Webhook" / HTTP API column).
// Field names are whatever you map in Clay — this reads the common ones and
// also stores the full row under `enrichment` for anything extra.
export async function POST(request: Request) {
  if (!verifyWebhookSecret(request, process.env.CLAY_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = pick(body, "email", "work_email", "email_address");
  const name = splitName(
    pick(body, "full_name", "name", "fullName"),
    pick(body, "first_name", "firstName"),
    pick(body, "last_name", "lastName")
  );
  const linkedin = pick(body, "linkedin_url", "linkedin", "linkedinUrl", "profileUrl");

  if (!email && !linkedin) {
    return NextResponse.json(
      { error: "email or linkedin_url required" },
      { status: 400 }
    );
  }

  const domain =
    cleanDomain(pick(body, "company_domain", "domain", "company_website", "website")) ??
    domainFromEmail(email);

  // inbound if Clay is enriching a website lead; default outbound (prospecting).
  const channel =
    pick(body, "channel")?.toLowerCase() === "inbound" ? "inbound" : "outbound";

  const externalId =
    pick(body, "id", "rowId", "clay_row_id") &&
    `clay:${pick(body, "id", "rowId", "clay_row_id")}`;

  try {
    const result = await ingest({
      provider: "clay",
      source: "clay",
      channel,
      eventType: "enriched",
      externalId: externalId ?? null,
      company: {
        name: pick(body, "company", "company_name", "companyName", "organization"),
        domain,
        website: pick(body, "company_website", "website"),
        industry: pick(body, "industry", "company_industry"),
        employee_count: pick(body, "employee_count", "employees", "company_size"),
        linkedin_url: pick(body, "company_linkedin_url", "company_linkedin"),
        location: pick(body, "company_location", "hq_location"),
        enrichment: body,
      },
      contact: {
        ...name,
        email,
        title: pick(body, "title", "job_title", "position", "role"),
        linkedin_url: linkedin,
        phone: pick(body, "phone", "phone_number", "mobile"),
        location: pick(body, "location", "city", "geo"),
        enrichment: body,
      },
      lead: {
        // Clay can drive stage; otherwise leave the lead where it is.
        status: pick(body, "status"),
        source_detail: {
          clay_table: pick(body, "table", "workbook"),
        },
      },
      activity: {
        type: "enriched",
        channel: "system",
        direction: "system",
        title: "Enriched by Clay",
        body: pick(body, "enrichment_summary", "notes"),
        metadata: {
          intent: pick(body, "intent", "buying_intent"),
          score: pick(body, "score", "fit_score"),
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
