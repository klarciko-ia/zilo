import { NextRequest, NextResponse } from "next/server";
import { getTableBySlug } from "@/lib/demo-store";
import { getActiveOrderByTableSlug, updateDemoOrderStatus } from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { method?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const tableSlug = params.id;
  const tableHit = getTableBySlug(tableSlug);
  if (!tableHit) {
    return NextResponse.json({ ok: true });
  }

  const order = getActiveOrderByTableSlug(tableSlug);
  if (!order) {
    return NextResponse.json({ ok: true });
  }

  if (body.method === "card") {
    updateDemoOrderStatus(order.id, "paid");
  } else if (body.method === "cash") {
    updateDemoOrderStatus(order.id, "pending_cash");
  }

  return NextResponse.json({ ok: true, orderId: order.id });
}
