import { notFound } from "next/navigation";
import { TableMenuCartClient } from "@/components/table-menu-cart-client";
import { loadTableGuestContext } from "@/lib/table-guest-context";
import {
  sampleCategories,
  sampleMenuItems,
} from "@/lib/seed-data";
import { getItemOverrides } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export default async function TableMenuPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await loadTableGuestContext(params.id);
  if (!ctx) notFound();

  const categories = [...sampleCategories].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const overrides = getItemOverrides(ctx.restaurantId);
  const items = sampleMenuItems.map((item) => ({
    ...item,
    isAvailable:
      overrides[item.id] !== undefined ? overrides[item.id] : item.isAvailable,
  }));

  return (
    <TableMenuCartClient
      tableId={params.id}
      restaurantName={ctx.restaurantName}
      tableNumber={ctx.tableNumber}
      categories={categories}
      items={items}
      venueFlow={ctx.venueFlow}
      guestOrderMode={ctx.guestOrderMode}
      currency={ctx.currency}
    />
  );
}
