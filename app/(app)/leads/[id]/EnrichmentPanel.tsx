/**
 * The Clay enrichment snapshot plus our own scoring. Clay's column names are
 * whatever the user mapped, so we render whatever arrived rather than
 * assuming a shape — and skip the noisy plumbing keys.
 */
const HIDE = new Set([
  "email", "first_name", "last_name", "full_name", "name", "linkedin_url",
  "linkedin", "profileUrl", "company", "company_name", "domain", "title",
  "id", "rowId", "clay_row_id", "channel", "status",
]);

function readable(key: string) {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EnrichmentPanel({
  lead,
  contactEnrichment,
  companyEnrichment,
}: {
  lead: {
    tier: string | null;
    segment: string | null;
    score: number;
    parked_until: string | null;
    park_trigger: string | null;
    suppressed_at: string | null;
  };
  contactEnrichment?: unknown;
  companyEnrichment?: unknown;
}) {
  const merged: Record<string, unknown> = {
    ...(companyEnrichment && typeof companyEnrichment === "object"
      ? (companyEnrichment as Record<string, unknown>)
      : {}),
    ...(contactEnrichment && typeof contactEnrichment === "object"
      ? (contactEnrichment as Record<string, unknown>)
      : {}),
  };

  const signals = Object.entries(merged)
    .filter(([k, v]) => !HIDE.has(k) && v !== null && v !== "" && typeof v !== "object")
    .slice(0, 20);

  const hasAny =
    lead.tier || lead.segment || lead.score > 0 || signals.length > 0 ||
    lead.parked_until || lead.suppressed_at;

  if (!hasAny) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Enrichment &amp; scoring</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {lead.tier && (
          <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
            Tier {lead.tier}
          </span>
        )}
        {lead.segment && (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            {lead.segment}
          </span>
        )}
        {lead.score > 0 && (
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            Score {lead.score}
          </span>
        )}
        {lead.suppressed_at && (
          <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
            Suppressed
          </span>
        )}
      </div>

      {lead.parked_until && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Parked until {new Date(lead.parked_until).toLocaleDateString()}
          {lead.park_trigger ? ` — ${lead.park_trigger}` : ""}
        </p>
      )}

      {signals.length > 0 && (
        <dl className="mt-4 space-y-1.5 text-sm">
          {signals.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-slate-400">{readable(k)}</dt>
              <dd className="truncate text-right text-slate-700">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
