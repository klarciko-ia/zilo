"use client";

import { OwnerBanner } from "@/components/restaurant/owner-banner";
import { TablesGrid } from "@/components/restaurant/tables-grid";
import { getAdminSession } from "@/lib/admin-session";

export default function RestaurantAdminPage() {
  const session = getAdminSession();
  const isOwner = session?.role === "restaurant_owner";

  return (
    <div className="p-4">
      {isOwner && (
        <OwnerBanner revenue={0} orders={0} pendingCash={0} currency="USD" />
      )}
      <TablesGrid />
    </div>
  );
}
