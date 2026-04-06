import { supabase } from "@/lib/supabase";
import { fetchGuestOrderModeSafe } from "@/lib/guest-order-mode";
import { fetchVenueFlowSafe } from "@/lib/venue-flow";
import { sampleRestaurant, sampleTables } from "@/lib/seed-data";
import { getTableBySlug } from "@/lib/demo-store";
import type { GuestOrderMode, VenueFlow } from "@/lib/types";

export type TableGuestContext = {
  tableId: string;
  tableNumber: number;
  restaurantId: string;
  restaurantName: string;
  venueFlow: VenueFlow;
  guestOrderMode: GuestOrderMode;
};

function resolveFromLocalData(qrSlug: string): TableGuestContext | null {
  const sampleTable = sampleTables.find((t) => t.qrSlug === qrSlug);
  if (sampleTable) {
    return {
      tableId: qrSlug,
      tableNumber: sampleTable.tableNumber,
      restaurantId: sampleRestaurant.id,
      restaurantName: sampleRestaurant.name,
      venueFlow: sampleRestaurant.venueFlow,
      guestOrderMode: sampleRestaurant.guestOrderMode,
    };
  }

  const demoHit = getTableBySlug(qrSlug);
  if (demoHit) {
    return {
      tableId: qrSlug,
      tableNumber: demoHit.tableNumber,
      restaurantId: demoHit.restaurant.id,
      restaurantName: demoHit.restaurant.name,
      venueFlow: demoHit.restaurant.venueFlow,
      guestOrderMode: demoHit.restaurant.guestOrderMode,
    };
  }

  return null;
}

export async function loadTableGuestContext(
  qrSlug: string
): Promise<TableGuestContext | null> {
  if (!supabase) {
    return resolveFromLocalData(qrSlug);
  }

  try {
    const { data: row, error } = await supabase
      .from("restaurant_tables")
      .select("table_number, restaurant_id, restaurants(id, name)")
      .eq("qr_slug", qrSlug)
      .single();

    if (!error && row) {
      const rel = row.restaurants as unknown;
      const restaurants = (
        Array.isArray(rel) ? rel[0] : rel
      ) as { id: string; name: string } | null;
      if (restaurants?.id) {
        const restaurantId = row.restaurant_id as string;
        const [venueFlow, guestOrderMode] = await Promise.all([
          fetchVenueFlowSafe(supabase, restaurantId),
          fetchGuestOrderModeSafe(supabase, restaurantId),
        ]);

        return {
          tableId: qrSlug,
          tableNumber: row.table_number as number,
          restaurantId,
          restaurantName: restaurants.name,
          venueFlow,
          guestOrderMode,
        };
      }
    }
  } catch {
    /* Supabase unreachable */
  }

  return resolveFromLocalData(qrSlug);
}
