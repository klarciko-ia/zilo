import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getTableBySlug } from "@/lib/demo-store";
import { createDemoOrder } from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

type KitchenItem = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { items?: KitchenItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = body.items;
  if (!items?.length) {
    return NextResponse.json({ error: "Items required" }, { status: 400 });
  }

  for (const i of items) {
    if (
      !i.menuItemId ||
      typeof i.name !== "string" ||
      typeof i.unitPrice !== "number" ||
      typeof i.quantity !== "number" ||
      i.quantity < 1
    ) {
      return NextResponse.json({ error: "Invalid item payload" }, { status: 400 });
    }
  }

  let db;
  try {
    db = getSupabase();
  } catch {
    return demoSuccess(params.id, items);
  }

  const payload = items.map((i) => ({
    menuItemId: i.menuItemId,
    name: i.name,
    unitPrice: i.unitPrice,
    quantity: i.quantity,
  }));

  try {
    const { data, error } = await db.rpc("submit_kitchen_ticket", {
      p_qr_slug: params.id,
      p_items: payload,
    });

    if (error) {
      return demoSuccess(params.id, items);
    }

    const result = data as Record<string, unknown> | null;
    const errCode = result?.error as string | undefined;
    if (errCode === "TABLE_NOT_FOUND") {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }
    if (errCode === "ITEMS_REQUIRED" || errCode === "INVALID_ITEM" || errCode === "INVALID_QUANTITY") {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    return NextResponse.json({
      kitchenOrderId: result?.kitchenOrderId,
      tableOrderId: result?.tableOrderId,
    });
  } catch {
    return demoSuccess(params.id, items);
  }
}

function demoSuccess(tableSlug: string, items: KitchenItem[]) {
  const tableHit = getTableBySlug(tableSlug);
  const restaurantId = tableHit?.restaurantId ?? "unknown";

  const order = createDemoOrder(tableSlug, restaurantId, items, "pending");

  return NextResponse.json({
    kitchenOrderId: order.id,
    tableOrderId: order.id,
  });
}
