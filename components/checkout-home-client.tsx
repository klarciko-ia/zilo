"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePayment } from "@/lib/payment-context";

export function CheckoutHomeClient({ tableId }: { tableId: string }) {
  const { ensureOrderFromCart, getOrder } = usePayment();
  const order = getOrder(tableId);
  const [loading, setLoading] = useState(!order);

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
        <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h12l1 12H4L5 9z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Your cart is empty</h1>
          <p className="text-sm text-slate-500 px-8">Add some delicious items from the menu to get started.</p>
        </div>
        <Link href={`/table/${tableId}`} className="btn-primary">
          Back to menu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between px-2">
        <Link href={`/table/${tableId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-soft border border-slate-100">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Checkout</h1>
        <div className="w-10" />
      </header>

      <div className="glass-card rounded-[2.5rem] p-8 text-center space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Total Balance</p>
        <div className="space-y-1">
          <h2 className="price-tag text-4xl font-black">{order.remainingAmount.toFixed(2)} <span className="text-xl">MAD</span></h2>
          {order.amountCashPending > 0 && (
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              {order.amountCashPending.toFixed(2)} MAD Pending Cash
            </p>
          )}
        </div>
        <div className="h-px w-12 bg-slate-100 mx-auto" />
        <p className="text-xs text-slate-500">Table {tableId}</p>
      </div>

      <div className="space-y-3">
        <p className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Options</p>

        <Link
          href={`/table/${tableId}/checkout/method?type=full&amount=${order.remainingAmount.toFixed(2)}`}
          className="glass-card group flex items-center justify-between rounded-3xl p-5 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold">Pay Full Amount</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tight">Settle the entire bill</p>
            </div>
          </div>
          <svg className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href={`/table/${tableId}/checkout/percentage`}
          className="glass-card group flex items-center justify-between rounded-3xl p-5 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-soft">
              <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold">Split by % or Amount</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tight">Pay a portion of the bill</p>
            </div>
          </div>
          <svg className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href={`/table/${tableId}/checkout/items`}
          className="glass-card group flex items-center justify-between rounded-3xl p-5 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-soft">
              <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold">Pay for My Items</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tight">Select specific items</p>
            </div>
          </div>
          <svg className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
