"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, type LeadStatus } from "@/lib/constants";

export async function updateLeadStatus(leadId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: lead } = await supabase
    .from("leads")
    .select("status, contact_id")
    .eq("id", leadId)
    .single();

  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId);
  if (error) return { error: error.message };

  // Log the stage change to the timeline
  await supabase.from("activities").insert({
    lead_id: leadId,
    contact_id: lead?.contact_id ?? null,
    type: "status_changed",
    channel: "system",
    direction: "system",
    source: "crm",
    title: `Stage → ${STATUS_LABELS[status as LeadStatus] ?? status}`,
    created_by: user.id,
  });

  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function addNote(leadId: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!body.trim()) return { error: "Empty note" };

  const { data: lead } = await supabase
    .from("leads")
    .select("contact_id")
    .eq("id", leadId)
    .single();

  const { error } = await supabase.from("activities").insert({
    lead_id: leadId,
    contact_id: lead?.contact_id ?? null,
    type: "note",
    channel: "system",
    direction: "system",
    source: "crm",
    body: body.trim(),
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}
