"use client";

import { useState, useTransition } from "react";
import { tagVariant } from "./actions";
import type { VariantRow } from "./page";

/**
 * Providers don't tell us the angle/hook/CTA behind a message — those are our
 * own experiment dimensions. This lets you tag a variant once, after which
 * every send attributed to it rolls up under those labels.
 */
export default function VariantEditor({ variant }: { variant: VariantRow }) {
  const [open, setOpen] = useState(false);
  const [angle, setAngle] = useState(variant.angle ?? "");
  const [hook, setHook] = useState(variant.hook ?? "");
  const [cta, setCta] = useState(variant.cta ?? "");
  const [segment, setSegment] = useState(variant.segment ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="whitespace-nowrap text-xs text-slate-500 hover:text-brand"
      >
        {variant.angle || variant.hook ? "Edit tags" : "Tag"}
      </button>
    );
  }

  return (
    <div className="w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      {[
        ["Angle", angle, setAngle, "e.g. pipeline maintenance"],
        ["Hook", hook, setHook, "e.g. archive search"],
        ["CTA", cta, setCta, "e.g. 15-min call"],
        ["Segment", segment, setSegment, "e.g. Media A-tier"],
      ].map(([label, value, setter, ph]) => (
        <div key={label as string} className="mb-2">
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {label as string}
          </label>
          <input
            value={value as string}
            onChange={(e) => (setter as (v: string) => void)(e.target.value)}
            placeholder={ph as string}
            className="w-full rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-brand"
          />
        </div>
      ))}

      {msg && <p className="mb-1 text-[10px] text-rose-600">{msg}</p>}

      <div className="flex gap-1">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await tagVariant(variant.id, { angle, hook, cta, segment });
              if (res?.error) setMsg(res.error);
              else setOpen(false);
            })
          }
          className="rounded bg-brand px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {pending ? "…" : "Save"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
