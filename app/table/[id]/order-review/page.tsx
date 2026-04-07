import { notFound } from "next/navigation";
import { OrderReviewClient } from "@/components/order-review-client";
import { supabase } from "@/lib/supabase";
import { loadTableGuestContext } from "@/lib/table-guest-context";
import { sampleMenuItems } from "@/lib/seed-data";
import type { MenuItem } from "@/lib/types";

export default async function OrderReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await loadTableGuestContext(params.id);
  if (!ctx) notFound();

  let items: MenuItem[] = sampleMenuItems;

  if (supabase) {
    try {
      const { data } = await supabase
        .from("menu_items")
        .select("id, name, description, price, image_url, category_id, is_available")
        .eq("restaurant_id", ctx.restaurantId);

      if (data && data.length > 0) {
        items = data.map((i: Record<string, unknown>) => ({
          id: i.id as string,
          name: i.name as string,
          description: i.description as string,
          price: Number(i.price),
          imageUrl: (i.image_url as string) ?? undefined,
          categoryId: i.category_id as string,
          isAvailable: i.is_available as boolean,
        }));
      }
    } catch {
      /* Supabase failed — use sample data */
    }
  }

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
