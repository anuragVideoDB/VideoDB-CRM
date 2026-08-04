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

export async function saveEntry(input: {
  id?: string;
  category: string;
  industry?: string | null;
  title: string;
  content: string;
}) {
  const { supabase, user } = await requireUser();

  if (!input.title.trim() || !input.content.trim()) {
    return { error: "Title and content are required." };
  }

  const row = {
    category: input.category,
    industry: input.industry?.trim() || null,
    title: input.title.trim(),
    content: input.content.trim(),
  };

  const { error } = input.id
    ? await supabase.from("knowledge_base").update(row).eq("id", input.id)
    : await supabase
        .from("knowledge_base")
        .insert({ ...row, created_by: user.id });

  if (error) return { error: error.message };

  revalidatePath("/knowledge");
  return { ok: true };
}

export async function deleteEntry(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/knowledge");
  return { ok: true };
}

export async function toggleEntry(id: string, isActive: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("knowledge_base")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/knowledge");
  return { ok: true };
}
