# VideoDB CRM

A custom CRM that unifies **inbound** leads (website contact form) and
**outbound** leads (Smartlead email + HeyReach LinkedIn), with enrichment and
orchestration from **Clay** — all flowing into one pipeline you can manage.

Built for GTM, not engineers. This README explains what it does and how to run
it in plain English.

---

## What it does

```
INBOUND                              OUTBOUND
Website contact form                 Smartlead (email)   ┐
        │                            HeyReach (LinkedIn) ┤
        ▼                                                ▼
   ┌──────────────  VideoDB CRM (this app)  ──────────────┐
   │  Companies · Contacts · Leads · Activity timeline    │
   │  Pipeline board · Dashboard                          │
   └───────────────────────────┬──────────────────────────┘
                                │
                         Clay (enrichment)
```

- **One record per person.** If the same person shows up via the website,
  Smartlead, and Clay, the CRM merges them into a single lead (matched by email,
  then LinkedIn URL) instead of creating duplicates.
- **One timeline per lead.** Every email open/reply, LinkedIn connection, form
  submission, and Clay enrichment lands on that lead's activity feed.
- **A pipeline you drag.** Move leads across stages (New → Enriching →
  Sequenced → Engaged → Qualified → Meeting Booked → Won).

---

## The four "front doors" (webhooks)

Each external tool sends data to the CRM by calling a URL. You'll find the exact,
ready-to-paste URLs on the **Settings** page inside the app (each includes a
private `?key=` secret).

| Tool | What it sends | Endpoint |
|------|---------------|----------|
| Website form | New inbound inquiries | `/api/inbound/form` |
| Smartlead | Email sent / opened / clicked / replied / bounced | `/api/webhooks/smartlead` |
| HeyReach | LinkedIn connection & reply events | `/api/webhooks/heyreach` |
| Clay | Enriched company + contact data | `/api/webhooks/clay` |

You do **not** need to match field names exactly — each endpoint reads the
common field names these tools send and ignores the rest (the full raw payload
is always stored for safety).

---

## How the data is organized

- **companies** — the org (domain, industry, size), enriched by Clay
- **contacts** — the person (email, LinkedIn, title, phone)
- **leads** — the pipeline unit: source, channel (inbound/outbound), stage, owner
- **activities** — the unified timeline (one row per event)
- **sequences / sequence_enrollments** — which Smartlead/HeyReach campaign a lead is in
- **integration_events** — a raw log of every webhook received (for de-duplication & audit)

---

## Running it

### Prerequisites
- Node.js 20+
- The environment variables in `.env.example` (already filled in for you in
  Vercel; for local dev, copy to `.env.local`)

### Local development
```bash
npm install
npm run dev
# open http://localhost:3000
```

### Deploy
This app is built for **Vercel** + **Supabase** (both already provisioned).
Pushing to the connected branch triggers a Vercel deploy. Environment variables
are configured in the Vercel project settings.

---

## Signing in

The app is private to your team. On the login screen enter your email and use
the **magic link** option — you'll get a one-click sign-in link by email. (You
can also set a password in Supabase.)

---

## Security notes

- The `?key=…` in each webhook URL is a secret. Only paste these URLs into your
  own tool settings. If one leaks, rotate it (see below).
- Writes into the CRM go through a single, secret-gated database function
  (`crm_ingest`) — external tools can't touch your data without the key.
- All app data is protected by Row Level Security: only logged-in team members
  can read it.

### Rotating a secret
Secrets live as environment variables in Vercel (`FORM_WEBHOOK_SECRET`,
`SMARTLEAD_WEBHOOK_SECRET`, `HEYREACH_WEBHOOK_SECRET`, `CLAY_WEBHOOK_SECRET`,
and `INGEST_SECRET`). Change the value in Vercel, redeploy, and update the URL
in the corresponding tool. `INGEST_SECRET` must also match the value stored in
the database (`private.app_config`).

---

## Tech stack

- **Next.js** (App Router, TypeScript) — the app + API endpoints
- **Supabase** (Postgres, Auth, Row Level Security) — the database & login
- **Vercel** — hosting

---

## Roadmap ideas (not built yet)

- Push leads *out* to Clay for enrichment (currently Clay pushes in)
- Auto-enroll new inbound leads into a Smartlead/HeyReach sequence
- Lead scoring rules & routing/assignment
- Scheduled reconciliation job to backfill any missed webhook events
- Slack/email alerts on replies and booked meetings
