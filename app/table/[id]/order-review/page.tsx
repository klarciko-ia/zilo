import { notFound, redirect } from "next/navigation";
import { OrderReviewClient } from "@/components/order-review-client";
import { supabase } from "@/lib/supabase";
import { loadTableGuestContext } from "@/lib/table-guest-context";
import {
  sampleMenuItems,
  sampleTables,
} from "@/lib/seed-data";

export default async function OrderReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await loadTableGuestContext(params.id);
  if (!ctx) notFound();

  if (ctx.guestOrderMode === "waiter_service") {
    redirect(`/table/${params.id}/hub`);
  }

  if (supabase) {
    const { data: items } = await supabase
      .from("menu_items")
      .select(
        "id, name, description, price, image_url, category_id, is_available"
      )
      .eq("restaurant_id", ctx.restaurantId)
      .eq("is_available", true);

    return (
      <OrderReviewClient
        tableId={params.id}
        tableNumber={ctx.tableNumber}
        restaurantName={ctx.restaurantName}
        items={(items ?? []).map((i: Record<string, unknown>) => ({
          id: i.id as string,
          name: i.name as string,
          description: i.description as string,
          price: Number(i.price),
          imageUrl: (i.image_url as string) ?? undefined,
          categoryId: i.category_id as string,
          isAvailable: i.is_available as boolean,
        }))}
      />
    );
  }

  const table = sampleTables.find((t) => t.qrSlug === params.id);
  if (!table) notFound();

  return (
    <OrderReviewClient
      tableId={params.id}
      tableNumber={table.tableNumber}
      restaurantName={ctx.restaurantName}
      items={sampleMenuItems}
    />
  );
}
