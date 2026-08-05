import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, SOURCE_LABELS, type LeadStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Analytics = {
  days: number;
  leads: {
    total: number;
    inbound: number;
    outbound: number;
    new_in_window: number;
    engaged_plus: number;
    meetings: number;
    won: number;
  };
  by_stage: Record<string, number>;
  by_source: Record<string, number>;
  channels: {
    channel: string;
    sent: number;
    opened: number;
    replied: number;
    reply_rate: number;
  }[];
  industries: {
    industry: string;
    leads: number;
    engaged: number;
    engaged_rate: number;
  }[];
  agent: {
    proposed: number;
    executed: number;
    rejected: number;
    failed: number;
    approval_rate: number | null;
  };
  daily: { day: string; out: number; inb: number }[];
};

function Stat({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
    >
      {inner}
    </Link>
  ) : (
    <div className="rounded-xl border border-slate-200 bg-white p-5">{inner}</div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = Number(sp.days) || 30;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_analytics", { p_days: days });
  const a = data as Analytics | null;

  if (error || !a) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
        <p className="mt-4 text-sm text-rose-600">
          {error?.message ?? "Could not load analytics."}
        </p>
      </div>
    );
  }

  const maxDaily = Math.max(1, ...a.daily.map((d) => d.out + d.inb));
  const conv = (n: number) =>
    a.leads.total ? Math.round((n / a.leads.total) * 100) : 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            What&apos;s working, and what isn&apos;t. Last {days} days.
          </p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/analytics?days=${d}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                d === days
                  ? "border-brand bg-indigo-50 text-brand"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* Headline numbers */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Total leads"
          value={a.leads.total}
          sub={`${a.leads.new_in_window} added in ${days}d`}
          href="/leads"
        />
        <Stat
          label="Engaged or better"
          value={a.leads.engaged_plus}
          sub={`${conv(a.leads.engaged_plus)}% of all leads`}
        />
        <Stat
          label="Meetings booked"
          value={a.leads.meetings}
          href="/leads?status=meeting_booked"
        />
        <Stat
          label="Inbound / Outbound"
          value={`${a.leads.inbound} / ${a.leads.outbound}`}
          sub="lead mix"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Channel performance */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Channel performance
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Reply rate is the number that matters most.
          </p>
          {a.channels.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              No outreach activity in this period yet.
            </p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Channel</th>
                  <th className="pb-2 font-medium">Sent</th>
                  <th className="pb-2 font-medium">Opened</th>
                  <th className="pb-2 font-medium">Replied</th>
                  <th className="pb-2 font-medium">Reply rate</th>
                </tr>
              </thead>
              <tbody>
                {a.channels.map((c) => (
                  <tr key={c.channel} className="border-t border-slate-100">
                    <td className="py-2 font-medium text-slate-800">
                      {c.channel}
                    </td>
                    <td className="py-2 text-slate-600">{c.sent}</td>
                    <td className="py-2 text-slate-600">{c.opened}</td>
                    <td className="py-2 text-slate-600">{c.replied}</td>
                    <td className="py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          c.reply_rate >= 5
                            ? "bg-emerald-50 text-emerald-700"
                            : c.reply_rate > 0
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {c.reply_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Funnel */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">Pipeline funnel</h2>
          <div className="mt-4 space-y-3">
            {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((st) => {
              const count = a.by_stage[st] ?? 0;
              const pct = a.leads.total
                ? Math.round((count / a.leads.total) * 100)
                : 0;
              return (
                <div key={st}>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{STATUS_LABELS[st]}</span>
                    <span>
                      {count} {count > 0 && <span className="text-slate-400">({pct}%)</span>}
                    </span>
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

        {/* Industry performance */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Which industries respond
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Use this to decide where to point Clay next.
          </p>
          {a.industries.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Not enough data yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {a.industries.map((i) => (
                <div
                  key={i.industry}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-700">{i.industry}</span>
                  <span className="text-xs text-slate-500">
                    {i.engaged}/{i.leads} engaged{" "}
                    <span
                      className={`ml-1 rounded px-1.5 py-0.5 font-medium ${
                        i.engaged_rate >= 20
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {i.engaged_rate}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent effectiveness */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Agent effectiveness
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Are the drafts good enough to send?
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                {a.agent.executed}
              </div>
              <div className="text-xs text-slate-500">sent</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                {a.agent.proposed}
              </div>
              <div className="text-xs text-slate-500">awaiting review</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                {a.agent.rejected}
              </div>
              <div className="text-xs text-slate-500">rejected</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                {a.agent.approval_rate === null ? "—" : `${a.agent.approval_rate}%`}
              </div>
              <div className="text-xs text-slate-500">approval rate</div>
            </div>
          </div>
          {a.agent.failed > 0 && (
            <p className="mt-3 text-xs text-rose-600">
              {a.agent.failed} failed to send —{" "}
              <Link href="/approvals" className="underline">
                review
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Daily activity */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Daily activity</h2>
        <p className="mt-1 text-xs text-slate-400">
          <span className="text-indigo-600">■</span> outbound{" "}
          <span className="ml-2 text-emerald-600">■</span> inbound
        </p>
        {a.daily.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No activity yet.</p>
        ) : (
          <div className="mt-4 flex h-32 items-end gap-1">
            {a.daily.map((d) => (
              <div
                key={d.day}
                className="flex flex-1 flex-col justify-end gap-0.5"
                title={`${d.day}: ${d.out} out, ${d.inb} in`}
              >
                <div
                  className="w-full rounded-t bg-emerald-500"
                  style={{ height: `${(d.inb / maxDaily) * 100}%` }}
                />
                <div
                  className="w-full rounded-t bg-indigo-500"
                  style={{ height: `${(d.out / maxDaily) * 100}%` }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sources */}
      <div className="mt-6 flex flex-wrap gap-2">
        {Object.entries(a.by_source).map(([src, n]) => (
          <Link
            key={src}
            href={`/leads?source=${src}`}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-slate-300"
          >
            {SOURCE_LABELS[src] ?? src}: <strong>{n}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}
