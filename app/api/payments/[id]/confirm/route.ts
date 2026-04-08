import { NextRequest, NextResponse } from "next/server";
import { confirmPayment, getOrderById, computePaymentSummary } from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { orderId?: string } = {};
  try { body = await req.json(); } catch { /* no body is ok */ }

  const paymentId = params.id;
  const { orderId } = body;

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const order = getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const payment = order.payments.find((p) => p.id === paymentId);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  if (payment.status !== "pending") {
    return NextResponse.json({ error: "Payment already confirmed" }, { status: 422 });
  }

  const ok = confirmPayment(orderId, paymentId);
  if (!ok) {
    return NextResponse.json({ error: "Could not confirm payment" }, { status: 500 });
  }

  const updated = getOrderById(orderId);
  const summary = updated ? computePaymentSummary(updated) : null;

  return NextResponse.json({
    ok: true,
    orderStatus: updated?.status ?? "paid",
    confirmedPaid: summary?.totalConfirmed ?? 0,
    pendingCash: summary?.pendingCash ?? 0,
    remainingToClaim: summary?.remainingToClaim ?? 0,
  });
}
