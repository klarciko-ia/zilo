import { notFound } from "next/navigation";
import { TableMenuCartClient } from "@/components/table-menu-cart-client";
import { supabase } from "@/lib/supabase";
import {
  sampleCategories,
  sampleMenuItems,
  sampleRestaurant,
  sampleTables,
} from "@/lib/seed-data";

export default async function TablePage({
  params,
}: {
  params: { id: string };
}) {
  if (supabase) {
    const { data: table } = await supabase
      .from("restaurant_tables")
      .select(
        "id, table_number, qr_slug, restaurant_id, restaurants(id, name, google_review_url)"
      )
      .eq("qr_slug", params.id)
      .single();

    if (!table) return notFound();

    const restaurant = table.restaurants as unknown as Record<string, unknown>;

    const { data: categories } = await supabase
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("restaurant_id", table.restaurant_id)
      .order("sort_order");

    const { data: items } = await supabase
      .from("menu_items")
      .select(
        "id, name, description, price, image_url, category_id, is_available"
      )
      .eq("restaurant_id", table.restaurant_id)
      .eq("is_available", true);

    return (
      <TableMenuCartClient
        tableId={params.id}
        restaurantName={restaurant.name as string}
        tableNumber={table.table_number}
        categories={(categories ?? []).map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: c.name as string,
          sortOrder: c.sort_order as number,
        }))}
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

  const categories = [...sampleCategories].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return (
    <TableMenuCartClient
      tableId={params.id}
      restaurantName={sampleRestaurant.name}
      tableNumber={table!.tableNumber}
      categories={categories}
      items={sampleMenuItems}
    />
  );
}
