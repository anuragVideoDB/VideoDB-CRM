import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default async function ResignalPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select(
      "id, status, parked_until, park_trigger, tier, segment, contact:contacts(full_name, email), company:companies(name, industry)"
    )
    .not("parked_until", "is", null)
    .order("parked_until", { ascending: true })
    .limit(200);

  const rows = data ?? [];
  const due = rows.filter((r) => r.parked_until && daysUntil(r.parked_until) <= 0);
  const upcoming = rows.filter((r) => r.parked_until && daysUntil(r.parked_until) > 0);

  const Row = ({ r }: { r: (typeof rows)[number] }) => {
    const c = r.contact as { full_name: string | null; email: string | null } | null;
    const co = r.company as { name: string | null; industry: string | null } | null;
    const d = r.parked_until ? daysUntil(r.parked_until) : 0;
    return (
      <tr className="border-b border-slate-100 last:border-0">
        <td className="px-4 py-3">
          <Link
            href={`/leads/${r.id}`}
            className="font-medium text-slate-900 hover:text-brand"
          >
            {c?.full_name || c?.email || "Unknown"}
          </Link>
          {co?.name && <div className="text-xs text-slate-400">{co.name}</div>}
        </td>
        <td className="px-3 py-3 text-slate-600">{co?.industry ?? "—"}</td>
        <td className="px-3 py-3">
          {r.tier ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {r.tier}
            </span>
          ) : (
            "—"
          )}
        </td>
        <td className="px-3 py-3">
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              d <= 0
                ? "bg-emerald-100 text-emerald-800"
                : d <= 14
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {d <= 0 ? "Due now" : `${d} days`}
          </span>
        </td>
        <td className="px-3 py-3 text-xs text-slate-500">
          {r.park_trigger ?? "—"}
        </td>
      </tr>
    );
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Re-signal watch</h1>
      <p className="mt-1 text-sm text-slate-500">
        Leads parked after a &quot;not now&quot;. Each carries a 90-day timer;
        when it elapses they return to the pipeline automatically on the next
        agent run.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm text-slate-500">Due now</div>
          <div className="mt-1 text-3xl font-semibold text-emerald-600">
            {due.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm text-slate-500">Parked</div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {upcoming.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm text-slate-500">Waking in ≤14 days</div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {upcoming.filter((r) => r.parked_until && daysUntil(r.parked_until) <= 14).length}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          Nothing parked. Leads land here when the agent classifies a reply as
          &quot;not now&quot;.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-3 py-3 font-medium">Industry</th>
                <th className="px-3 py-3 font-medium">Tier</th>
                <th className="px-3 py-3 font-medium">Wakes</th>
                <th className="px-3 py-3 font-medium">Trigger</th>
              </tr>
            </thead>
            <tbody>
              {due.map((r) => (
                <Row key={r.id} r={r} />
              ))}
              {upcoming.map((r) => (
                <Row key={r.id} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
