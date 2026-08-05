import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CampaignRow = {
  campaign_id: string;
  campaign_name: string;
  sent: number;
  sent_today: number;
  opened: number;
  replies: number;
  positive: number;
  bounces: number;
  unsubs: number;
  queue_remaining: number;
  reply_rate: number;
  positive_rate: number;
  bounce_rate: number;
  health: "healthy" | "warning" | "critical" | "unknown";
  last_activity: string | null;
};

const HEALTH_STYLE: Record<string, string> = {
  healthy: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  critical: "bg-rose-100 text-rose-800",
  unknown: "bg-slate-100 text-slate-500",
};

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = Number(sp.days) || 14;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("campaign_overview", { p_days: days });
  const rows = (data ?? []) as CampaignRow[];

  const totals = rows.reduce(
    (t, r) => ({
      sent: t.sent + r.sent,
      today: t.today + r.sent_today,
      queue: t.queue + r.queue_remaining,
      replies: t.replies + r.replies,
      positive: t.positive + r.positive,
    }),
    { sent: 0, today: 0, queue: 0, replies: 0, positive: 0 }
  );

  return (
    <div className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Campaigns</h1>
          <p className="mt-1 text-sm text-slate-500">
            Volume, queue and deliverability health per campaign. Last {days} days.
          </p>
        </div>
        <div className="flex gap-1">
          {[7, 14, 30].map((d) => (
            <Link
              key={d}
              href={`/campaigns?days=${d}`}
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

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          ["Sent today", totals.today],
          ["Sent total", totals.sent],
          ["Queue remaining", totals.queue],
          ["Replies", totals.replies],
          ["Positive", totals.positive],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-sm text-slate-500">{label as string}</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">
              {value as number}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-rose-600">{error.message}</p>}

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm text-slate-500">
            No campaign activity in this period yet.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-3 py-3 font-medium">Health</th>
                <th className="px-3 py-3 text-right font-medium">Today</th>
                <th className="px-3 py-3 text-right font-medium">Sent</th>
                <th className="px-3 py-3 text-right font-medium">Queue</th>
                <th className="px-3 py-3 text-right font-medium">Reply %</th>
                <th className="px-3 py-3 text-right font-medium">Positive %</th>
                <th className="px-3 py-3 text-right font-medium">Bounce %</th>
                <th className="px-3 py-3 text-right font-medium">Unsubs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.campaign_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{r.campaign_name}</div>
                    {r.last_activity && (
                      <div className="text-xs text-slate-400">
                        last activity {new Date(r.last_activity).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        HEALTH_STYLE[r.health]
                      }`}
                    >
                      {r.health}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.sent_today}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.sent}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.queue_remaining}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.reply_rate}%</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.positive_rate}%
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span
                      className={
                        r.bounce_rate > 2
                          ? "rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700"
                          : ""
                      }
                    >
                      {r.bounce_rate}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.unsubs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Health is judged on bounce rate: above 5% is critical, above 2% a
        warning. Under 20 sends there isn&apos;t enough data to judge.
      </p>
    </div>
  );
}
