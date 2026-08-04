import { createClient } from "@/lib/supabase/server";
import ApprovalList, { type ActionRow } from "./ApprovalList";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("agent_actions")
    // Reach the contact through the lead rather than agent_actions directly:
    // one unambiguous path, and it gives us the company in the same hop.
    .select(
      `id, lead_id, type, status, title, reasoning, payload, created_at, result,
       lead:leads!agent_actions_lead_id_fkey(
         contact:contacts(full_name, email),
         company:companies(name)
       )`
    )
    .in("status", ["proposed", "failed"])
    .order("created_at", { ascending: false })
    .limit(100);

  const actions: ActionRow[] = (data ?? []).map((a) => {
    const lead = a.lead as {
      contact: { full_name: string | null; email: string | null } | null;
      company: { name: string | null } | null;
    } | null;
    const contact = lead?.contact ?? null;
    return {
      id: a.id,
      lead_id: a.lead_id,
      type: a.type,
      status: a.status,
      title: a.title,
      reasoning: a.reasoning,
      payload: (a.payload ?? {}) as Record<string, unknown>,
      created_at: a.created_at,
      result: (a.result ?? null) as Record<string, unknown> | null,
      leadName: contact?.full_name || contact?.email || "Unknown lead",
      company: lead?.company?.name ?? null,
    };
  });

  const failed = actions.filter((a) => a.status === "failed").length;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Approvals</h1>
      <p className="mt-1 text-sm text-slate-500">
        The agent drafts, you decide. Nothing is sent without your approval.
        {failed > 0 && (
          <span className="ml-1 text-rose-600">
            {failed} previously failed — review and retry.
          </span>
        )}
      </p>

      <ApprovalList actions={actions} />
    </div>
  );
}
