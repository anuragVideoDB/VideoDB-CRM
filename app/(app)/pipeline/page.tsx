import { createClient } from "@/lib/supabase/server";
import Board, { type BoardLead } from "./Board";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, status, source, channel, contact:contacts(full_name, email), company:companies(name)"
    )
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .limit(500);

  const boardLeads: BoardLead[] = (leads ?? []).map((l) => {
    const c = l.contact as { full_name: string | null; email: string | null } | null;
    const co = l.company as { name: string | null } | null;
    return {
      id: l.id,
      status: l.status,
      source: l.source,
      channel: l.channel,
      name: c?.full_name || c?.email || "Unknown",
      company: co?.name ?? null,
    };
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Pipeline</h1>
      <p className="mt-1 text-sm text-slate-500">
        Drag a card between stages to update it.
      </p>
      <div className="mt-6">
        <Board initial={boardLeads} />
      </div>
    </div>
  );
}
