import { createClient } from "@/lib/supabase/server";
import RoutingManager, { type Rule } from "./RoutingManager";

export const dynamic = "force-dynamic";

export default async function RoutingPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("routing_rules")
    .select("*")
    .order("priority")
    .order("created_at");

  return (
    <div className="p-8">
      <RoutingManager rules={(data ?? []) as unknown as Rule[]} />
    </div>
  );
}
