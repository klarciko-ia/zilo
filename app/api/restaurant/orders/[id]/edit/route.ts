import { NextRequest, NextResponse } from "next/server";
import { updateDemoOrderItems, getOrderById } from "@/lib/demo-order-store";
import type { DemoOrderItem } from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  let body: { items?: DemoOrderItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.items?.length) {
    return NextResponse.json({ error: "Items required" }, { status: 400 });
  }

  const existing = getOrderById(orderId);
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = updateDemoOrderItems(orderId, body.items);
  if (!updated) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    order: {
      id: updated.id,
      items: updated.items,
      total: updated.total,
      status: updated.status,
    },
  });
}
