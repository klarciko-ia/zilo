"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { encodeSelections } from "@/lib/payment-flow";
import { usePayment } from "@/lib/payment-context";
import { formatCurrency } from "@/lib/format-currency";
import type { Currency } from "@/lib/types";

type Props = {
  tableId: string;
  tipPercent?: number;
  currency?: string;
};

export function ItemPaymentClient({ tableId, tipPercent = 0, currency = "MAD" }: Props) {
  const { ensureOrderFromCart, getOrder } = usePayment();
  const order = getOrder(tableId);
  const [selectedQtyMap, setSelectedQtyMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (order) return;
    let cancelled = false;
    ensureOrderFromCart(tableId).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [ensureOrderFromCart, order, tableId]);

  const selectedAmount = useMemo(() => {
    if (!order) return 0;
    return order.orderItems.reduce((sum, item) => {
      const qty = selectedQtyMap[item.menuItemId] ?? 0;
      return sum + qty * item.unitPrice;
    }, 0);
  }, [order, selectedQtyMap]);

  const tipAmount = tipPercent > 0 ? Number((selectedAmount * tipPercent / 100).toFixed(2)) : 0;

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
        <header className="flex items-center gap-4">
          <Link href={`/table/${tableId}/checkout`} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition hover:shadow-lift">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-brand">Pay for my items</h1>
        </header>
        <p className="text-sm text-slate-600">No order available yet.</p>
      </div>
    );
  }

  const unpaidItems = order.orderItems.filter((item) => item.quantityRemaining > 0);
  const paidItems = order.orderItems.filter((item) => item.quantityRemaining === 0);

  const selectedRows = order.orderItems
    .map((item) => ({
      menuItemId: item.menuItemId,
      quantity: selectedQtyMap[item.menuItemId] ?? 0,
    }))
    .filter((item) => item.quantity > 0);

  const encoded = encodeSelections(selectedRows);

  return (
    <div className="space-y-4 pb-44">
      <header className="flex items-center gap-4">
        <Link href={`/table/${tableId}/checkout`} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition hover:shadow-lift">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-brand">Pay for my items</h1>
          <p className="text-xs text-slate-500">Select only what you consumed</p>
        </div>
      </header>

      {unpaidItems.length === 0 ? (
        <div className="rounded-2xl bg-green-50 p-5 text-center ring-1 ring-green-200">
          <p className="text-sm font-medium text-green-800">All items have been paid for!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unpaidItems.map((item) => {
            const selectedQty = selectedQtyMap[item.menuItemId] ?? 0;
            return (
              <div key={item.menuItemId} className="glass-card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-slate-600">{formatCurrency(item.unitPrice, currency as Currency)} each</p>
                    <p className="text-xs text-slate-500">
                      Remaining: {item.quantityRemaining} / Total: {item.quantityTotal}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-brand transition hover:border-accent/40 hover:bg-coral-light/40"
                      onClick={() =>
                        setSelectedQtyMap((prev) => ({
                          ...prev,
                          [item.menuItemId]: Math.max(0, selectedQty - 1),
                        }))
                      }
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-bold">{selectedQty}</span>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-brand text-sm font-bold text-white shadow-sm transition hover:bg-accent disabled:opacity-35"
                      onClick={() =>
                        setSelectedQtyMap((prev) => ({
                          ...prev,
                          [item.menuItemId]: Math.min(item.quantityRemaining, selectedQty + 1),
                        }))
                      }
                      disabled={selectedQty >= item.quantityRemaining}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {paidItems.length > 0 && (
        <div className="space-y-2 opacity-50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Already paid</p>
          {paidItems.map((item) => (
            <div key={item.menuItemId} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium text-slate-500 line-through">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.quantityTotal} × {formatCurrency(item.unitPrice, currency as Currency)}</p>
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full self-start">Paid</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 space-y-3 rounded-2xl bg-brand px-5 py-4 text-white shadow-[0_20px_50px_-12px_rgba(26,26,46,0.45)] ring-1 ring-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Selected items</span>
          <span>{formatCurrency(selectedAmount, currency as Currency)}</span>
        </div>
        {tipAmount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Tip ({tipPercent}%)</span>
            <span>{formatCurrency(tipAmount, currency as Currency)}</span>
          </div>
        )}
        {selectedAmount > 0 ? (
          <Link
            href={`/table/${tableId}/checkout/method?type=item_partial&amount=${selectedAmount.toFixed(2)}&tipPercent=${tipPercent}&tipAmount=${tipAmount.toFixed(2)}&items=${encoded}`}
            className="block rounded-xl bg-white px-3 py-3 text-center font-bold text-brand transition hover:bg-accent hover:text-white"
          >
            Pay {formatCurrency(selectedAmount + tipAmount, currency as Currency)}
          </Link>
        ) : (
          <button
            className="block w-full rounded-xl bg-white/20 px-3 py-3 text-center font-medium text-white/50"
            disabled
          >
            Select at least one item
          </button>
        )}
      </div>
    </div>
  );
}
