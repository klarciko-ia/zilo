import { NextRequest, NextResponse } from "next/server";
import { getTablesByRestaurantId } from "@/lib/demo-store";
import { getOrdersByRestaurantId } from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json({ tables: [] });
  }

  const tables = getTablesByRestaurantId(restaurantId);
  const orders = getOrdersByRestaurantId(restaurantId);
  const orderBySlug = new Map(orders.map((o) => [o.tableSlug, o]));

  const result = tables.map((t) => {
    const order = orderBySlug.get(t.slug);
    return {
      id: t.slug,
      tableNumber: t.tableNumber,
      qrSlug: t.slug,
      order: order ? {
        id: order.id,
        status: order.status,
        totalAmount: order.total,
        amountPaid: order.status === "paid" ? order.total : 0,
        amountCashPending: order.status === "pending_cash" ? order.total : 0,
        remainingAmount: order.status === "paid" || order.status === "pending_cash" ? 0 : order.total,
        orderItems: order.items.map((i) => ({
          id: i.menuItemId,
          menuItemId: i.menuItemId,
          name: i.name,
          unitPrice: i.unitPrice,
          quantityTotal: i.quantity,
          quantityPaid: 0,
          quantityRemaining: i.quantity,
        })),
        payments: [],
      } : null,
    };
  });

  return NextResponse.json({ tables: result });
}
