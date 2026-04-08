import { NextRequest, NextResponse } from "next/server";
import { getTableBySlug } from "@/lib/demo-store";
import { createDemoOrder, getActiveOrderByTableSlug } from "@/lib/demo-order-store";

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

  return demoSuccess(params.id, items);
}

function demoSuccess(tableSlug: string, items: KitchenItem[]) {
  const tableHit = getTableBySlug(tableSlug);
  const restaurantId = tableHit?.restaurantId ?? "unknown";

  const existing = getActiveOrderByTableSlug(tableSlug);
  if (existing) {
    return NextResponse.json({
      kitchenOrderId: existing.id,
      tableOrderId: existing.id,
    });
  }

  const isSelfService = tableHit?.restaurant?.guestOrderMode === "self_service";
  const initialStatus = isSelfService ? "confirmed" : "pending";
  const order = createDemoOrder(tableSlug, restaurantId, items, initialStatus);

  return NextResponse.json({
    kitchenOrderId: order.id,
    tableOrderId: order.id,
  });
}
