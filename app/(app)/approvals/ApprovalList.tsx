"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { approveAction, rejectAction, saveDraft } from "./actions";

export type ActionRow = {
  id: string;
  lead_id: string | null;
  type: string;
  status: string;
  title: string | null;
  reasoning: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  result: Record<string, unknown> | null;
  leadName: string;
  company: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  draft_email: "Email draft",
  draft_reply: "Reply draft",
  send_li_message: "LinkedIn message",
  add_to_sequence: "Add to sequence",
};

function ChannelTag({ channel }: { channel: string }) {
  const li = channel === "linkedin";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
        li ? "bg-sky-50 text-sky-700" : "bg-indigo-50 text-indigo-700"
      }`}
    >
      {li ? "LinkedIn" : "Email"}
    </span>
  );
}

export default function ApprovalList({ actions }: { actions: ActionRow[] }) {
  if (!actions.length) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
        <p className="text-sm text-slate-500">
          Nothing waiting for approval. When the agent drafts an email or a
          reply, it lands here for you to review.
        </p>
        <Link
          href="/leads"
          className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Go to leads
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {actions.map((a) => (
        <ApprovalCard key={a.id} action={a} />
      ))}
    </div>
  );
}

function ApprovalCard({ action }: { action: ActionRow }) {
  const p = action.payload ?? {};
  const [body, setBody] = useState(String(p.body ?? ""));
  const [subject, setSubject] = useState(String(p.subject ?? ""));
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [pending, startTransition] = useTransition();

  const channel = String(p.channel ?? "email");
  const dirty = body !== String(p.body ?? "") || subject !== String(p.subject ?? "");

  if (done) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        {action.leadName} — {done === "approved" ? "sent ✓" : "rejected"}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {action.lead_id ? (
                <Link href={`/leads/${action.lead_id}`} className="hover:text-brand">
                  {action.leadName}
                </Link>
              ) : (
                action.leadName
              )}
            </span>
            {action.company && (
              <span className="text-xs text-slate-400">{action.company}</span>
            )}
            <ChannelTag channel={channel} />
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              {TYPE_LABEL[action.type] ?? action.type}
            </span>
          </div>
          {action.reasoning && (
            <p className="mt-1 text-xs italic text-slate-500">
              Agent&apos;s read: {action.reasoning}
            </p>
          )}
        </div>
        <span className="whitespace-nowrap text-xs text-slate-400">
          {new Date(action.created_at).toLocaleString()}
        </span>
      </div>

      {channel === "email" && (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Subject
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
      )}

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Message — edit freely before sending
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand"
        />
        <p className="mt-1 text-xs text-slate-400">
          {body.trim().split(/\s+/).filter(Boolean).length} words
        </p>
      </div>

      {msg && <p className="mt-3 text-sm text-rose-600">{msg}</p>}

      <div className="mt-4 flex items-center gap-2">
        <button
          disabled={pending || !body.trim()}
          onClick={() =>
            startTransition(async () => {
              setMsg(null);
              const res = await approveAction(action.id, { body, subject });
              if (res?.error) setMsg(res.error);
              else setDone("approved");
            })
          }
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Approve & send"}
        </button>

        {dirty && (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await saveDraft(action.id, { body, subject });
                setMsg(res?.error ?? "Draft saved.");
              })
            }
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Save edits
          </button>
        )}

        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await rejectAction(action.id);
              if (res?.error) setMsg(res.error);
              else setDone("rejected");
            })
          }
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
