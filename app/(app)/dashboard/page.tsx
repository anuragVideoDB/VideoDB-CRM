import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, ACTIVITY_ICONS, ACTIVITY_LABELS, type LeadStatus } from "@/lib/constants";
import { SourceBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: total }, { count: inbound }, { count: outbound }, leadsRes, activityRes] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("channel", "inbound"),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("channel", "outbound"),
      supabase.from("leads").select("status"),
      supabase
        .from("activities")
        .select("id, type, title, occurred_at, contact:contacts(full_name, email)")
        .order("occurred_at", { ascending: false })
        .limit(12),
    ]);

  const statusCounts: Record<string, number> = {};
  (leadsRes.data ?? []).forEach((l) => {
    statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;
  });

  const stats = [
    { label: "Total leads", value: total ?? 0, href: "/leads" },
    { label: "Inbound", value: inbound ?? 0, href: "/leads?channel=inbound" },
    { label: "Outbound", value: outbound ?? 0, href: "/leads?channel=outbound" },
    {
      label: "Meetings booked",
      value: statusCounts["meeting_booked"] ?? 0,
      href: "/leads?status=meeting_booked",
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your inbound and outbound pipeline at a glance.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
          >
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {s.value}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Pipeline breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">By stage</h2>
          <div className="mt-4 space-y-3">
            {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((st) => {
              const count = statusCounts[st] ?? 0;
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <div key={st}>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{STATUS_LABELS[st]}</span>
                    <span>{count}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-brand"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent activity
          </h2>
          <div className="mt-4 space-y-3">
            {(activityRes.data ?? []).length === 0 && (
              <p className="text-sm text-slate-400">
                No activity yet. Once your website form, Smartlead, HeyReach, or
                Clay start sending events, they&apos;ll appear here.
              </p>
            )}
            {(activityRes.data ?? []).map((a) => {
              const contact = a.contact as { full_name: string | null; email: string | null } | null;
              const name = contact?.full_name || contact?.email || "Someone";
              return (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <span>{ACTIVITY_ICONS[a.type] ?? "•"}</span>
                  <div className="flex-1">
                    <span className="font-medium text-slate-800">{name}</span>{" "}
                    <span className="text-slate-500">
                      {a.title || ACTIVITY_LABELS[a.type] || a.type}
                    </span>
                  </div>
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {timeAgo(a.occurred_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3 text-sm">
        <SourceBadge source="inbound_form" />
        <SourceBadge source="smartlead" />
        <SourceBadge source="heyreach" />
        <SourceBadge source="clay" />
        <Link href="/settings" className="ml-auto text-brand hover:underline">
          Connect your tools →
        </Link>
      </div>
    </div>
  );
}
