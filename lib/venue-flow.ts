import type { SupabaseClient } from "@supabase/supabase-js";
import type { VenueFlow } from "@/lib/types";

/**
 * Reads venue_flow when the column exists (migration 0004+).
 * If the column is missing or the query fails, returns dine_in so pages still render.
 */
export async function fetchVenueFlowSafe(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<VenueFlow> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("venue_flow")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error) return "dine_in";
  const v = data?.venue_flow;
  if (v === "pay_first" || v === "dine_in") return v;
  return "dine_in";
}
