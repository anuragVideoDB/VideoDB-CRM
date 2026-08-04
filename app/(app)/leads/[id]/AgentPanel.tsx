"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  agentDraftReply,
  agentDraftOutreach,
  agentSummarize,
} from "./agent-actions";

export default function AgentPanel({
  leadId,
  hasInbound,
}: {
  leadId: string;
  hasInbound: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [drafted, setDrafted] = useState(false);

  function run(fn: () => Promise<{ error?: string; ok?: boolean; summary?: string }>) {
    startTransition(async () => {
      setError(null);
      setMsg(null);
      const res = await fn();
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res?.summary) {
        setSummary(res.summary);
        return;
      }
      setDrafted(true);
      setMsg("Draft ready for your review.");
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <span>✨</span>
        <h2 className="text-sm font-semibold text-slate-900">Agent</h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Drafts are never sent automatically — they wait for your approval.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={pending}
          onClick={() => run(() => agentDraftOutreach(leadId))}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Thinking…" : "Draft outreach"}
        </button>
        <button
          disabled={pending || !hasInbound}
          title={hasInbound ? undefined : "No inbound message to reply to yet"}
          onClick={() => run(() => agentDraftReply(leadId))}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          Draft reply
        </button>
        <button
          disabled={pending}
          onClick={() => run(() => agentSummarize(leadId))}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Summarize
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}

      {msg && (
        <p className="mt-3 text-xs text-emerald-700">
          {msg}{" "}
          {drafted && (
            <Link href="/approvals" className="font-medium underline">
              Review it →
            </Link>
          )}
        </p>
      )}

      {summary && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="whitespace-pre-wrap text-xs text-slate-700">{summary}</p>
        </div>
      )}
    </div>
  );
}
