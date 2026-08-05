import { createClient } from "@/lib/supabase/server";
import SuppressionManager, { type SuppressionRow } from "./SuppressionManager";

export const dynamic = "force-dynamic";

export default async function SuppressionPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("suppressions")
    .select("id, email, linkedin_url, domain, reason, notes, source, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="p-8">
      <SuppressionManager rows={(data ?? []) as SuppressionRow[]} />
    </div>
  );
}
