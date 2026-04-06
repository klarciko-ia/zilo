"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import type {
  GuestOrderMode,
  MenuCategory,
  MenuItem,
  VenueFlow,
} from "@/lib/types";
import { useEffect, useRef, useState } from "react";

type Props = {
  tableId: string;
  restaurantName: string;
  tableNumber: number;
  categories: MenuCategory[];
  items: MenuItem[];
  venueFlow: VenueFlow;
  guestOrderMode: GuestOrderMode;
};

export function TableMenuCartClient({
  tableId,
  restaurantName,
  tableNumber,
  categories,
  items,
  venueFlow,
  guestOrderMode,
}: Props) {
  const { addItem, getCartLines, getSubtotal, updateQuantity } = useCart();
  const waiterMode = guestOrderMode === "waiter_service";
  const lines = getCartLines(tableId);
  const subtotal = getSubtotal(tableId);
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [waiterSending, setWaiterSending] = useState(false);
  const [waiterFlash, setWaiterFlash] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [, setCooldownTick] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (cooldownUntil <= 0 || Date.now() >= cooldownUntil) return;
    const id = window.setInterval(() => setCooldownTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const callWaiter = async () => {
    if (waiterSending || Date.now() < cooldownUntil) return;
    setWaiterSending(true);
    setWaiterFlash(null);
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(tableId)}/waiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        error?: string;
        deduped?: boolean;
        message?: string;
        hint?: string;
        details?: string;
      };
      if (!res.ok) {
        const parts = [data.error, data.hint, data.details].filter(Boolean);
        setWaiterFlash(parts.length ? parts.join(" ") : "Could not reach the server.");
        return;
      }
      setCooldownUntil(Date.now() + 60_000);
      setWaiterFlash(
        data.deduped
          ? data.message ?? "Staff already has your table on the list."
          : "A server has been notified."
      );
      window.setTimeout(() => setWaiterFlash(null), 5000);
    } catch {
      setWaiterFlash("Check your connection and try again.");
    } finally {
      setWaiterSending(false);
    }
  };

  const getQuantity = (itemId: string) => {
    const line = lines.find((l) => l.menuItemId === itemId);
    return line?.quantity ?? 0;
  };

  const handleScrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const el = sectionRefs.current[catId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-10 pb-40 pt-4">
      <div className="bg-luxe-wash" aria-hidden />

      <header className="flex items-start justify-between gap-3 px-2">
        <Link
          href={`/table/${tableId}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition hover:border-coral-mid/50"
          aria-label="Back to table home"
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
        <div className="flex min-w-0 flex-1 flex-col items-center text-center space-y-3">
          <div className="inline-block rounded-full border border-slate-200/80 bg-slate-50/90 px-4 py-1.5 backdrop-blur-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
              {restaurantName}
            </p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
            Table <span className="text-accent">{tableNumber}</span>
          </h1>
        </div>
        <div className="h-10 w-10 shrink-0" aria-hidden />
      </header>

      {waiterMode ? (
        <div className="mx-4 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-4 py-3 text-center text-sm text-slate-700">
          <p className="font-semibold text-brand">Order with your server</p>
          <p className="mt-1 text-xs text-slate-600">
            This menu is for browsing only. Call a server to order, then open
            the hub to pay, split, or review.
          </p>
        </div>
      ) : null}

      {venueFlow === "pay_first" ? (
        <p className="px-4 text-center text-xs text-amber-700/90">
          This venue uses pay-first mode; the full flow may differ.
        </p>
      ) : null}

      <div className="space-y-2 px-4">
        <button
          type="button"
          onClick={callWaiter}
          disabled={waiterSending || Date.now() < cooldownUntil}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 py-3.5 text-sm font-semibold text-brand shadow-soft backdrop-blur-sm transition hover:border-accent/40 hover:bg-coral-light/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {waiterSending
            ? "Sending…"
            : Date.now() < cooldownUntil
              ? `Wait ${Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000))}s`
              : "Call waiter"}
        </button>
        {waiterFlash ? (
          <p className="text-center text-xs font-medium text-slate-600">{waiterFlash}</p>
        ) : null}
      </div>

      <nav className="sticky top-6 z-50 flex gap-3 overflow-x-auto px-4 py-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleScrollToCategory(cat.id)}
            type="button"
            className={`whitespace-nowrap rounded-2xl border px-6 py-3 text-xs font-bold shadow-soft transition-all active:scale-[0.97] ${
              activeCategory === cat.id
                ? "chip-active border-transparent"
                : "border-slate-200/70 bg-white/85 text-slate-700 backdrop-blur-md hover:border-coral-mid/60 hover:bg-coral-light/40"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      <section className="space-y-12 px-2">
        {categories.map((category, catIdx) => (
          <div
            key={category.id}
            ref={(el) => { sectionRefs.current[category.id] = el; }}
            id={`category-${category.id}`}
            className="space-y-6 scroll-mt-24"
          >
            <div className="flex items-center gap-4 px-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                {category.name}
              </h3>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <div className="grid gap-6">
              {items
                .filter((item) => item.categoryId === category.id)
                .map((item, idx) => {
                  const qty = mounted ? getQuantity(item.id) : 0;
                  const soldOut = item.isAvailable === false;
                  return (
                    <div
                      key={item.id}
                      className={`reveal-item glass-card group relative flex flex-col overflow-hidden rounded-[2.5rem] p-2 transition-all hover:shadow-lift hover:ring-2 hover:ring-accent/20 ${soldOut ? "opacity-50" : ""}`}
                      style={{ animationDelay: `${(catIdx * 3 + idx) * 0.1}s` }}
                    >
                      <div className="flex items-center gap-5 p-4">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-inner-glow transition-transform duration-500 group-hover:scale-[1.03]">
                          <div className="absolute inset-0 z-10 bg-gradient-to-br from-transparent to-brand/[0.04]" />
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-200">
                              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                          )}
                          {soldOut && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 rounded-2xl">
                              <span className="rounded-full bg-slate-700/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                Sold out
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-lg font-bold leading-tight tracking-tight ${soldOut ? "text-slate-400 line-through" : "text-brand"}`}>{item.name}</p>
                            {soldOut && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                86&apos;d
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{item.description}</p>
                          <div className="pt-2 flex items-center justify-between">
                            <p className={`price-tag text-base font-bold ${soldOut ? "text-slate-400" : "text-brand"}`}>{item.price} <span className="text-[10px] font-medium text-slate-400">MAD</span></p>

                            {soldOut ? (
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-400 cursor-not-allowed">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 12H6" />
                                </svg>
                              </span>
                            ) : waiterMode ? null : qty > 0 ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all active:scale-75"
                                  onClick={() => updateQuantity(tableId, item.id, qty - 1)}
                                >
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 12H6" />
                                  </svg>
                                </button>
                                <span className="w-6 text-center text-sm font-black">{qty}</span>
                                <button
                                  type="button"
                                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-brand/20 transition-all active:scale-90 hover:bg-accent"
                                  onClick={() => addItem(tableId, { id: item.id, name: item.name, price: item.price })}
                                >
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v12m6-6H6" />
                                  </svg>
                                </button>
                              </div>
                            ) : !waiterMode ? (
                              <button
                                type="button"
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/20 transition-all active:scale-90 hover:bg-accent"
                                onClick={() => addItem(tableId, { id: item.id, name: item.name, price: item.price })}
                              >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v12m6-6H6" />
                                </svg>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </section>

      {mounted && waiterMode ? (
        <div className="fixed bottom-8 left-0 right-0 z-[100] mx-auto max-w-md px-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <Link
            href={`/table/${tableId}/hub`}
            className="flex w-full items-center justify-center gap-2 rounded-[2rem] bg-brand py-4 text-sm font-bold text-white shadow-[0_28px_56px_-14px_rgba(26,26,46,0.45)] ring-1 ring-white/15 transition active:scale-[0.98]"
          >
            Bill, pay &amp; review
          </Link>
        </div>
      ) : null}

      {mounted && !waiterMode && lines.length > 0 ? (
        <div className="fixed bottom-8 left-0 right-0 z-[100] mx-auto flex max-w-md flex-col gap-2 px-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <Link
            href={`/table/${tableId}/order-review`}
            className="group flex w-full items-center justify-between rounded-[2.5rem] bg-brand p-3 pl-8 shadow-[0_28px_56px_-14px_rgba(26,26,46,0.45)] ring-1 ring-white/15 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-accent opacity-35 blur-md transition-opacity group-hover:opacity-70" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xs font-bold text-white shadow-md shadow-accent/30">
                  {lines.reduce((s, l) => s + l.quantity, 0)}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Next step</span>
                <span className="text-sm font-semibold text-white">Review order</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="price-tag text-xl font-bold text-white">{subtotal.toFixed(2)} MAD</span>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand transition-colors group-hover:bg-accent group-hover:text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
