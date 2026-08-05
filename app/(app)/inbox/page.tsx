import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ApprovalList, { type ActionRow } from "../approvals/ApprovalList";

export const dynamic = "force-dynamic";

const CLASSES = [
  { value: "interested", label: "Interested" },
  { value: "objection", label: "Objection" },
  { value: "not_now", label: "Not now" },
  { value: "referral", label: "Referral" },
  { value: "ooo", label: "Out of office" },
  { value: "unsubscribe", label: "Unsubscribe" },
];

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; channel?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from("agent_actions")
    .select(
      `id, lead_id, type, status, title, reasoning, payload, created_at, result,
       classification, confidence,
       lead:leads!agent_actions_lead_id_fkey(
         contact:contacts(full_name, email),
         company:companies(name)
       )`
    )
    .in("status", ["proposed", "failed"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (sp.class) q = q.eq("classification", sp.class);

  const { data } = await q;

  let actions: (ActionRow & { classification?: string | null })[] = (data ?? []).map(
    (a) => {
      const lead = a.lead as {
        contact: { full_name: string | null; email: string | null } | null;
        company: { name: string | null } | null;
      } | null;
      return {
        id: a.id,
        lead_id: a.lead_id,
        type: a.type,
        status: a.status,
        title: a.title,
        reasoning: a.reasoning,
        payload: (a.payload ?? {}) as Record<string, unknown>,
        created_at: a.created_at,
        result: (a.result ?? null) as Record<string, unknown> | null,
        classification: a.classification,
        leadName: lead?.contact?.full_name || lead?.contact?.email || "Unknown lead",
        company: lead?.company?.name ?? null,
      };
    }
  );

  if (sp.channel) {
    actions = actions.filter(
      (a) => (a.payload?.channel ?? "email") === sp.channel
    );
  }

  const counts: Record<string, number> = {};
  (data ?? []).forEach((a) => {
    const c = a.classification ?? "unclassified";
    counts[c] = (counts[c] ?? 0) + 1;
  });

  const chip = (label: string, href: string, active: boolean, n?: number) => (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        active
          ? "border-brand bg-indigo-50 text-brand"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
      {n !== undefined && n > 0 && <span className="ml-1 text-slate-400">{n}</span>}
    </Link>
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Inbox</h1>
      <p className="mt-1 text-sm text-slate-500">
        Email and LinkedIn replies in one place, classified by the agent, each
        with a drafted response.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {chip("All", "/inbox", !sp.class && !sp.channel)}
        <span className="mx-1 h-4 w-px bg-slate-200" />
        {CLASSES.map((c) =>
          chip(
            c.label,
            `/inbox?class=${c.value}`,
            sp.class === c.value,
            counts[c.value]
          )
        )}
        <span className="mx-1 h-4 w-px bg-slate-200" />
        {chip("Email", "/inbox?channel=email", sp.channel === "email")}
        {chip("LinkedIn", "/inbox?channel=linkedin", sp.channel === "linkedin")}
      </div>

      <ApprovalList actions={actions} />
    </div>
  );
}
