"use client";

import Link from "next/link";
import type { GuestOrderMode, VenueFlow } from "@/lib/types";

type Props = {
  tableId: string;
  restaurantName: string;
  tableNumber: number;
  venueFlow: VenueFlow;
  guestOrderMode: GuestOrderMode;
};

export function TableLandingClient({
  tableId,
  restaurantName,
  tableNumber,
  venueFlow,
  guestOrderMode,
}: Props) {
  const waiterMode = guestOrderMode === "waiter_service";

  return (
    <div className="space-y-10 px-6 pb-16 pt-8">
      <div className="bg-luxe-wash" aria-hidden />

      <header className="flex min-h-[40vh] flex-col items-center justify-center text-center space-y-4">
        <div className="inline-block rounded-full border border-slate-200/80 bg-slate-50/90 px-4 py-1.5 backdrop-blur-sm">
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
            {restaurantName}
          </p>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-brand">
          Table <span className="text-accent">{tableNumber}</span>
        </h1>
        {waiterMode ? (
          <p className="max-w-sm text-sm leading-relaxed text-slate-600">
            Browse the menu here. Order with your server — then pay, split the
            bill, or leave a review from the table hub.
          </p>
        ) : (
          <p className="max-w-sm text-sm leading-relaxed text-slate-600">
            Browse the menu, confirm your order, then use the hub to pay, split,
            or send rounds to the kitchen.
          </p>
        )}
        {venueFlow === "pay_first" ? (
          <p className="text-xs text-amber-700/90">
            This venue uses pay-first mode; the full flow may differ.
          </p>
        ) : null}
      </header>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <Link
          href={`/table/${tableId}/menu`}
          className="btn-primary flex w-full items-center justify-center gap-2 py-4 text-base font-bold shadow-[0_24px_48px_-14px_rgba(26,26,46,0.45)]"
        >
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
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
          {waiterMode ? "View menu" : "Menu"}
        </Link>

        <Link
          href={`/table/${tableId}/hub`}
          className="flex w-full items-center justify-center gap-2 rounded-[2rem] border-2 border-brand/25 bg-white/90 py-4 text-base font-bold text-brand shadow-soft backdrop-blur-sm transition hover:border-accent/50 hover:bg-coral-light/20"
        >
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
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Bill, pay &amp; review
        </Link>
      </div>
    </div>
  );
}
