import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

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
  let db;
  try {
    db = getSupabase();
  } catch {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }

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

  const payload = items.map((i) => ({
    menuItemId: i.menuItemId,
    name: i.name,
    unitPrice: i.unitPrice,
    quantity: i.quantity,
  }));

  const { data, error } = await db.rpc("submit_kitchen_ticket", {
    p_qr_slug: params.id,
    p_items: payload,
  });

  if (error) {
    const msg = error.message ?? "";
    const missingFn =
      msg.includes("submit_kitchen_ticket") ||
      error.code === "42883" ||
      error.code === "PGRST202";
    const missingTable =
      msg.includes("kitchen_orders") ||
      msg.includes("kitchen_order_items") ||
      error.code === "42P01" ||
      error.code === "PGRST205";
    return NextResponse.json(
      {
        error: "Could not send order to kitchen",
        details: msg,
        hint: missingFn || missingTable
          ? "Apply supabase/migrations/0003_kitchen_orders.sql in the Supabase SQL editor."
          : undefined,
      },
      { status: 500 }
    );
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
}
