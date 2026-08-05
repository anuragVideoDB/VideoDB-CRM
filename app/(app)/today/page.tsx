import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Attention = {
  hot_replies: {
    id: string;
    lead_id: string | null;
    classification: string | null;
    confidence: number | null;
    title: string | null;
    reasoning: string | null;
    created_at: string;
    full_name: string | null;
    email: string | null;
    company: string | null;
  }[];
  failed_actions: { id: string; title: string | null; result: unknown; created_at: string; full_name: string | null }[];
  unhealthy_channels: { provider: string; identifier: string; display_name: string | null; status: string; detail: string | null }[];
  failed_webhooks: { id: string; provider: string; event_type: string | null; processing_error: string | null; received_at: string }[];
  stale_ingest: { provider: string; last_event: string; hours_since: number }[];
  due_resignals: number;
  last_automation_run: {
    started_at: string;
    replies_drafted: number;
    actions_sent: number;
    errors: unknown;
  } | null;
};

const CLASS_STYLE: Record<string, string> = {
  interested: "bg-emerald-100 text-emerald-800",
  referral: "bg-cyan-100 text-cyan-800",
  objection: "bg-amber-100 text-amber-800",
  not_now: "bg-slate-100 text-slate-600",
  ooo: "bg-slate-100 text-slate-500",
  unsubscribe: "bg-rose-100 text-rose-700",
  other: "bg-slate-100 text-slate-600",
};

const CLASS_LABEL: Record<string, string> = {
  interested: "Interested",
  referral: "Referral",
  objection: "Objection",
  not_now: "Not now",
  ooo: "Out of office",
  unsubscribe: "Unsubscribe",
  other: "Other",
};

function Section({
  title,
  count,
  tone = "neutral",
  children,
}: {
  title: string;
  count: number;
  tone?: "neutral" | "warn" | "bad";
  children: React.ReactNode;
}) {
  const dot =
    tone === "bad" ? "bg-rose-500" : tone === "warn" ? "bg-amber-500" : "bg-slate-300";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {count}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default async function TodayPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("needs_attention");
  const a = data as Attention | null;

  if (error || !a) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Today</h1>
        <p className="mt-4 text-sm text-rose-600">
          {error?.message ?? "Could not load."}
        </p>
      </div>
    );
  }

  const hot = a.hot_replies ?? [];
  const priority = hot.filter((h) =>
    ["interested", "referral"].includes(h.classification ?? "")
  );
  const problems =
    (a.failed_actions?.length ?? 0) +
    (a.unhealthy_channels?.length ?? 0) +
    (a.failed_webhooks?.length ?? 0) +
    (a.stale_ingest?.length ?? 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Today</h1>
      <p className="mt-1 text-sm text-slate-500">
        What needs you. Everything else is running on its own.
      </p>

      {/* Top line */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm text-slate-500">Hot replies</div>
          <div className="mt-1 text-3xl font-semibold text-emerald-600">
            {priority.length}
          </div>
          <div className="mt-1 text-xs text-slate-400">interested or referral</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm text-slate-500">Awaiting approval</div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {hot.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm text-slate-500">Re-signals due</div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {a.due_resignals ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm text-slate-500">Problems</div>
          <div
            className={`mt-1 text-3xl font-semibold ${
              problems ? "text-rose-600" : "text-slate-900"
            }`}
          >
            {problems}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* Hot replies */}
        <Section title="Replies waiting on you" count={hot.length}>
          {hot.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nothing waiting. The agent drafts a reply within 15 minutes of one
              arriving.
            </p>
          ) : (
            <div className="space-y-2">
              {hot.slice(0, 12).map((h) => (
                <Link
                  key={h.id}
                  href="/inbox"
                  className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 p-3 hover:border-slate-300"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {h.full_name || h.email || "Unknown"}
                      </span>
                      {h.company && (
                        <span className="text-xs text-slate-400">{h.company}</span>
                      )}
                      {h.classification && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            CLASS_STYLE[h.classification] ?? CLASS_STYLE.other
                          }`}
                        >
                          {CLASS_LABEL[h.classification] ?? h.classification}
                        </span>
                      )}
                    </div>
                    {h.reasoning && (
                      <p className="mt-0.5 truncate text-xs italic text-slate-500">
                        {h.reasoning}
                      </p>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
              {hot.length > 12 && (
                <Link href="/inbox" className="block text-xs text-brand hover:underline">
                  View all {hot.length} in the inbox →
                </Link>
              )}
            </div>
          )}
        </Section>

        {/* Problems */}
        {(a.unhealthy_channels?.length ?? 0) > 0 && (
          <Section
            title="Disconnected or degraded channels"
            count={a.unhealthy_channels.length}
            tone="bad"
          >
            <div className="space-y-1">
              {a.unhealthy_channels.map((c) => (
                <div key={`${c.provider}-${c.identifier}`} className="text-sm">
                  <span className="font-medium text-slate-800">
                    {c.display_name || c.identifier}
                  </span>{" "}
                  <span className="text-xs text-slate-500">
                    ({c.provider}) — {c.status}
                    {c.detail ? `: ${c.detail}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {(a.failed_actions?.length ?? 0) > 0 && (
          <Section title="Sends that failed" count={a.failed_actions.length} tone="bad">
            <div className="space-y-1">
              {a.failed_actions.map((f) => (
                <div key={f.id} className="text-sm">
                  <span className="text-slate-800">{f.full_name || f.title}</span>{" "}
                  <span className="text-xs text-rose-600">
                    {(f.result as { error?: string })?.error ?? "failed"}
                  </span>
                </div>
              ))}
              <Link href="/approvals" className="block pt-1 text-xs text-brand hover:underline">
                Retry in Approvals →
              </Link>
            </div>
          </Section>
        )}

        {(a.stale_ingest?.length ?? 0) > 0 && (
          <Section title="No events received recently" count={a.stale_ingest.length} tone="warn">
            <div className="space-y-1">
              {a.stale_ingest.map((s) => (
                <div key={s.provider} className="text-sm text-slate-700">
                  <span className="font-medium">{s.provider}</span> — nothing for{" "}
                  {s.hours_since}h. Check the webhook is still registered.
                </div>
              ))}
              <Link href="/settings" className="block pt-1 text-xs text-brand hover:underline">
                Check connections →
              </Link>
            </div>
          </Section>
        )}

        {(a.failed_webhooks?.length ?? 0) > 0 && (
          <Section title="Webhook processing errors" count={a.failed_webhooks.length} tone="warn">
            <div className="space-y-1">
              {a.failed_webhooks.map((w) => (
                <div key={w.id} className="text-xs text-slate-600">
                  <span className="font-medium">{w.provider}</span> {w.event_type} —{" "}
                  <span className="text-rose-600">{w.processing_error}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {a.last_automation_run && (
          <p className="text-xs text-slate-400">
            Agent last ran{" "}
            {new Date(a.last_automation_run.started_at).toLocaleString()} —{" "}
            {a.last_automation_run.replies_drafted} drafted,{" "}
            {a.last_automation_run.actions_sent} sent.
          </p>
        )}
      </div>
    </div>
  );
}
