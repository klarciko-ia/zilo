"use client";

import Link from "next/link";
import { usePayment } from "@/lib/payment-context";
import { confirmedPaidTotal, formatOrderStatus } from "@/lib/order-summary";

type Props = {
  tableId: string;
  amount: number;
  method: string;
  paymentId?: string;
};

export function PaymentSuccessClient({ tableId, amount, method, paymentId }: Props) {
  const { getOrder } = usePayment();
  const order = getOrder(tableId);
  const isCash = method === "cash";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h1 className="text-xl font-semibold">{isCash ? "Cash payment recorded" : "Payment successful"}</h1>
        {isCash ? (
          <p className="mt-2 text-sm text-slate-700">
            Your cash payment is <span className="font-medium">pending staff confirmation</span>. Please pay your
            waiter <span className="font-semibold">{amount.toFixed(2)} MAD</span>.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Your card payment went through.</p>
        )}
        <p className="mt-2 text-sm">This payment: {amount.toFixed(2)} MAD</p>
        {paymentId ? <p className="mt-1 text-xs text-slate-500">Ref: {paymentId}</p> : null}
      </div>

      {order ? (
        <div className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-100">
          <p className="font-medium text-slate-800">Bill overview</p>
          <p className="mt-1">Status: {formatOrderStatus(order.status)}</p>
          <p>Total bill: {order.totalAmount.toFixed(2)} MAD</p>
          <p>Paid (confirmed): {confirmedPaidTotal(order.payments).toFixed(2)} MAD</p>
          <p>Cash pending: {order.amountCashPending.toFixed(2)} MAD</p>
          <p>Remaining: {order.remainingAmount.toFixed(2)} MAD</p>
        </div>
      ) : null}

      <Link
        href={`/table/${tableId}/review`}
        className="block rounded-xl bg-brand px-4 py-3 text-center text-sm font-medium text-white"
      >
        Rate your visit
      </Link>
      <Link
        href={`/table/${tableId}/checkout`}
        className="block rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-medium"
      >
        Back to checkout
      </Link>
      <Link href={`/table/${tableId}`} className="block text-center text-sm text-slate-600">
        Back to menu
      </Link>
    </div>
  );
}
