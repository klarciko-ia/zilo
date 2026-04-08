"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePayment } from "@/lib/payment-context";
import type { Currency, GuestOrderMode } from "@/lib/types";
import { formatCurrency } from "@/lib/format-currency";

const TIP_OPTIONS = [
  { label: "7%", value: 7, recommended: true },
  { label: "10%", value: 10, recommended: false },
  { label: "12%", value: 12, recommended: false },
];

type Props = { tableId: string; guestOrderMode: GuestOrderMode; currency?: string };

export function CheckoutHomeClient({ tableId, guestOrderMode, currency = "MAD" }: Props) {
  const { ensureOrderFromCart, getOrder, refreshOrderFromServer } = usePayment();
  const waiterMode = guestOrderMode === "waiter_service";
  const order = getOrder(tableId);
  const [ready, setReady] = useState(false);
  const [tipPercent, setTipPercent] = useState(7);
  const [customTip, setCustomTip] = useState("");
  const [isCustomTip, setIsCustomTip] = useState(false);
  const triedRef = useRef(false);

  useEffect(() => {
    if (triedRef.current) {
      if (order) setReady(true);
      return;
    }
    triedRef.current = true;

    const init = async () => {
      await refreshOrderFromServer(tableId);
      if (!getOrder(tableId)) {
        await ensureOrderFromCart(tableId);
      }
      setReady(true);
    };
    void init();
  }, [order, tableId, refreshOrderFromServer, ensureOrderFromCart, getOrder]);

  const loading = !ready;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center px-4">
        <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h12l1 12H4L5 9z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">
            {waiterMode ? "No bill here yet" : "Your cart is empty"}
          </h1>
          <p className="text-sm text-slate-500 px-4 max-w-sm mx-auto">
            {waiterMode
              ? "Your server adds items to the check. When it appears in our system, it will show up here — pull down to refresh or return shortly."
              : "Add some delicious items from the menu to get started."}
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => void refreshOrderFromServer(tableId)}
          >
            Refresh bill
          </button>
          <Link href={`/table/${tableId}/hub`} className="btn-primary w-full text-center">
            Table hub
          </Link>
          <Link href={`/table/${tableId}/menu`} className="block text-center text-sm text-slate-600">
            {waiterMode ? "Browse menu" : "Back to menu"}
          </Link>
        </div>
      </div>
    );
  }

  const remaining = order.remainingAmount;
  const cashPending = order.amountCashPending ?? 0;
  const awaitingCashConfirm = remaining <= 0.01 && cashPending > 0.01;

  if (awaitingCashConfirm) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center px-4">
        <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center ring-1 ring-amber-200">
          <svg className="h-10 w-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Waiter notified</h1>
          <p className="text-sm text-slate-600 max-w-xs mx-auto">
            Your server is coming to collect <span className="font-medium">{formatCurrency(cashPending, currency as Currency)}</span> in cash.
            Once confirmed, your order is complete.
          </p>
        </div>
        <Link href={`/table/${tableId}/hub`} className="btn-primary">
          Table hub
        </Link>
      </div>
    );
  }

  const isFullyPaid = remaining <= 0.01;

  if (isFullyPaid) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center px-4">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Bill Fully Paid</h1>
          <p className="text-sm text-slate-500">Your total of {formatCurrency(order.totalAmount, currency as Currency)} has been settled.</p>
        </div>
        <Link href={`/table/${tableId}/review`} className="btn-primary">
          Rate your visit
        </Link>
        <Link href={`/table/${tableId}/menu`} className="block text-center text-sm text-slate-600">
          Back to menu
        </Link>
      </div>
    );
  }

  const subtotal = order.totalAmount;
  const taxRate = 0;
  const taxAmount = Number((subtotal * taxRate / 100).toFixed(2));
  const effectiveTip = isCustomTip
    ? Number(parseFloat(customTip.replace(",", ".")).toFixed(2)) || 0
    : Number((remaining * tipPercent / 100).toFixed(2));
  const grandTotal = Number((remaining + taxAmount + effectiveTip).toFixed(2));

  const tipQuery = `&tipPercent=${isCustomTip ? 0 : tipPercent}&tipAmount=${effectiveTip.toFixed(2)}`;

  return (
    <div className="space-y-7 pb-14">
      <header className="flex items-center justify-between px-2">
        <Link href={`/table/${tableId}/hub`} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition hover:border-coral-mid/50 hover:shadow-lift" aria-label="Back to table hub">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold tracking-tight text-brand">Checkout</h1>
        <div className="w-10" />
      </header>

      {/* Bill Breakdown */}
      <div className="glass-card space-y-4 rounded-3xl p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Bill summary</p>

        <div className="space-y-2">
          {order.orderItems.map((item) => (
            <div key={item.menuItemId} className="flex items-center justify-between text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-medium">{item.name}</span>
                {item.quantityTotal > 1 && (
                  <span className="text-slate-400 ml-1">× {item.quantityTotal}</span>
                )}
                {item.quantityPaid > 0 && (
                  <span className="ml-2 text-xs text-green-600">({item.quantityPaid} paid)</span>
                )}
              </div>
              <span className="font-medium ml-4 shrink-0">
                {(item.unitPrice * item.quantityTotal).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal, currency as Currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Tax ({taxRate}%)</span>
            <span className="font-medium">{formatCurrency(taxAmount, currency as Currency)}</span>
          </div>
          {order.amountPaidByCard > 0 || order.amountCashPending > 0 ? (
            <>
              <div className="flex justify-between text-sm text-green-600">
                <span>Already paid</span>
                <span>−{formatCurrency(subtotal - remaining, currency as Currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Remaining</span>
                <span>{formatCurrency(remaining, currency as Currency)}</span>
              </div>
            </>
          ) : null}
          {order.amountCashPending > 0 && (
            <div className="flex justify-between text-sm text-accent">
              <span>Cash pending</span>
              <span>{formatCurrency(order.amountCashPending, currency as Currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tip Selector */}
      <div className="glass-card space-y-4 rounded-3xl p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Tip for your server</p>
        <div className="flex gap-2">
          {TIP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setTipPercent(opt.value); setIsCustomTip(false); }}
              className={`flex-1 rounded-2xl px-3 py-3 text-center text-sm font-bold transition-all ${
                !isCustomTip && tipPercent === opt.value
                  ? opt.recommended
                    ? "bg-accent text-white shadow-lg shadow-accent/25 ring-2 ring-coral-mid/80"
                    : "bg-brand text-white shadow-lg shadow-brand/20"
                  : "bg-slate-100 text-slate-600 hover:bg-coral-light/60"
              }`}
            >
              {opt.label}
              {opt.recommended && (
                <span className="mt-0.5 block text-[9px] font-semibold opacity-80">Recommended</span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCustomTip(true)}
            className={`flex-1 rounded-2xl px-3 py-3 text-center text-sm font-bold transition-all ${
              isCustomTip ? "bg-brand text-white shadow-lg shadow-brand/20" : "bg-slate-100 text-slate-600 hover:bg-coral-light/60"
            }`}
          >
            Custom
          </button>
        </div>
        {isCustomTip && (
          <input
            type="text"
            inputMode="decimal"
            placeholder={`Enter tip amount (${currency})`}
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none ring-brand/0 transition focus:border-accent/40 focus:ring-2 focus:ring-accent/25"
            value={customTip}
            onChange={(e) => setCustomTip(e.target.value)}
          />
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Tip</span>
          <span className="font-medium">{formatCurrency(effectiveTip, currency as Currency)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-bold tracking-tight text-brand">
          <span>Grand total</span>
          <span className="text-accent">{formatCurrency(grandTotal, currency as Currency)}</span>
        </div>
      </div>

      {/* Payment Options */}
      <div className="space-y-3">
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Payment options</p>

        <Link
          href={`/table/${tableId}/checkout/method?type=full&amount=${remaining.toFixed(2)}${tipQuery}`}
          className="glass-card group flex items-center justify-between rounded-3xl p-5 transition-all hover:shadow-lift active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/20">
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
          href={`/table/${tableId}/checkout/percentage?tipPercent=${isCustomTip ? 0 : tipPercent}&tipAmount=${effectiveTip.toFixed(2)}`}
          className="glass-card group flex items-center justify-between rounded-3xl p-5 transition-all hover:shadow-lift active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-soft">
              <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold">Split by People</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tight">Divide equally among diners</p>
            </div>
          </div>
          <svg className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href={`/table/${tableId}/checkout/items?tipPercent=${isCustomTip ? 0 : tipPercent}`}
          className="glass-card group flex items-center justify-between rounded-3xl p-5 transition-all hover:shadow-lift active:scale-[0.98]"
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
