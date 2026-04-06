"use client";

import Link from "next/link";
import { decodeSelections } from "@/lib/payment-flow";
import { usePayment } from "@/lib/payment-context";
import { formatCurrency } from "@/lib/format-currency";
import type { Currency } from "@/lib/types";

type Props = {
  tableId: string;
  paymentType: string;
  amount: number;
  itemsRaw: string | null;
  tipAmount?: number;
  currency?: string;
};

export function PaymentMethodClient({ tableId, paymentType, amount, itemsRaw, tipAmount = 0, currency = "MAD" }: Props) {
  const { getOrder } = usePayment();
  const order = getOrder(tableId);
  const itemSelections = decodeSelections(itemsRaw);
  const safeType =
    paymentType === "full" || paymentType === "percentage_partial" || paymentType === "item_partial" || paymentType === "split_n_partial"
      ? paymentType
      : "full";

  const remaining = order?.remainingAmount ?? amount;
  const effectiveAmount = Math.min(amount, remaining);

  const base = `/table/${tableId}/checkout`;
  const itemsPart = itemSelections.length ? `&items=${encodeURIComponent(JSON.stringify(itemSelections))}` : "";
  const tipPart = tipAmount > 0 ? `&tipAmount=${tipAmount.toFixed(2)}` : "";
  const payload = `type=${safeType}&amount=${effectiveAmount.toFixed(2)}${itemsPart}${tipPart}`;

  const total = effectiveAmount + tipAmount;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-4">
        <Link href={`${base}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition hover:shadow-lift">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-brand">Choose payment method</h1>
      </header>

      <div className="glass-card space-y-1 rounded-2xl p-5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Order amount</span>
          <span className="font-medium">{formatCurrency(effectiveAmount, currency as Currency)}</span>
        </div>
        {tipAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Tip</span>
            <span className="font-medium">{formatCurrency(tipAmount, currency as Currency)}</span>
          </div>
        )}
        <div className="border-t border-slate-100 pt-2 flex justify-between">
          <span className="text-sm text-slate-600">Total</span>
          <span className="text-xl font-semibold">{formatCurrency(total, currency as Currency)}</span>
        </div>
      </div>

      <Link
        href={`${base}/card?${payload}`}
        className="block rounded-2xl bg-brand px-4 py-4 text-center font-semibold text-white shadow-lg shadow-brand/25 transition hover:shadow-lift active:scale-[0.99]"
      >
        Pay by card
      </Link>
      <Link
        href={`${base}/cash?${payload}`}
        className="block rounded-2xl border border-slate-200/90 bg-white/80 px-4 py-4 text-center font-semibold text-brand backdrop-blur-sm transition hover:border-coral-mid/60 hover:shadow-soft"
      >
        Pay with cash
      </Link>
    </div>
  );
}
