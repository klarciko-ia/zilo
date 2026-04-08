"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeSelections } from "@/lib/payment-flow";
import { usePayment } from "@/lib/payment-context";
import type { PaymentType, Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/format-currency";

type Props = {
  tableId: string;
  paymentTypeRaw: string;
  amount: number;
  itemsRaw: string | null;
  tipAmount?: number;
  currency?: string;
};

function toPaymentType(value: string): PaymentType {
  if (value === "percentage_partial") return "percentage_partial";
  if (value === "item_partial") return "item_partial";
  if (value === "split_n_partial") return "split_n_partial";
  return "full";
}

export function CashPaymentClient({ tableId, paymentTypeRaw, amount, itemsRaw, tipAmount = 0, currency = "MAD" }: Props) {
  const router = useRouter();
  const { applyPayment, getOrder, ensureOrderFromCart } = usePayment();
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);

  const paymentType = toPaymentType(paymentTypeRaw);
  const itemSelections = decodeSelections(itemsRaw);

  const order = getOrder(tableId);
  const remaining = order?.remainingAmount ?? amount;
  const effectiveAmount = Math.min(amount, remaining);
  const total = effectiveAmount + tipAmount;

  useEffect(() => {
    if (!order) { ensureOrderFromCart(tableId); }
  }, [order, tableId, ensureOrderFromCart]);

  useEffect(() => {
    if (submitted.current || !order) return;
    submitted.current = true;

    (async () => {
      const result = await applyPayment({
        tableId,
        paymentMethod: "cash",
        paymentType,
        amount: effectiveAmount,
        tipAmount,
        itemSelections,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not process cash payment.");
        submitted.current = false;
        return;
      }
      router.push(
        `/table/${tableId}/checkout/success?method=cash&amount=${effectiveAmount.toFixed(2)}&tip=${tipAmount.toFixed(2)}&paymentId=${result.paymentId}`
      );
    })();
  }, [order, tableId, applyPayment, paymentType, effectiveAmount, tipAmount, itemSelections, router]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center px-4">
        <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center ring-1 ring-red-200">
          <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
        <Link href={`/table/${tableId}/checkout`} className="btn-primary">
          Back to checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center px-4">
      <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center ring-1 ring-amber-200 animate-pulse">
        <svg className="h-10 w-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-slate-900">Notifying your waiter…</h1>
        <p className="text-sm text-slate-600 max-w-xs mx-auto">
          Please have <span className="font-semibold">{formatCurrency(total, currency as Currency)}</span> ready.
          Your server will come to collect the payment.
        </p>
      </div>
    </div>
  );
}
