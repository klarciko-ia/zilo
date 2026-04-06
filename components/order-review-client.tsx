"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/lib/cart-context";
import { getAlsoLikeMenuItems } from "@/lib/order-review-suggestions";
import type { MenuItem } from "@/lib/types";

type Props = {
  tableId: string;
  tableNumber: number;
  restaurantName: string;
  items: MenuItem[];
};

export function OrderReviewClient({
  tableId,
  tableNumber,
  restaurantName,
  items,
}: Props) {
  const { getCartLines, getSubtotal, updateQuantity, removeItem, addItem } =
    useCart();
  const lines = getCartLines(tableId);
  const subtotal = getSubtotal(tableId);

  const suggestions = useMemo(
    () => getAlsoLikeMenuItems(lines, items, 4),
    [lines, items]
  );

  if (!lines.length) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center space-y-5 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
          <svg
            className="h-8 w-8 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h12l1 12H4L5 9z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-brand">Nothing to review yet</h1>
          <p className="text-sm text-slate-600">
            Add items from the menu, then come back to confirm your order before
            paying.
          </p>
        </div>
        <Link
          href={`/table/${tableId}/menu`}
          className="rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25"
        >
          Back to menu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-28 pt-2">
      <header className="flex items-center justify-between px-1">
        <Link
          href={`/table/${tableId}/menu`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition hover:border-coral-mid/50"
          aria-label="Back to menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {restaurantName}
          </p>
          <h1 className="text-lg font-bold tracking-tight text-brand">
            Review your order
          </h1>
          <p className="text-xs text-slate-500">Table {tableNumber}</p>
        </div>
        <div className="w-10" />
      </header>

      <section className="glass-card space-y-4 rounded-3xl p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Your selection
        </p>
        <p className="text-sm text-slate-600">
          Adjust quantities or remove anything, then confirm to choose pay,
          add more, or send to the kitchen.
        </p>
        <ul className="space-y-3">
          {lines.map((line) => (
            <li
              key={line.menuItemId}
              className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-brand">{line.name}</p>
                  <p className="text-xs text-slate-500">
                    {line.unitPrice.toFixed(2)} MAD each
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-red-600"
                  onClick={() => removeItem(tableId, line.menuItemId)}
                >
                  Remove
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition active:scale-95"
                    onClick={() =>
                      updateQuantity(
                        tableId,
                        line.menuItemId,
                        line.quantity - 1
                      )
                    }
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-bold">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-brand text-white transition active:scale-95"
                    onClick={() =>
                      updateQuantity(
                        tableId,
                        line.menuItemId,
                        line.quantity + 1
                      )
                    }
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm font-bold text-brand">
                  {(line.unitPrice * line.quantity).toFixed(2)} MAD
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-sm font-medium text-slate-600">Subtotal</span>
          <span className="text-lg font-bold text-brand">
            {subtotal.toFixed(2)} MAD
          </span>
        </div>
      </section>

      {suggestions.length > 0 ? (
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              Often enjoyed together
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Guests who ordered similar items also liked these — add any before
              you confirm.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((item) => (
              <div
                key={item.id}
                className="glass-card flex flex-col overflow-hidden rounded-2xl border border-slate-100/80"
              >
                <div className="relative h-28 bg-slate-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <svg
                        className="h-10 w-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="font-semibold leading-tight text-brand">
                    {item.name}
                  </p>
                  <p className="line-clamp-2 text-xs text-slate-500">
                    {item.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-brand">
                      {item.price.toFixed(2)} MAD
                    </span>
                    <button
                      type="button"
                      className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm"
                      onClick={() =>
                        addItem(tableId, {
                          id: item.id,
                          name: item.name,
                          price: item.price,
                        })
                      }
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="fixed bottom-6 left-0 right-0 z-50 px-6">
        <Link
          href={`/table/${tableId}/hub`}
          className="mx-auto flex max-w-md items-center justify-center rounded-[2rem] bg-brand py-4 text-sm font-bold text-white shadow-[0_20px_40px_-12px_rgba(26,26,46,0.45)] ring-1 ring-white/15 transition active:scale-[0.98]"
        >
          Confirm
        </Link>
      </div>
    </div>
  );
}
