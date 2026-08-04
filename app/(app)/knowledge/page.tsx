import { createClient } from "@/lib/supabase/server";
import KnowledgeManager, { type Entry } from "./KnowledgeManager";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("knowledge_base")
    .select("id, category, industry, title, content, is_active")
    .order("category")
    .order("created_at");

  return (
    <div className="p-8">
      <KnowledgeManager entries={(data ?? []) as Entry[]} />
    </div>
  );
}
