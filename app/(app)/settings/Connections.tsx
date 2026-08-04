"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getConnectionStatus,
  syncSmartleadWebhooks,
  syncHeyReachWebhooks,
  type ConnectionStatus,
} from "./actions";

function Dot({ state }: { state: "ok" | "warn" | "off" }) {
  const color =
    state === "ok" ? "bg-emerald-500" : state === "warn" ? "bg-amber-500" : "bg-slate-300";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export default function Connections() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      setStatus(await getConnectionStatus());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not check connections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function run(key: string, fn: () => Promise<{ message: string }>) {
    startTransition(async () => {
      setResult((r) => ({ ...r, [key]: "Working…" }));
      try {
        const res = await fn();
        setResult((r) => ({ ...r, [key]: res.message }));
        await refresh();
      } catch (e) {
        setResult((r) => ({
          ...r,
          [key]: e instanceof Error ? e.message : "Failed",
        }));
      }
    });
  }

  const sl = status?.smartlead;
  const hr = status?.heyreach;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Connections</h2>
          <p className="mt-1 text-sm text-slate-500">
            Live status of your outreach tools, and one-click webhook setup.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading || pending}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Checking…" : "Refresh"}
        </button>
      </div>

      {loadError && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {loadError}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {/* Smartlead */}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dot state={sl?.ok ? "ok" : sl?.configured ? "warn" : "off"} />
              <span className="text-sm font-medium text-slate-800">Smartlead</span>
              <span className="text-xs text-slate-400">email</span>
            </div>
            <button
              onClick={() => run("smartlead", syncSmartleadWebhooks)}
              disabled={pending || !sl?.ok}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Connect all campaigns
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {!sl?.configured
              ? "No API key set. Add SMARTLEAD_API_KEY in Vercel."
              : sl.error
              ? `Error: ${sl.error}`
              : `${sl.campaigns ?? 0} campaigns found · ${
                  sl.webhooksRegistered ?? 0
                } connected (of the first 10 checked)`}
          </p>
          {result.smartlead && (
            <p className="mt-2 text-xs font-medium text-slate-700">{result.smartlead}</p>
          )}
        </div>

        {/* HeyReach */}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dot state={hr?.ok ? "ok" : hr?.configured ? "warn" : "off"} />
              <span className="text-sm font-medium text-slate-800">HeyReach</span>
              <span className="text-xs text-slate-400">LinkedIn</span>
            </div>
            <button
              onClick={() => run("heyreach", syncHeyReachWebhooks)}
              disabled={pending || !hr?.ok}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Connect events
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {!hr?.configured
              ? "No API key set. Add HEYREACH_API_KEY in Vercel."
              : hr.error
              ? `Error: ${hr.error}`
              : `${hr.campaigns ?? 0} campaigns · ${hr.accounts ?? 0} LinkedIn accounts · ${
                  hr.webhooksRegistered ?? 0
                } event webhooks connected`}
          </p>
          {result.heyreach && (
            <p className="mt-2 text-xs font-medium text-slate-700">{result.heyreach}</p>
          )}
        </div>

        {/* OpenAI */}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Dot state={status?.openai.configured ? "ok" : "off"} />
            <span className="text-sm font-medium text-slate-800">OpenAI</span>
            <span className="text-xs text-slate-400">agent</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {status?.openai.configured
              ? "API key detected — ready for the agent layer."
              : "No API key set. Add OPENAI_API_KEY in Vercel."}
          </p>
        </div>
      </div>
    </div>
  );
}
