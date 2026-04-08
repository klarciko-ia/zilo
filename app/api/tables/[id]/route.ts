import { NextRequest, NextResponse } from "next/server";
import { getTableBySlug, getItemOverrides } from "@/lib/demo-store";
import { sampleMenuItems, sampleCategories } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const slug = params.id;
  const hit = getTableBySlug(slug);

  if (!hit) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const overrides = getItemOverrides(hit.restaurantId);
  const items = sampleMenuItems.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    imageUrl: item.imageUrl,
    categoryId: item.categoryId,
    isAvailable: overrides[item.id] !== undefined ? overrides[item.id] : item.isAvailable,
  }));

  return NextResponse.json({
    table: {
      id: hit.slug,
      tableNumber: hit.tableNumber,
      qrSlug: hit.slug,
    },
    restaurant: {
      id: hit.restaurant.id,
      name: hit.restaurant.name,
    },
    categories: sampleCategories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
    })),
    items,
  });
}
