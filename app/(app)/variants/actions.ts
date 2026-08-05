"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function tagVariant(
  id: string,
  tags: { angle?: string; hook?: string; cta?: string; segment?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("message_variants")
    .update({
      angle: tags.angle?.trim() || null,
      hook: tags.hook?.trim() || null,
      cta: tags.cta?.trim() || null,
      segment: tags.segment?.trim() || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/variants");
  return { ok: true };
}
