"use client";

import { useState, useTransition } from "react";
import { saveEntry, deleteEntry, toggleEntry } from "./actions";

export type Entry = {
  id: string;
  category: string;
  industry: string | null;
  title: string;
  content: string;
  is_active: boolean;
};

const CATEGORIES = [
  { value: "company", label: "Company", hint: "Who VideoDB is and what it does" },
  { value: "product", label: "Product", hint: "Capabilities, how it works" },
  { value: "value_prop", label: "Value prop", hint: "The outcome a buyer gets" },
  { value: "use_case", label: "Use case", hint: "A concrete scenario — often per industry" },
  { value: "icp", label: "ICP", hint: "Who to target, and who not to" },
  { value: "objection", label: "Objection", hint: "A common pushback and the honest answer" },
  { value: "faq", label: "FAQ", hint: "Frequently asked question" },
  { value: "tone", label: "Tone", hint: "How outreach should sound" },
  { value: "competitor", label: "Competitor", hint: "How we differ" },
  { value: "other", label: "Other", hint: "" },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

const EMPTY = { category: "company", industry: "", title: "", content: "" };

export default function KnowledgeManager({ entries }: { entries: Entry[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{
    category: string;
    industry: string;
    title: string;
    content: string;
  }>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setShowForm(true);
  }

  function openEdit(e: Entry) {
    setEditing(e.id);
    setForm({
      category: e.category,
      industry: e.industry ?? "",
      title: e.title,
      content: e.content,
    });
    setError(null);
    setShowForm(true);
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    startTransition(async () => {
      const res = await saveEntry({ id: editing ?? undefined, ...form });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setShowForm(false);
      setForm(EMPTY);
      setEditing(null);
    });
  }

  const grouped = entries.reduce<Record<string, Entry[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Knowledge base</h1>
          <p className="mt-1 text-sm text-slate-500">
            What the agent knows about VideoDB. Everything it writes is grounded
            in these entries — the richer this is, the better the drafts.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Add entry
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                {CATEGORIES.find((c) => c.value === form.category)?.hint}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Industry <span className="text-slate-400">(optional)</span>
              </label>
              <input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g. Media, EdTech — leave blank for all"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <p className="mt-1 text-xs text-slate-400">
                Entries tagged with an industry are only used for leads in it.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. What VideoDB does"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Content
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              placeholder="Write it the way you'd explain it to a new salesperson. Specific beats generic."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              disabled={pending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Add entry"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 && !showForm && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm text-slate-500">
            No entries yet. Start with three: what VideoDB does, who it&apos;s
            for, and the tone you want outreach to have.
          </p>
          <button
            onClick={openNew}
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Add your first entry
          </button>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {CATEGORY_LABEL[cat] ?? cat}
            </h2>
            <div className="space-y-2">
              {items.map((e) => (
                <div
                  key={e.id}
                  className={`rounded-xl border bg-white p-4 ${
                    e.is_active ? "border-slate-200" : "border-slate-200 opacity-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-slate-900">
                          {e.title}
                        </h3>
                        {e.industry && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                            {e.industry}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                        {e.content}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openEdit(e)}
                        className="text-xs text-slate-500 hover:text-brand"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          startTransition(() => {
                            toggleEntry(e.id, !e.is_active);
                          })
                        }
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        {e.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${e.title}"?`)) {
                            startTransition(() => {
                              deleteEntry(e.id);
                            });
                          }
                        }}
                        className="text-xs text-slate-400 hover:text-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
