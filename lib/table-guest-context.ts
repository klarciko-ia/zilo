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
  currency: string;
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
      currency: "MAD",
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
      currency: demoHit.restaurant.currency || "USD",
    };
  }

  return null;
}

export async function loadTableGuestContext(
  qrSlug: string,
): Promise<TableGuestContext | null> {
  return resolveFromLocalData(qrSlug);
}
