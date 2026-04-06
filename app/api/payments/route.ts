import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const db = getSupabase();
  const body = await req.json();
  const { orderId, paymentType, paymentMethod, amount, tipAmount, itemSelections } = body as {
    orderId: string;
    paymentType: "full" | "percentage_partial" | "item_partial" | "split_n_partial";
    paymentMethod: "card" | "cash";
    amount: number;
    tipAmount?: number;
    itemSelections?: Array<{ orderItemId: string; quantity: number }>;
  };

  if (!orderId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
  }

  const { data: order } = await db
    .from("table_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (amount > Number(order.remaining_amount) + 0.01) {
    return NextResponse.json({ error: "Amount exceeds remaining balance" }, { status: 400 });
  }

  const status = paymentMethod === "cash" ? "pending_cash_confirm" : "completed";

  const dbPaymentType: "full" | "percentage_partial" | "item_partial" =
    paymentType === "split_n_partial" ? "percentage_partial" : paymentType as "full" | "percentage_partial" | "item_partial";

  const { data: payment, error: payErr } = await db
    .from("payments")
    .insert({
      order_id: orderId,
      payment_type: dbPaymentType,
      payment_method: paymentMethod,
      amount,
      status,
    })
    .select()
    .single();

  if (payErr || !payment) {
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }

  if (paymentType === "item_partial" && itemSelections?.length) {
    for (const sel of itemSelections) {
      await db.rpc("increment_order_item_paid", {
        p_order_item_id: sel.orderItemId,
        p_quantity: sel.quantity,
      });
    }
  }

  const newAmountPaid = Number(order.amount_paid) + (paymentMethod === "card" ? amount : 0);
  const newCashPending = Number(order.amount_cash_pending) + (paymentMethod === "cash" ? amount : 0);
  const newRemaining = Math.max(0, Number(order.remaining_amount) - amount);

  /* Keep order visible for staff until all cash-in-hand is confirmed */
  let newStatus: string = "partially_paid";
  if (newCashPending > 0) {
    newStatus = "pending_cash";
  } else if (newRemaining <= 0) {
    newStatus = "paid";
  }

  await db
    .from("table_orders")
    .update({
      amount_paid: Number(newAmountPaid.toFixed(2)),
      amount_cash_pending: Number(newCashPending.toFixed(2)),
      remaining_amount: Number(newRemaining.toFixed(2)),
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return NextResponse.json({
    paymentId: payment.id,
    orderStatus: newStatus,
    remainingAmount: newRemaining,
  }, { status: 201 });
}
