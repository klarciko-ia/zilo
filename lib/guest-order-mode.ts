import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuestOrderMode } from "@/lib/types";

/**
 * Reads guest_order_mode when column exists (migration 0005+).
 * On error or unknown value, defaults to self_service.
 */
export async function fetchGuestOrderModeSafe(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<GuestOrderMode> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("guest_order_mode")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error) return "self_service";
  const m = data?.guest_order_mode;
  if (m === "waiter_service" || m === "self_service") return m;
  return "self_service";
}
