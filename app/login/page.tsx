"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Supabase can return an error whose message is empty or a bare "{}" (e.g. a
  // 500 from the auth service). Always surface something a human can act on.
  function describeAuthError(err: {
    message?: string;
    status?: number;
    code?: string;
  }): string {
    const raw = (err.message ?? "").trim();
    const useless = raw === "" || raw === "{}" || raw === "[object Object]";
    if (!useless) return raw;
    const status = err.status ? ` (HTTP ${err.status})` : "";
    return `Sign-in failed${status}. Please try again, or contact your admin if it persists.`;
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Created here rather than at render: prerendering must not require env vars.
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(describeAuthError(error));
      return;
    }
    router.push("/today");
    router.refresh();
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(describeAuthError(error));
      return;
    }
    setMessage("Check your inbox for a magic sign-in link.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            V
          </div>
          <h1 className="text-xl font-semibold text-slate-900">VideoDB CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
        </div>

        <form
          onSubmit={mode === "password" ? handlePassword : handleMagic}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-indigo-100"
              placeholder="you@videodb.io"
            />
          </div>

          {mode === "password" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-indigo-100"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? "Please wait…"
              : mode === "password"
              ? "Sign in"
              : "Send magic link"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "password" ? "magic" : "password");
            setError(null);
            setMessage(null);
          }}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
        >
          {mode === "password"
            ? "Sign in with a magic link instead"
            : "Sign in with a password instead"}
        </button>
      </div>
    </div>
  );
}
