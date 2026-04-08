import { NextRequest, NextResponse } from "next/server";
import { canTransition } from "@/lib/order-lifecycle";
import {
  updateDemoOrderStatus,
  getOrderById as getDemoOrder,
  confirmPayment,
  computePaymentSummary,
} from "@/lib/demo-order-store";
import {
  getCredentialsByRestaurantId,
  getAllRestaurants,
} from "@/lib/demo-store";
import type { AdminRole, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "awaiting_payment",
  "pending_cash",
  "paid",
];

function resolveDemoAdmin(adminId: string) {
  const DEMO_ADMINS: Record<string, { id: string; email: string; restaurantId: string; role: AdminRole }> = {
    "55555555-5555-5555-5555-555555555551": {
      id: "55555555-5555-5555-5555-555555555551",
      email: "admin@zilo.ma",
      restaurantId: "11111111-1111-1111-1111-111111111111",
      role: "restaurant_admin",
    },
  };
  if (DEMO_ADMINS[adminId]) return DEMO_ADMINS[adminId];

  for (const rest of getAllRestaurants()) {
    const creds = getCredentialsByRestaurantId(rest.id);
    const match = creds.find((c) => c.adminId === adminId);
    if (match) {
      return {
        id: match.adminId,
        email: match.email,
        restaurantId: match.restaurantId,
        role: match.role as AdminRole,
      };
    }
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: orderId } = await params;

  let body: { status?: string; adminId?: string; paymentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status: newStatusRaw, adminId, paymentId } = body;

  if (!adminId) {
    return NextResponse.json({ error: "adminId is required" }, { status: 400 });
  }

  const admin = resolveDemoAdmin(adminId);
  if (!admin) {
    return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
  }

  const demoOrder = getDemoOrder(orderId);
  if (!demoOrder) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (paymentId) {
    const ok = confirmPayment(orderId, paymentId);
    if (!ok) {
      return NextResponse.json({ error: "Could not confirm payment" }, { status: 422 });
    }
    const updated = getDemoOrder(orderId);
    const summary = updated ? computePaymentSummary(updated) : null;
    return NextResponse.json({
      ok: true,
      orderId,
      newStatus: updated?.status ?? demoOrder.status,
      confirmedPaid: summary?.totalConfirmed ?? 0,
      pendingCash: summary?.pendingCash ?? 0,
      remainingToClaim: summary?.remainingToClaim ?? 0,
    });
  }

  if (!newStatusRaw) {
    return NextResponse.json({ error: "status or paymentId is required" }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(newStatusRaw as OrderStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const newStatus = newStatusRaw as OrderStatus;

  if (!canTransition(demoOrder.status, newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${demoOrder.status} to ${newStatus}` },
      { status: 422 },
    );
  }

  updateDemoOrderStatus(orderId, newStatus);
  return NextResponse.json({ ok: true, orderId, newStatus });
}
