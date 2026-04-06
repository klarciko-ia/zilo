"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePayment } from "@/lib/payment-context";

type Props = {
  tableId: string;
  tipPercent?: number;
};

const PEOPLE_OPTIONS = [2, 3, 4, 5, 6];

export function PercentagePaymentClient({ tableId, tipPercent = 0 }: Props) {
  const { ensureOrderFromCart, getOrder } = usePayment();
  const order = getOrder(tableId);
  const [loading, setLoading] = useState(!order);
  const [selectedN, setSelectedN] = useState<number | null>(null);
  const [customN, setCustomN] = useState("");

  useEffect(() => {
    if (order) return;
    let cancelled = false;
    ensureOrderFromCart(tableId).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [ensureOrderFromCart, order, tableId]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Split by People</h1>
        <p className="text-sm text-slate-600">No order available yet.</p>
        <Link
          href={`/table/${tableId}/checkout`}
          className="block rounded-xl border border-slate-300 px-4 py-3 text-center font-medium"
        >
          Back to checkout
        </Link>
      </div>
    );
  }

  const remaining = order.remainingAmount;

  if (remaining <= 0.01) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold">Bill Fully Paid</h1>
        <Link href={`/table/${tableId}/checkout`} className="block rounded-xl bg-brand px-4 py-3 text-center font-medium text-white">
          Back to checkout
        </Link>
      </div>
    );
  }

  const n = selectedN ?? (customN ? parseInt(customN, 10) : 0);
  const isValidN = n >= 2;
  const share = isValidN ? Number((remaining / n).toFixed(2)) : 0;
  const tipShare = isValidN && tipPercent > 0 ? Number((share * tipPercent / 100).toFixed(2)) : 0;

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <Link href={`/table/${tableId}/checkout`} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition hover:shadow-lift">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-brand">Split by people</h1>
      </header>

      <div className="glass-card rounded-2xl p-5">
        <p className="text-sm text-slate-600">Remaining balance</p>
        <p className="text-2xl font-bold tracking-tight text-brand">{remaining.toFixed(2)} MAD</p>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">How many people are splitting?</p>
        <div className="grid grid-cols-5 gap-2">
          {PEOPLE_OPTIONS.map((num) => (
            <button
              key={num}
              onClick={() => { setSelectedN(num); setCustomN(""); }}
              type="button"
              className={`rounded-2xl py-4 text-center text-lg font-bold transition-all ${
                selectedN === num
                  ? "bg-accent text-white shadow-lg shadow-accent/25 ring-2 ring-coral-mid/70"
                  : "bg-white/90 text-slate-700 ring-1 ring-slate-200/80 shadow-soft hover:bg-coral-light/50"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Other number…"
            min={2}
            className={`w-full rounded-xl border bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/20 ${
              customN && !selectedN ? "border-accent ring-2 ring-accent/25" : "border-slate-200"
            }`}
            value={customN}
            onChange={(e) => {
              setCustomN(e.target.value);
              setSelectedN(null);
            }}
          />
        </div>
      </div>

      {isValidN && (
        <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Your share ({remaining.toFixed(2)} ÷ {n})</span>
            <span className="font-bold">{share.toFixed(2)} MAD</span>
          </div>
          {tipShare > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Tip ({tipPercent}%)</span>
              <span className="font-medium">{tipShare.toFixed(2)} MAD</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold tracking-tight text-brand">
            <span>Your total</span>
            <span className="text-accent">{(share + tipShare).toFixed(2)} MAD</span>
          </div>
        </div>
      )}

      {isValidN && share > 0 ? (
        <Link
          href={`/table/${tableId}/checkout/method?type=split_n_partial&amount=${share.toFixed(2)}&tipPercent=${tipPercent}&tipAmount=${tipShare.toFixed(2)}`}
          className="btn-primary block rounded-2xl py-4 text-center shadow-lg shadow-brand/25"
        >
          Pay {(share + tipShare).toFixed(2)} MAD
        </Link>
      ) : (
        <button disabled className="block w-full rounded-2xl bg-slate-200 px-4 py-4 text-center font-bold text-slate-400">
          Select number of people
        </button>
      )}
    </div>
  );
}
