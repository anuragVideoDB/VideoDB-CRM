"use client";

import { useEffect, useState, useTransition } from "react";
import {
  saveRule,
  deleteRule,
  toggleRule,
  listCampaigns,
  previewMatches,
  type CampaignOption,
  type RuleInput,
} from "./actions";

export type Rule = RuleInput & { id: string; is_active: boolean };

const SOURCES = [
  { value: "clay", label: "Clay" },
  { value: "inbound_form", label: "Website form" },
  { value: "smartlead", label: "Smartlead" },
  { value: "heyreach", label: "HeyReach" },
  { value: "manual", label: "Manual" },
  { value: "import", label: "Import" },
];

const EMPTY: RuleInput = {
  name: "",
  priority: 100,
  provider: "smartlead",
  campaign_external_id: "",
  match_source: [],
  match_channel: null,
  match_industry: [],
  auto_enroll: false,
};

export default function RoutingManager({ rules }: { rules: Rule[] }) {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [accounts, setAccounts] = useState<{ id: number; name: string }[]>([]);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [form, setForm] = useState<RuleInput>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    listCampaigns().then((r) => {
      setCampaigns(r.campaigns);
      setAccounts(r.linkedinAccounts);
      setLoadErrors(r.errors);
    });
  }, []);

  const providerCampaigns = campaigns.filter((c) => c.provider === form.provider);

  function openNew() {
    setForm(EMPTY);
    setEditing(null);
    setError(null);
    setShowForm(true);
  }

  function openEdit(r: Rule) {
    setForm({ ...r });
    setEditing(r.id);
    setError(null);
    setShowForm(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const chosen = providerCampaigns.find(
      (c) => c.id === form.campaign_external_id
    );
    startTransition(async () => {
      const res = await saveRule({
        ...form,
        id: editing ?? undefined,
        campaign_name: chosen?.name ?? form.campaign_name ?? null,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setShowForm(false);
      setForm(EMPTY);
      setEditing(null);
    });
  }

  function toggleArr(key: "match_source" | "match_industry", value: string) {
    const cur = (form[key] as string[]) ?? [];
    setForm({
      ...form,
      [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
    });
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Routing</h1>
          <p className="mt-1 text-sm text-slate-500">
            Decide which new leads go into which campaign. Rules are checked in
            priority order — the first match wins.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await previewMatches();
                setPreview(
                  res.error
                    ? res.error
                    : `${res.matches?.length ?? 0} lead(s) currently match a rule and would be enrolled.`
                );
              })
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Preview matches
          </button>
          <button
            onClick={openNew}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Add rule
          </button>
        </div>
      </div>

      {loadErrors.length > 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {loadErrors.join(" · ")}
        </p>
      )}
      {preview && (
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {preview}
        </p>
      )}

      {showForm && (
        <form onSubmit={submit} className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Rule name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Media companies → LinkedIn"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Priority
              </label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <p className="mt-1 text-xs text-slate-400">Lower runs first.</p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Match these leads
            </h3>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Source (leave empty for any)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SOURCES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleArr("match_source", s.value)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      (form.match_source ?? []).includes(s.value)
                        ? "border-brand bg-indigo-50 text-brand"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Motion
                </label>
                <select
                  value={form.match_channel ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, match_channel: e.target.value || null })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  <option value="">Any</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Min employees
                </label>
                <input
                  type="number"
                  value={form.min_employees ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      min_employees: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Max employees
                </label>
                <input
                  type="number"
                  value={form.max_employees ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_employees: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Industries (comma separated, leave empty for any)
              </label>
              <input
                value={(form.match_industry ?? []).join(", ")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    match_industry: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Media, Security, AI"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Send them to
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Tool
                </label>
                <select
                  value={form.provider}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      provider: e.target.value as "smartlead" | "heyreach",
                      campaign_external_id: "",
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  <option value="smartlead">Smartlead (email)</option>
                  <option value="heyreach">HeyReach (LinkedIn)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Campaign
                </label>
                <select
                  value={form.campaign_external_id}
                  onChange={(e) =>
                    setForm({ ...form, campaign_external_id: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  <option value="">Select…</option>
                  {providerCampaigns.map((c) => (
                    <option key={c.id} value={c.id} disabled={!c.enrollable}>
                      {c.name} ({c.status}){!c.enrollable ? " — draft, cannot enrol" : ""}
                    </option>
                  ))}
                </select>
                {providerCampaigns.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    No campaigns found for this tool.
                  </p>
                )}
              </div>
            </div>

            {form.provider === "heyreach" && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Send from LinkedIn account
                </label>
                <select
                  value={form.linkedin_account_id ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      linkedin_account_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  <option value="">Select…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <input
                type="checkbox"
                checked={Boolean(form.auto_enroll)}
                onChange={(e) => setForm({ ...form, auto_enroll: e.target.checked })}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Enrol automatically
                </span>
                <span className="block text-xs text-slate-600">
                  Off (recommended to start): matching leads appear in Approvals
                  for you to confirm. On: they go straight into the campaign.
                </span>
              </span>
            </label>
          </div>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              disabled={pending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Add rule"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {rules.length === 0 && !showForm && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm text-slate-500">
            No routing rules yet. Add one to have new leads flow into a campaign
            automatically instead of you pushing them.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {rules.map((r) => (
          <div
            key={r.id}
            className={`rounded-xl border bg-white p-4 ${
              r.is_active ? "border-slate-200" : "border-slate-200 opacity-50"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    #{r.priority}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{r.name}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      r.provider === "heyreach"
                        ? "bg-sky-50 text-sky-700"
                        : "bg-indigo-50 text-indigo-700"
                    }`}
                  >
                    {r.provider === "heyreach" ? "LinkedIn" : "Email"}
                  </span>
                  {r.auto_enroll ? (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      auto
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      needs approval
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {[
                    r.match_source?.length ? `source: ${r.match_source.join("/")}` : null,
                    r.match_channel ? `motion: ${r.match_channel}` : null,
                    r.match_industry?.length
                      ? `industry: ${r.match_industry.join("/")}`
                      : null,
                    r.min_employees ? `≥${r.min_employees} employees` : null,
                    r.max_employees ? `≤${r.max_employees} employees` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "matches any new lead"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  → {r.campaign_name ?? r.campaign_external_id}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => openEdit(r)}
                  className="text-xs text-slate-500 hover:text-brand"
                >
                  Edit
                </button>
                <button
                  onClick={() =>
                    startTransition(() => {
                      toggleRule(r.id, !r.is_active);
                    })
                  }
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  {r.is_active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete rule "${r.name}"?`)) {
                      startTransition(() => {
                        deleteRule(r.id);
                      });
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-rose-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
