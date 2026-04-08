import { notFound } from "next/navigation";
import { OrderReviewClient } from "@/components/order-review-client";
import { getItemOverrides } from "@/lib/demo-store";
import { loadTableGuestContext } from "@/lib/table-guest-context";
import { sampleMenuItems } from "@/lib/seed-data";

export default async function OrderReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await loadTableGuestContext(params.id);
  if (!ctx) notFound();

  const overrides = getItemOverrides(ctx.restaurantId);
  const items = sampleMenuItems.map((item) => ({
    ...item,
    isAvailable:
      overrides[item.id] !== undefined ? overrides[item.id] : item.isAvailable,
  }));

  return (
    <OrderReviewClient
      tableId={params.id}
      tableNumber={ctx.tableNumber}
      restaurantName={ctx.restaurantName}
      items={items}
      guestOrderMode={ctx.guestOrderMode}
    />
  );
}
