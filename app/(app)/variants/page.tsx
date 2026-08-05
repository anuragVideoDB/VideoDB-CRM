import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VariantEditor from "./VariantEditor";

export const dynamic = "force-dynamic";

export type VariantRow = {
  id: string;
  provider: string;
  campaign_external_id: string | null;
  campaign_name: string | null;
  step_number: number;
  angle: string | null;
  hook: string | null;
  cta: string | null;
  segment: string | null;
  label: string | null;
  subject: string | null;
  sent: number;
  opened: number;
  replies: number;
  positive_replies: number;
  bounces: number;
  meetings: number;
  reply_rate: number;
  positive_rate: number;
  meetings_per_100: number;
  bounce_rate: number;
  significant: boolean;
};

export default async function VariantsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; campaign?: string; min?: string }>;
}) {
  const sp = await searchParams;
  const days = Number(sp.days) || 30;
  const minSends = Number(sp.min) || 250;
  const campaign = sp.campaign || null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("variant_analytics", {
    p_days: days,
    p_campaign: campaign,
    p_min_sends: minSends,
  });

  const rows = (data ?? []) as VariantRow[];
  const campaigns = Array.from(
    new Map(
      rows
        .filter((r) => r.campaign_external_id)
        .map((r) => [r.campaign_external_id!, r.campaign_name ?? r.campaign_external_id!])
    ).entries()
  );

  const significant = rows.filter((r) => r.significant);
  const best = significant.length
    ? [...significant].sort((a, b) => b.positive_rate - a.positive_rate)[0]
    : null;

  const qs = (patch: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const merged = { days, campaign, min: minSends, ...patch };
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
    });
    return `/variants?${p.toString()}`;
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Variants</h1>
          <p className="mt-1 text-sm text-slate-500">
            Which copy actually works. Rows under {minSends} sends are greyed
            out — not enough volume to read as signal.
          </p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={qs({ days: d })}
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

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={qs({ campaign: null })}
          className={`rounded-full border px-3 py-1 text-xs ${
            !campaign ? "border-brand bg-indigo-50 text-brand" : "border-slate-200 text-slate-600"
          }`}
        >
          All campaigns
        </Link>
        {campaigns.map(([id, name]) => (
          <Link
            key={id}
            href={qs({ campaign: id })}
            className={`rounded-full border px-3 py-1 text-xs ${
              campaign === id
                ? "border-brand bg-indigo-50 text-brand"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {name}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <span className="text-xs text-slate-400">Significance floor:</span>
        {[100, 250, 500].map((m) => (
          <Link
            key={m}
            href={qs({ min: m })}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              minSends === m
                ? "border-brand bg-indigo-50 text-brand"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {m}
          </Link>
        ))}
      </div>

      {best && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <span className="font-medium text-emerald-900">Best performer:</span>{" "}
          <span className="text-emerald-800">
            {[best.angle, best.hook, best.cta].filter(Boolean).join(" · ") ||
              best.subject ||
              `Step ${best.step_number}`}
          </span>{" "}
          <span className="text-emerald-700">
            — {best.positive_rate}% positive on {best.sent} sends
          </span>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-rose-600">{error.message}</p>}

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm text-slate-500">
            No variants recorded yet. They are created automatically the first
            time a message is sent through a campaign — then you can tag each
            one with its angle, hook and CTA here.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Variant</th>
                <th className="px-3 py-3 font-medium">Step</th>
                <th className="px-3 py-3 font-medium">Segment</th>
                <th className="px-3 py-3 text-right font-medium">Sent</th>
                <th className="px-3 py-3 text-right font-medium">Replies</th>
                <th className="px-3 py-3 text-right font-medium">Reply %</th>
                <th className="px-3 py-3 text-right font-medium">Positive %</th>
                <th className="px-3 py-3 text-right font-medium">Mtgs/100</th>
                <th className="px-3 py-3 text-right font-medium">Bounce %</th>
                <th className="px-3 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-slate-100 last:border-0 ${
                    r.significant ? "" : "bg-slate-50/60 text-slate-400"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div
                      className={`font-medium ${
                        r.significant ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {[r.angle, r.hook, r.cta].filter(Boolean).join(" · ") ||
                        r.subject ||
                        r.label ||
                        "Untagged"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {r.campaign_name ?? r.campaign_external_id ?? "—"}
                      {r.subject && (r.angle || r.hook) ? ` · "${r.subject}"` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-3">{r.step_number}</td>
                  <td className="px-3 py-3">{r.segment ?? "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.sent}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.replies}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.reply_rate}%</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span
                      className={
                        r.significant && r.positive_rate >= 2
                          ? "rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700"
                          : ""
                      }
                    >
                      {r.positive_rate}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.meetings_per_100}
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
                  <td className="px-3 py-3">
                    <VariantEditor variant={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.some((r) => !r.significant) && (
        <p className="mt-3 text-xs text-slate-400">
          Greyed rows have fewer than {minSends} sends. They are still running —
          they just can&apos;t be compared yet.
        </p>
      )}
    </div>
  );
}
