import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getSupabase();
  const paymentId = params.id;

  const { data: payment } = await db
    .from("payments")
    .select("*, table_orders(*)")
    .eq("id", paymentId)
    .single();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.payment_method !== "cash" || payment.status !== "pending_cash_confirm") {
    return NextResponse.json({ error: "Payment is not pending cash confirmation" }, { status: 400 });
  }

  await db
    .from("payments")
    .update({ status: "completed" })
    .eq("id", paymentId);

  const order = payment.table_orders;
  const newCashPending = Math.max(0, Number(order.amount_cash_pending) - Number(payment.amount));
  const newAmountPaid = Number(order.amount_paid) + Number(payment.amount);
  const remaining = Number(order.remaining_amount);

  let newStatus: string = "partially_paid";
  if (newCashPending > 0) {
    newStatus = "pending_cash";
  } else if (remaining <= 0) {
    newStatus = "paid";
  }

  await db
    .from("table_orders")
    .update({
      amount_paid: Number(newAmountPaid.toFixed(2)),
      amount_cash_pending: Number(newCashPending.toFixed(2)),
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  return NextResponse.json({ ok: true, orderStatus: newStatus });
}
