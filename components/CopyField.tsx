"use client";

import { useState } from "react";

export default function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 outline-none"
      />
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white transition hover:opacity-90"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
