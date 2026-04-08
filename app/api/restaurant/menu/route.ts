import { NextRequest, NextResponse } from "next/server";
import { sampleMenuItems, sampleCategories } from "@/lib/seed-data";
import { getItemOverrides } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json(
      { error: "restaurantId required" },
      { status: 400 },
    );
  }

  const overrides = getItemOverrides(restaurantId);
  const items = sampleMenuItems.map((item) => ({
    ...item,
    isAvailable:
      overrides[item.id] !== undefined ? overrides[item.id] : item.isAvailable,
  }));

  return NextResponse.json({
    categories: sampleCategories,
    items,
  });
}
