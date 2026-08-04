"use client";

import { useState } from "react";
import Link from "next/link";
import { PIPELINE_COLUMNS, STATUS_LABELS, SOURCE_LABELS } from "@/lib/constants";
import { updateLeadStatus } from "@/app/(app)/leads/[id]/actions";

export type BoardLead = {
  id: string;
  status: string;
  source: string;
  channel: string;
  name: string;
  company: string | null;
};

export default function Board({ initial }: { initial: BoardLead[] }) {
  const [leads, setLeads] = useState<BoardLead[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  function onDrop(status: string) {
    if (!dragId) return;
    const lead = leads.find((l) => l.id === dragId);
    setOverCol(null);
    setDragId(null);
    if (!lead || lead.status === status) return;
    // optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === dragId ? { ...l, status } : l))
    );
    updateLeadStatus(lead.id, status);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_COLUMNS.map((col) => {
        const items = leads.filter((l) => l.status === col);
        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col);
            }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={() => onDrop(col)}
            className={`flex w-72 shrink-0 flex-col rounded-xl border ${
              overCol === col
                ? "border-brand bg-indigo-50/50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">
                {STATUS_LABELS[col]}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
                {items.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 px-2 pb-3">
              {items.map((l) => (
                <div
                  key={l.id}
                  draggable
                  onDragStart={() => setDragId(l.id)}
                  className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing"
                >
                  <Link
                    href={`/leads/${l.id}`}
                    className="text-sm font-medium text-slate-900 hover:text-brand"
                  >
                    {l.name}
                  </Link>
                  {l.company && (
                    <div className="mt-0.5 text-xs text-slate-500">
                      {l.company}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-1">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {SOURCE_LABELS[l.source] ?? l.source}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        l.channel === "inbound"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      {l.channel === "inbound" ? "In" : "Out"}
                    </span>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
