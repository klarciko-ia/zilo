"use client";

import Link from "next/link";
import { decodeSelections } from "@/lib/payment-flow";

type Props = {
  tableId: string;
  paymentType: string;
  amount: number;
  itemsRaw: string | null;
};

export function PaymentMethodClient({ tableId, paymentType, amount, itemsRaw }: Props) {
  const itemSelections = decodeSelections(itemsRaw);
  const safeType =
    paymentType === "full" || paymentType === "percentage_partial" || paymentType === "item_partial"
      ? paymentType
      : "full";
  const base = `/table/${tableId}/checkout`;
  const itemsPart = itemSelections.length ? `&items=${encodeURIComponent(JSON.stringify(itemSelections))}` : "";
  const payload = `type=${safeType}&amount=${amount.toFixed(2)}${itemsPart}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Choose Payment Method</h1>
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm text-slate-600">Amount to pay</p>
        <p className="text-xl font-semibold">{amount.toFixed(2)} MAD</p>
      </div>

      <Link
        href={`${base}/card?${payload}`}
        className="block rounded-xl bg-brand px-4 py-3 text-center font-medium text-white"
      >
        Pay by Card
      </Link>
      <Link
        href={`${base}/cash?${payload}`}
        className="block rounded-xl border border-slate-300 px-4 py-3 text-center font-medium"
      >
        Pay with Cash
      </Link>
      <Link href={base} className="block rounded-xl px-4 py-3 text-center text-sm text-slate-600">
        Back
      </Link>
    </div>
  );
}
