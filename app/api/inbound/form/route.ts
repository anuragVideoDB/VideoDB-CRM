import { NextResponse } from "next/server";
import { ingest, verifyWebhookSecret } from "@/lib/ingest";
import { pick, domainFromEmail, splitName, cleanDomain } from "@/lib/normalize";

export const runtime = "nodejs";

// Inbound website contact form → creates an inbound lead.
// Accepts flexible JSON, e.g.:
// { "name": "Jane Doe", "email": "jane@acme.com", "company": "Acme",
//   "message": "Interested in VideoDB", "phone": "...", "linkedin_url": "...",
//   "utm_source": "...", "utm_campaign": "..." }
export async function POST(request: Request) {
  if (!verifyWebhookSecret(request, process.env.FORM_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      body = await request.json();
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    }
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const email = pick(body, "email", "email_address", "work_email");
  const name = splitName(
    pick(body, "name", "full_name", "fullName"),
    pick(body, "first_name", "firstName"),
    pick(body, "last_name", "lastName")
  );
  const domain =
    cleanDomain(pick(body, "domain", "company_domain", "website")) ??
    domainFromEmail(email);
  const message = pick(body, "message", "notes", "comments", "inquiry");

  if (!email && !pick(body, "linkedin_url", "linkedin")) {
    return NextResponse.json(
      { error: "email or linkedin_url required" },
      { status: 400 }
    );
  }

  // Collect any utm_* fields as source detail
  const sourceDetail: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k.startsWith("utm_") || k === "referrer" || k === "page") {
      sourceDetail[k] = v;
    }
  }

  try {
    const result = await ingest({
      provider: "form",
      source: "inbound_form",
      channel: "inbound",
      eventType: "form_submitted",
      externalId: null,
      company: {
        name: pick(body, "company", "company_name", "organization"),
        domain,
        website: pick(body, "website"),
      },
      contact: {
        ...name,
        email,
        title: pick(body, "title", "job_title", "role"),
        linkedin_url: pick(body, "linkedin_url", "linkedin"),
        phone: pick(body, "phone", "phone_number"),
      },
      lead: {
        status: "new",
        message,
        source_detail: sourceDetail,
      },
      activity: {
        type: "form_submitted",
        channel: "web",
        direction: "inbound",
        title: "Submitted the website contact form",
        body: message,
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
