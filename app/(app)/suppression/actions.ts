"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function addSuppression(input: {
  value: string;
  reason: string;
  notes?: string;
}) {
  const { supabase, user } = await requireUser();
  const raw = input.value.trim();
  if (!raw) return { error: "Enter an email, LinkedIn URL, or domain." };

  // Work out what kind of identifier this is.
  const row: Record<string, unknown> = {
    reason: input.reason,
    notes: input.notes?.trim() || null,
    source: "manual",
    created_by: user.id,
  };
  if (raw.includes("@")) row.email = raw.toLowerCase();
  else if (raw.includes("linkedin.com")) row.linkedin_url = raw.toLowerCase();
  else row.domain = raw.replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase();

  const { error } = await supabase.from("suppressions").insert(row);
  if (error) {
    return {
      error: error.code === "23505" ? "Already on the suppression list." : error.message,
    };
  }

  // Mark any matching leads immediately.
  if (row.email || row.linkedin_url) {
    await supabase.rpc("suppress_contact", {
      p_email: (row.email as string) ?? null,
      p_linkedin: (row.linkedin_url as string) ?? null,
      p_reason: input.reason,
      p_source: "manual",
    });
  }

  revalidatePath("/suppression");
  return { ok: true };
}

export async function removeSuppression(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("suppressions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/suppression");
  return { ok: true };
}
