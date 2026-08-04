"use client";

import { useState, useTransition } from "react";
import { LEAD_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { updateLeadStatus, addNote } from "./actions";

export function StatusSelect({
  leadId,
  current,
}: {
  leadId: string;
  current: string;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(current);

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        startTransition(() => {
          updateLeadStatus(leadId, next);
        });
      }}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium outline-none focus:border-brand focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

export function NoteBox({ leadId }: { leadId: string }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        startTransition(async () => {
          await addNote(leadId, body);
          setBody("");
        });
      }}
      className="flex gap-2"
    >
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a note…"
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-indigo-100"
      />
      <button
        disabled={pending || !body.trim()}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add"}
      </button>
    </form>
  );
}
