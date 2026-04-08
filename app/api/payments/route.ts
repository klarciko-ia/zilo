import { NextRequest, NextResponse } from "next/server";
import { getOrderById, addPaymentToOrder, computePaymentSummary } from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orderId, paymentMethod, amount, tipAmount = 0 } = body as {
    orderId: string;
    paymentType: string;
    paymentMethod: "card" | "cash";
    amount: number;
    tipAmount?: number;
  };

  if (!orderId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
  }

  const order = getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const summary = computePaymentSummary(order);
  if (amount > summary.remainingToClaim + 0.01) {
    return NextResponse.json(
      { error: `Amount ${amount} exceeds remaining ${summary.remainingToClaim}` },
      { status: 422 },
    );
  }

  const payment = addPaymentToOrder(orderId, paymentMethod, amount, tipAmount);
  if (!payment) {
    return NextResponse.json({ error: "Could not add payment" }, { status: 500 });
  }

  const updated = getOrderById(orderId);
  const updatedSummary = updated ? computePaymentSummary(updated) : summary;

  return NextResponse.json(
    {
      paymentId: payment.id,
      orderStatus: updated?.status ?? order.status,
      confirmedPaid: updatedSummary.totalConfirmed,
      pendingCash: updatedSummary.pendingCash,
      remainingToClaim: updatedSummary.remainingToClaim,
    },
    { status: 201 },
  );
}
