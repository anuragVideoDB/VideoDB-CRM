"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getAutomationSettings,
  saveAutomationSettings,
  runAutomationNow,
  type AutomationSettingsRow,
} from "./automation-actions";

function Toggle({
  label,
  hint,
  checked,
  danger,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  danger?: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
        disabled ? "opacity-50" : ""
      } ${checked && danger ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  );
}

export default function Automation() {
  const [s, setS] = useState<AutomationSettingsRow | null>(null);
  const [lastRun, setLastRun] = useState<{
    started_at: string;
    replies_drafted: number;
    actions_sent: number;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function load() {
    const res = await getAutomationSettings();
    setS(res.settings);
    setLastRun(res.lastRun);
  }

  useEffect(() => {
    load();
  }, []);

  function update(patch: Partial<AutomationSettingsRow>) {
    setS((prev) => (prev ? { ...prev, ...patch } : prev));
    startTransition(async () => {
      const res = await saveAutomationSettings(patch);
      if (res?.error) setMsg(res.error);
    });
  }

  if (!s) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-400">
        Loading automation settings…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Automation</h2>
          <p className="mt-1 text-sm text-slate-500">
            The agent checks for new replies every 15 minutes and drafts
            responses. You control how far it goes on its own.
          </p>
        </div>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setMsg("Running…");
              const res = await runAutomationNow();
              setMsg(res.error ?? res.message ?? "Done.");
              load();
            })
          }
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Run now
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <Toggle
          label="Draft replies automatically"
          hint="When a prospect replies, the agent writes a response and puts it in Approvals."
          checked={s.auto_draft_replies}
          onChange={(v) => update({ auto_draft_replies: v })}
        />
        <Toggle
          label="Send replies without approval"
          hint="Full autonomy. Only sends when the agent is confident and hasn't flagged the message for a human. Leave off until you trust the drafts."
          checked={s.auto_send_replies}
          danger
          disabled={!s.auto_draft_replies}
          onChange={(v) => update({ auto_send_replies: v })}
        />
        <Toggle
          label="Enrol new leads into campaigns"
          hint="New leads matching a Routing rule are pushed into that campaign. Rules set to 'needs approval' appear in Approvals instead."
          checked={Boolean(s.auto_enroll_leads)}
          onChange={(v) => update({ auto_enroll_leads: v })}
        />
        <Toggle
          label="Pause outreach when they reply"
          hint="Stops the sequence chasing someone who has already responded."
          checked={s.pause_on_reply}
          onChange={(v) => update({ pause_on_reply: v })}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Active from (hour)
          </label>
          <input
            type="number"
            min={0}
            max={23}
            value={s.send_window_start}
            onChange={(e) => update({ send_window_start: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Active until (hour)
          </label>
          <input
            type="number"
            min={0}
            max={23}
            value={s.send_window_end}
            onChange={(e) => update({ send_window_end: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Timezone
          </label>
          <input
            value={s.timezone}
            onChange={(e) => update({ timezone: e.target.value })}
            placeholder="Asia/Kolkata"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      {msg && <p className="mt-3 text-xs font-medium text-slate-700">{msg}</p>}

      {lastRun && (
        <p className="mt-3 text-xs text-slate-400">
          Last run {new Date(lastRun.started_at).toLocaleString()} —{" "}
          {lastRun.replies_drafted} drafted, {lastRun.actions_sent} sent.
        </p>
      )}
    </div>
  );
}
