import { notFound } from "next/navigation";
import { TableMenuCartClient } from "@/components/table-menu-cart-client";
import { supabase } from "@/lib/supabase";
import { loadTableGuestContext } from "@/lib/table-guest-context";
import {
  sampleCategories,
  sampleMenuItems,
} from "@/lib/seed-data";

export default async function TableMenuPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await loadTableGuestContext(params.id);
  if (!ctx) notFound();

  if (supabase) {
    try {
      const { data: categories } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", ctx.restaurantId)
        .order("sort_order");

      const { data: items } = await supabase
        .from("menu_items")
        .select(
          "id, name, description, price, image_url, category_id, is_available"
        )
        .eq("restaurant_id", ctx.restaurantId)
        .eq("is_available", true);

      if (categories && categories.length > 0 && items && items.length > 0) {
        return (
          <TableMenuCartClient
            tableId={params.id}
            restaurantName={ctx.restaurantName}
            tableNumber={ctx.tableNumber}
            categories={categories.map((c: Record<string, unknown>) => ({
              id: c.id as string,
              name: c.name as string,
              sortOrder: c.sort_order as number,
            }))}
            items={items.map((i: Record<string, unknown>) => ({
              id: i.id as string,
              name: i.name as string,
              description: i.description as string,
              price: Number(i.price),
              imageUrl: (i.image_url as string) ?? undefined,
              categoryId: i.category_id as string,
              isAvailable: i.is_available as boolean,
            }))}
            venueFlow={ctx.venueFlow}
            guestOrderMode={ctx.guestOrderMode}
          />
        );
      }
    } catch {
      /* Supabase failed – fall through to sample data */
    }
  }

  const categories = [...sampleCategories].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return (
    <TableMenuCartClient
      tableId={params.id}
      restaurantName={ctx.restaurantName}
      tableNumber={ctx.tableNumber}
      categories={categories}
      items={sampleMenuItems}
      venueFlow={ctx.venueFlow}
      guestOrderMode={ctx.guestOrderMode}
    />
  );
}
