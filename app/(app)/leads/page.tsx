import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge, SourceBadge, ChannelBadge } from "@/components/Badges";
import { LEAD_STATUSES, STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Search = {
  channel?: string;
  status?: string;
  source?: string;
  q?: string;
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select(
      "id, status, channel, source, priority, created_at, last_activity_at, contact:contacts(full_name, email, title), company:companies(name, domain)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (sp.channel) query = query.eq("channel", sp.channel);
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.source) query = query.eq("source", sp.source);

  const { data: leads } = await query;

  // Simple client-side-ish text filter on already-fetched rows
  const q = (sp.q ?? "").toLowerCase().trim();
  const rows = (leads ?? []).filter((l) => {
    if (!q) return true;
    const c = l.contact as { full_name: string | null; email: string | null } | null;
    const co = l.company as { name: string | null } | null;
    return (
      (c?.full_name ?? "").toLowerCase().includes(q) ||
      (c?.email ?? "").toLowerCase().includes(q) ||
      (co?.name ?? "").toLowerCase().includes(q)
    );
  });

  const chip = (label: string, params: Search, active: boolean) => {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && usp.set(k, v));
    const qs = usp.toString();
    return (
      <Link
        href={`/leads${qs ? `?${qs}` : ""}`}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
          active
            ? "border-brand bg-indigo-50 text-brand"
            : "border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} lead{rows.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {chip("All", {}, !sp.channel && !sp.status && !sp.source)}
        {chip("Inbound", { channel: "inbound" }, sp.channel === "inbound")}
        {chip("Outbound", { channel: "outbound" }, sp.channel === "outbound")}
        <span className="mx-1 h-4 w-px bg-slate-200" />
        {LEAD_STATUSES.map((st) =>
          chip(STATUS_LABELS[st], { status: st }, sp.status === st)
        )}
      </div>

      {/* Search */}
      <form className="mt-4" action="/leads" method="get">
        {sp.channel && <input type="hidden" name="channel" value={sp.channel} />}
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search by name, email, or company…"
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-indigo-100"
        />
      </form>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Motion</th>
              <th className="px-4 py-3 font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No leads yet. They&apos;ll show up here as your website form,
                  Smartlead, HeyReach, and Clay send data.
                </td>
              </tr>
            )}
            {rows.map((l) => {
              const c = l.contact as {
                full_name: string | null;
                email: string | null;
                title: string | null;
              } | null;
              const co = l.company as { name: string | null } | null;
              return (
                <tr
                  key={l.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${l.id}`}
                      className="font-medium text-slate-900 hover:text-brand"
                    >
                      {c?.full_name || c?.email || "Unknown"}
                    </Link>
                    {c?.title && (
                      <div className="text-xs text-slate-400">{c.title}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{co?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3">
                    <SourceBadge source={l.source} />
                  </td>
                  <td className="px-4 py-3">
                    <ChannelBadge channel={l.channel} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {l.last_activity_at
                      ? new Date(l.last_activity_at).toLocaleDateString()
                      : new Date(l.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
