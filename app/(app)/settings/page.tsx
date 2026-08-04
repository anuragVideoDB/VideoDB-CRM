import { headers } from "next/headers";
import CopyField from "@/components/CopyField";

export const dynamic = "force-dynamic";

// The webhook URLs each external tool should call. Secrets are read
// server-side and shown only to the logged-in team.
export default async function SettingsPage() {
  // Derive the app's own base URL from the incoming request so the webhook
  // URLs are always correct, with no env var to keep in sync.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || `${proto}://${host}`;

  const endpoints = [
    {
      tool: "Website contact form",
      color: "emerald",
      desc: "POST your form submissions here (JSON). Fields: name, email, company, message, phone, linkedin_url.",
      url: `${base}/api/inbound/form?key=${process.env.FORM_WEBHOOK_SECRET ?? "SET_FORM_WEBHOOK_SECRET"}`,
      note: "Point your website's form handler (or a Zapier/Make step) at this URL.",
    },
    {
      tool: "Smartlead (email)",
      color: "indigo",
      desc: "Add this as a webhook in Smartlead for events like Email Sent, Opened, Replied, Bounced.",
      url: `${base}/api/webhooks/smartlead?key=${process.env.SMARTLEAD_WEBHOOK_SECRET ?? "SET_SMARTLEAD_WEBHOOK_SECRET"}`,
      note: "Smartlead → Settings → Webhooks → add a webhook for each event type.",
    },
    {
      tool: "HeyReach (LinkedIn)",
      color: "sky",
      desc: "Add this as a webhook in HeyReach for events like Connection Accepted and Message Replied.",
      url: `${base}/api/webhooks/heyreach?key=${process.env.HEYREACH_WEBHOOK_SECRET ?? "SET_HEYREACH_WEBHOOK_SECRET"}`,
      note: "HeyReach → Integrations / Webhooks → add this URL.",
    },
    {
      tool: "Clay (enrichment)",
      color: "amber",
      desc: "Use a Clay HTTP API / Webhook column to POST enriched rows here. Send company + contact fields.",
      url: `${base}/api/webhooks/clay?key=${process.env.CLAY_WEBHOOK_SECRET ?? "SET_CLAY_WEBHOOK_SECRET"}`,
      note: "In Clay, add a 'Send Webhook' / 'HTTP API' action pointing at this URL.",
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Connect your tools. Paste each URL into the matching tool so leads and
        activity flow into this CRM automatically.
      </p>

      <div className="mt-6 space-y-4">
        {endpoints.map((e) => (
          <div
            key={e.tool}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{e.tool}</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">{e.desc}</p>
            <div className="mt-3">
              <CopyField value={e.url} />
            </div>
            <p className="mt-2 text-xs text-slate-400">{e.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        <p className="font-medium">Keep these URLs private.</p>
        <p className="mt-1">
          The <code className="font-mono">?key=…</code> part is a secret that
          authorizes writes into your CRM. Only paste them into your own tool
          settings.
        </p>
      </div>
    </div>
  );
}
