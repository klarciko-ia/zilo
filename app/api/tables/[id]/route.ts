import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getSupabase();
  const slug = params.id;

  const { data: table, error: tableErr } = await db
    .from("restaurant_tables")
    .select("id, table_number, qr_slug, restaurant_id, restaurants(id, name, google_review_url)")
    .eq("qr_slug", slug)
    .single();

  if (tableErr || !table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const { data: categories } = await db
    .from("menu_categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", table.restaurant_id)
    .order("sort_order");

  const { data: items } = await db
    .from("menu_items")
    .select("id, name, description, price, image_url, category_id, is_available")
    .eq("restaurant_id", table.restaurant_id)
    .eq("is_available", true);

  return NextResponse.json({
    table: {
      id: table.id,
      tableNumber: table.table_number,
      qrSlug: table.qr_slug,
    },
    restaurant: table.restaurants,
    categories: (categories ?? []).map((c: Record<string, unknown>) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sort_order,
    })),
    items: (items ?? []).map((i: Record<string, unknown>) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: Number(i.price),
      imageUrl: i.image_url,
      categoryId: i.category_id,
      isAvailable: i.is_available,
    })),
  });
}
