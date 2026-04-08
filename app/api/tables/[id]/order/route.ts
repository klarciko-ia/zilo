import { NextRequest, NextResponse } from "next/server";
import { getTableBySlug } from "@/lib/demo-store";
import {
  getActiveOrderByTableSlug,
  createDemoOrder,
  computePaymentSummary,
} from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const order = getActiveOrderByTableSlug(params.id);

  if (!order) {
    return NextResponse.json({ order: null });
  }

  const summary = computePaymentSummary(order);

  return NextResponse.json({
    order: {
      id: order.id,
      tableId: params.id,
      status: order.status,
      totalAmount: order.total,
      confirmedPaid: summary.totalConfirmed,
      pendingCash: summary.pendingCash,
      remainingToClaim: summary.remainingToClaim,
      orderItems: order.items.map((oi) => ({
        id: oi.menuItemId,
        menuItemId: oi.menuItemId,
        name: oi.name,
        unitPrice: oi.unitPrice,
        quantityTotal: oi.quantity,
        quantityPaid: 0,
        quantityRemaining: oi.quantity,
      })),
      payments: order.payments.map((p) => ({
        id: p.id,
        method: p.method,
        amount: p.amount,
        tipAmount: p.tipAmount,
        status: p.status,
        createdAt: p.createdAt,
      })),
      updatedAt: order.createdAt,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let body: {
    items: Array<{
      menuItemId: string;
      name: string;
      unitPrice: number;
      quantity: number;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { items } = body;
  if (!items?.length) {
    return NextResponse.json({ error: "Items required" }, { status: 400 });
  }

  const tableHit = getTableBySlug(params.id);
  const restaurantId = tableHit?.restaurantId ?? "unknown";

  const existing = getActiveOrderByTableSlug(params.id);
  if (existing) {
    return NextResponse.json({ orderId: existing.id }, { status: 201 });
  }

  const order = createDemoOrder(params.id, restaurantId, items, "pending");
  return NextResponse.json({ orderId: order.id, total: order.total }, { status: 201 });
}
