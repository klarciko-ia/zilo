"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { usePayment } from "@/lib/payment-context";
import type { GuestOrderMode, VenueFlow } from "@/lib/types";

type Props = {
  tableId: string;
  restaurantName: string;
  tableNumber: number;
  venueFlow: VenueFlow;
  guestOrderMode: GuestOrderMode;
};

export function TableHubClient({
  tableId,
  restaurantName,
  tableNumber,
  venueFlow,
  guestOrderMode,
}: Props) {
  const { getCartLines, clearCart } = useCart();
  const { refreshOrderFromServer, getOrder } = usePayment();
  const lines = getCartLines(tableId);
  const order = getOrder(tableId);
  const [kitchenSending, setKitchenSending] = useState(false);
  const [kitchenFlash, setKitchenFlash] = useState<string | null>(null);
  const [kitchenCooldownUntil, setKitchenCooldownUntil] = useState(0);
  const waiterMode = guestOrderMode === "waiter_service";

  useEffect(() => {
    void refreshOrderFromServer(tableId);
  }, [refreshOrderFromServer, tableId]);

  const remaining = order?.remainingAmount ?? null;
  const cashPending = order?.amountCashPending ?? 0;
  const awaitingCashConfirm =
    order != null && (remaining ?? 1) <= 0.01 && cashPending > 0.01;
  const fullyPaid =
    order != null &&
    (remaining ?? 1) <= 0.01 &&
    !awaitingCashConfirm;

  const sendToKitchen = async () => {
    if (
      !lines.length ||
      kitchenSending ||
      Date.now() < kitchenCooldownUntil
    )
      return;
    setKitchenSending(true);
    setKitchenFlash(null);
    try {
      const res = await fetch(
        `/api/tables/${encodeURIComponent(tableId)}/kitchen`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: lines.map((l) => ({
              menuItemId: l.menuItemId,
              name: l.name,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
            })),
          }),
        }
      );
      const data = (await res.json()) as {
        error?: string;
        hint?: string;
        details?: string;
      };
      if (!res.ok) {
        const parts = [data.error, data.hint, data.details].filter(Boolean);
        setKitchenFlash(
          parts.length ? parts.join(" ") : "Could not send to kitchen."
        );
        return;
      }
      clearCart(tableId);
      await refreshOrderFromServer(tableId);
      setKitchenCooldownUntil(Date.now() + 45_000);
      setKitchenFlash("Sent to the kitchen.");
      window.setTimeout(() => setKitchenFlash(null), 4000);
    } catch {
      setKitchenFlash("Check your connection and try again.");
    } finally {
      setKitchenSending(false);
    }
  };

  return (
    <div className="space-y-10 px-4 pb-16 pt-6">
      <header className="flex flex-col items-center text-center space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          {restaurantName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-brand">
          Table {tableNumber}
        </h1>
        <p className="text-sm text-slate-600">
          {waiterMode
            ? "Pay or split the bill, leave a review when you’re done, or browse the menu."
            : "Pay your bill, add more from the menu, or send this round to the kitchen."}
        </p>
        {venueFlow === "pay_first" ? (
          <p className="text-xs text-amber-700/90">
            Pay-first venues may adjust this flow later.
          </p>
        ) : null}
      </header>

      <div className="mx-auto flex max-w-md flex-col gap-3">
        <Link
          href={`/table/${tableId}/checkout`}
          className="glass-card flex items-center justify-between rounded-3xl border-2 border-brand/20 bg-white/95 p-5 shadow-soft transition hover:border-accent/40 hover:shadow-lift active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/25">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-brand">View bill / Pay</p>
              <p className="text-[10px] font-medium uppercase tracking-tight text-slate-500">
                Split, tips &amp; methods
              </p>
            </div>
          </div>
          <svg
            className="h-5 w-5 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>

        {fullyPaid ? (
          <Link
            href={`/table/${tableId}/review`}
            className="glass-card flex items-center justify-between rounded-3xl border border-accent/40 bg-coral-light/40 p-5 shadow-soft transition hover:shadow-lift active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-md shadow-accent/25">
                <span className="text-2xl" aria-hidden>
                  ★
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-brand">Rate your visit</p>
                <p className="text-[10px] font-medium uppercase tracking-tight text-slate-600">
                  Bill settled — tell us how it went
                </p>
              </div>
            </div>
            <svg
              className="h-5 w-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        ) : order && !awaitingCashConfirm ? (
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-center text-xs text-slate-600">
            When your bill is fully paid, you&apos;ll be able to leave a review
            right here.
          </div>
        ) : null}

        {awaitingCashConfirm ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-center text-xs text-amber-950">
            Cash payment is pending staff confirmation — open{" "}
            <Link href={`/table/${tableId}/checkout`} className="font-semibold underline">
              checkout
            </Link>{" "}
            for details.
          </p>
        ) : null}

        <Link
          href={`/table/${tableId}/menu`}
          className="glass-card flex items-center justify-between rounded-3xl border border-slate-100/90 p-5 shadow-soft transition hover:shadow-lift active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-brand shadow-soft">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-brand">
                {waiterMode ? "View menu" : "Add more items"}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-tight text-slate-500">
                {waiterMode
                  ? "Browse only — order with your server"
                  : "Cart stays until you send to kitchen"}
              </p>
            </div>
          </div>
          <svg
            className="h-5 w-5 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>

        {!waiterMode ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={sendToKitchen}
              disabled={
                !lines.length ||
                kitchenSending ||
                Date.now() < kitchenCooldownUntil
              }
              className="glass-card flex w-full items-center justify-between rounded-3xl border border-slate-200/90 bg-white/95 p-5 text-left shadow-soft transition hover:border-accent/40 hover:bg-coral-light/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-brand">
                    Send to kitchen
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-tight text-slate-500">
                    {lines.length
                      ? `${lines.reduce((s, l) => s + l.quantity, 0)} items in cart`
                      : "Add items from the menu first"}
                  </p>
                </div>
              </div>
              {kitchenSending ? (
                <span className="text-xs font-semibold text-slate-500">
                  Sending…
                </span>
              ) : Date.now() < kitchenCooldownUntil ? (
                <span className="text-xs font-semibold text-slate-500">
                  Wait{" "}
                  {Math.max(
                    1,
                    Math.ceil((kitchenCooldownUntil - Date.now()) / 1000)
                  )}
                  s
                </span>
              ) : null}
            </button>
            {kitchenFlash ? (
              <p className="text-center text-xs font-medium text-slate-600">
                {kitchenFlash}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-center text-xs text-slate-500">
        <Link href={`/table/${tableId}/menu`} className="underline">
          Menu
        </Link>
        {" · "}
        <Link href={`/table/${tableId}`} className="underline">
          Table home
        </Link>
      </p>
    </div>
  );
}
