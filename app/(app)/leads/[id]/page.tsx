import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SourceBadge, ChannelBadge } from "@/components/Badges";
import { ACTIVITY_ICONS, ACTIVITY_LABELS } from "@/lib/constants";
import { StatusSelect, NoteBox } from "./LeadControls";
import AgentPanel from "./AgentPanel";
import EnrichmentPanel from "./EnrichmentPanel";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select(
      "*, contact:contacts(*), company:companies(*)"
    )
    .eq("id", id)
    .single();

  if (!lead) notFound();

  const contact = lead.contact as {
    full_name: string | null;
    email: string | null;
    title: string | null;
    linkedin_url: string | null;
    phone: string | null;
    location: string | null;
  } | null;
  const company = lead.company as {
    name: string | null;
    domain: string | null;
    industry: string | null;
    employee_count: number | null;
    website: string | null;
  } | null;

  const { data: activities } = await supabase
    .from("activities")
    .select("*, variant:message_variants(angle, hook, cta, label, subject, step_number)")
    .eq("lead_id", id)
    .order("occurred_at", { ascending: false });

  const { data: enrollments } = await supabase
    .from("sequence_enrollments")
    .select("status, enrolled_at, sequence:sequences(name, provider, channel)")
    .eq("lead_id", id);

  const name = contact?.full_name || contact?.email || "Unknown lead";

  return (
    <div className="p-8">
      <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to leads
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <SourceBadge source={lead.source} />
            <ChannelBadge channel={lead.channel} />
            {contact?.title && (
              <span className="text-sm text-slate-500">{contact.title}</span>
            )}
          </div>
        </div>
        <StatusSelect leadId={lead.id} current={lead.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left: details */}
        <div className="space-y-6 lg:col-span-1">
          <AgentPanel
            leadId={lead.id}
            hasInbound={(activities ?? []).some(
              (a) => a.direction === "inbound" && a.body
            )}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Email" value={contact?.email} />
              <Row
                label="LinkedIn"
                value={
                  contact?.linkedin_url ? (
                    <a
                      href={contact.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      Profile
                    </a>
                  ) : null
                }
              />
              <Row label="Phone" value={contact?.phone} />
              <Row label="Location" value={contact?.location} />
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Company</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Name" value={company?.name} />
              <Row label="Domain" value={company?.domain} />
              <Row label="Industry" value={company?.industry} />
              <Row
                label="Size"
                value={company?.employee_count ? `${company.employee_count}` : null}
              />
            </dl>
          </div>

          <EnrichmentPanel
            lead={{
              tier: lead.tier,
              segment: lead.segment,
              score: lead.score,
              parked_until: lead.parked_until,
              park_trigger: lead.park_trigger,
              suppressed_at: lead.suppressed_at,
            }}
            contactEnrichment={(lead.contact as { enrichment?: unknown } | null)?.enrichment}
            companyEnrichment={(lead.company as { enrichment?: unknown } | null)?.enrichment}
          />

          {lead.message && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Inbound message
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {lead.message}
              </p>
            </div>
          )}

          {enrollments && enrollments.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">Sequences</h2>
              <div className="mt-3 space-y-2 text-sm">
                {enrollments.map((e, i) => {
                  const seq = e.sequence as {
                    name: string;
                    provider: string;
                    channel: string;
                  } | null;
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-slate-700">{seq?.name}</span>
                      <span className="text-xs text-slate-400">{e.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
            <div className="mt-4">
              <NoteBox leadId={lead.id} />
            </div>

            <div className="mt-6 space-y-4">
              {(activities ?? []).length === 0 && (
                <p className="text-sm text-slate-400">No activity yet.</p>
              )}
              {(activities ?? []).map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm">
                    {ACTIVITY_ICONS[a.type] ?? "•"}
                  </div>
                  <div className="flex-1 border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">
                        {a.title || ACTIVITY_LABELS[a.type] || a.type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(a.occurred_at).toLocaleString()}
                      </span>
                    </div>
                    {a.body && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                        {a.body}
                      </p>
                    )}
                    {(() => {
                      const v = a.variant as {
                        angle: string | null; hook: string | null; cta: string | null;
                        label: string | null; subject: string | null; step_number: number;
                      } | null;
                      if (!v) return null;
                      const tags = [v.angle, v.hook, v.cta].filter(Boolean).join(" · ");
                      return (
                        <p className="mt-1 text-xs text-slate-400">
                          Step {v.step_number}
                          {v.label ? ` · variant ${v.label}` : ""}
                          {tags ? ` · ${tags}` : v.subject ? ` · "${v.subject}"` : ""}
                        </p>
                      );
                    })()}
                    {a.classification && (
                      <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {a.classification.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right text-slate-700">{value || "—"}</dd>
    </div>
  );
}
