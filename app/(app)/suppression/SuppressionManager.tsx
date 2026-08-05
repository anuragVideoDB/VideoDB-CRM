"use client";

import { useState, useTransition } from "react";
import { addSuppression, removeSuppression } from "./actions";

export type SuppressionRow = {
  id: string;
  email: string | null;
  linkedin_url: string | null;
  domain: string | null;
  reason: string;
  notes: string | null;
  source: string | null;
  created_at: string;
};

const REASONS = [
  { value: "unsubscribe", label: "Unsubscribed" },
  { value: "bounce", label: "Bounced" },
  { value: "customer", label: "Existing customer" },
  { value: "not_now", label: "Not now" },
  { value: "competitor", label: "Competitor" },
  { value: "complaint", label: "Complaint" },
  { value: "manual", label: "Manual" },
];

const REASON_STYLE: Record<string, string> = {
  unsubscribe: "bg-rose-100 text-rose-700",
  bounce: "bg-amber-100 text-amber-800",
  complaint: "bg-rose-100 text-rose-700",
  customer: "bg-emerald-100 text-emerald-700",
  competitor: "bg-slate-100 text-slate-600",
  not_now: "bg-slate-100 text-slate-600",
  manual: "bg-slate-100 text-slate-600",
};

export default function SuppressionManager({ rows }: { rows: SuppressionRow[] }) {
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("manual");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = filter ? rows.filter((r) => r.reason === filter) : rows;
  const counts: Record<string, number> = {};
  rows.forEach((r) => (counts[r.reason] = (counts[r.reason] ?? 0) + 1));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Suppression</h1>
      <p className="mt-1 text-sm text-slate-500">
        Nobody here is ever contacted again. Unsubscribes and bounces are added
        automatically; you can add anyone by hand.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            setMsg(null);
            const res = await addSuppression({ value, reason, notes });
            if (res?.error) setMsg(res.error);
            else {
              setValue("");
              setNotes("");
              setMsg("Added.");
            }
          });
        }}
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5"
      >
        <div className="grid gap-3 sm:grid-cols-[2fr,1fr,2fr,auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Email, LinkedIn URL, or domain
            </label>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="jane@acme.com or acme.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Notes (optional)
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="flex items-end">
            <button
              disabled={pending || !value.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
        {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
        <p className="mt-2 text-xs text-slate-400">
          Adding a domain suppresses everyone at that company.
        </p>
      </form>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-full border px-3 py-1 text-xs ${
            !filter ? "border-brand bg-indigo-50 text-brand" : "border-slate-200 text-slate-600"
          }`}
        >
          All {rows.length}
        </button>
        {REASONS.filter((r) => counts[r.value]).map((r) => (
          <button
            key={r.value}
            onClick={() => setFilter(r.value)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === r.value
                ? "border-brand bg-indigo-50 text-brand"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {r.label} {counts[r.value]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          Nothing suppressed yet.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Identifier</th>
                <th className="px-3 py-3 font-medium">Reason</th>
                <th className="px-3 py-3 font-medium">Notes</th>
                <th className="px-3 py-3 font-medium">Added</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {r.email || r.linkedin_url || r.domain}
                    {r.domain && (
                      <span className="ml-1 text-xs text-slate-400">(whole domain)</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        REASON_STYLE[r.reason] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {REASONS.find((x) => x.value === r.reason)?.label ?? r.reason}
                    </span>
                    {r.source && r.source !== "manual" && (
                      <span className="ml-1 text-[10px] text-slate-400">
                        via {r.source}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{r.notes ?? "—"}</td>
                  <td className="px-3 py-3 text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm("Remove from the suppression list?")) {
                          startTransition(() => {
                            removeSuppression(r.id);
                          });
                        }
                      }}
                      className="text-xs text-slate-400 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
