"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRestaurantSession } from "@/lib/admin-session";
import { formatCurrency } from "@/lib/format-currency";
import { deriveTableStatus } from "@/lib/order-lifecycle";
import type { Currency, TableDisplayStatus } from "@/lib/types";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { TableDetail } from "./table-detail";
import type { TableData } from "./table-detail";
import {
  Bell, X, Filter,
  CreditCard, Banknote, CheckCircle2, Clock,
} from "lucide-react";

type WaiterCall = {
  id: string;
  tableSlug: string;
  note: string | null;
  createdAt: string;
};

type Stats = {
  totalOrdersToday: number;
  revenueToday: number;
  pendingCashToday: number;
};

type OrderHistoryItem = {
  id: string;
  tableSlug: string;
  total: number;
  itemCount: number;
  createdAt: string;
};

type FilterType = "all" | "active" | "free" | "cash";

const STATUS_STYLES: Record<
  TableDisplayStatus,
  { card: string; badge: string; label: string }
> = {
  free: {
    card: "border-[#e3c8af]/30 bg-white",
    badge: "bg-slate-100 text-slate-500",
    label: "Free",
  },
  ordering: {
    card: "border-blue-200 bg-blue-50/60",
    badge: "bg-blue-100 text-blue-700",
    label: "Ordering",
  },
  confirmed: {
    card: "border-emerald-200 bg-emerald-50/60",
    badge: "bg-emerald-100 text-emerald-700",
    label: "Confirmed",
  },
  awaiting_payment: {
    card: "border-amber-200 bg-amber-50/60",
    badge: "bg-amber-100 text-amber-700",
    label: "Awaiting payment",
  },
};

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "free", label: "Free" },
  { key: "cash", label: "Cash Pending" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* audio not available */ }
}

export function TablesGrid() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [guestOrderMode, setGuestOrderMode] = useState<"self_service" | "waiter_service">("waiter_service");
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [unseenTables, setUnseenTables] = useState<Set<string>>(() => new Set());
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrdersToday: 0, revenueToday: 0, pendingCashToday: 0 });
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showHistory, setShowHistory] = useState(false);
  const prevOrderCountRef = useRef(0);
  const prevWaiterCountRef = useRef(0);

  const fetchTables = useCallback((): Promise<TableData[] | null> => {
    const session = getRestaurantSession();
    if (!session?.restaurantId) {
      return Promise.resolve(null);
    }

    return fetch(
      `/api/restaurant/tables?restaurantId=${session.restaurantId}&adminId=${session.id}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tables) {
          setTables(data.tables);
          if (data?.restaurant?.currency) {
            setCurrency(data.restaurant.currency as Currency);
          }
          if (data?.restaurant?.guestOrderMode) {
            setGuestOrderMode(data.restaurant.guestOrderMode);
          }
          if (data?.waiterCalls) setWaiterCalls(data.waiterCalls);
          if (data?.stats) setStats(data.stats);
          if (data?.orderHistory) setOrderHistory(data.orderHistory);

          const activeOrders = (data.tables as TableData[]).filter((t) => t.order).length;
          const waiterCount = (data.waiterCalls as WaiterCall[])?.length ?? 0;

          if (activeOrders > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
            playNotificationSound();
          }
          if (waiterCount > prevWaiterCountRef.current && prevWaiterCountRef.current > 0) {
            playNotificationSound();
          }
          prevOrderCountRef.current = activeOrders;
          prevWaiterCountRef.current = waiterCount;

          return data.tables as TableData[];
        }
        return null;
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void fetchTables();
    const interval = setInterval(() => { void fetchTables(); }, 5000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const session = getRestaurantSession();
    if (!supabase || !session?.restaurantId) return;

    const channel = supabase
      .channel(`table-orders-realtime-${session.restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_orders",
          filter: `restaurant_id=eq.${session.restaurantId}`,
        },
        (payload) => {
          const rowNew = payload.new as { table_id?: string } | null;
          const rowOld = payload.old as { table_id?: string } | null;
          const tableId = rowNew?.table_id ?? rowOld?.table_id;
          if (tableId) {
            setUnseenTables((prev) => new Set(prev).add(tableId));
          }

          if ("vibrate" in navigator) {
            navigator.vibrate(200);
          }
          playNotificationSound();

          const isInsert = payload.eventType === "INSERT";
          void fetchTables().then((list) => {
            if (isInsert && list && tableId) {
              const t = list.find((x) => x.id === tableId);
              if (t) {
                setToast(`Table ${t.tableNumber} — New order!`);
              }
            }
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTables]);

  async function dismissCall(callId: string) {
    setWaiterCalls((prev) => prev.filter((c) => c.id !== callId));
    await fetch(`/api/restaurant/waiter-calls/${callId}/dismiss`, { method: "POST" }).catch(() => {});
  }

  const filteredTables = tables.filter((table) => {
    const o = table.order;
    const status = deriveTableStatus(o?.status ?? null, o?.pendingCash ?? 0, o?.confirmedPaid ?? 0);
    switch (filter) {
      case "active": return status !== "free";
      case "free": return status === "free";
      case "cash": return (o?.pendingCash ?? 0) > 0.01;
      default: return true;
    }
  });

  const gridBody = loading ? (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-xl border border-[#e3c8af]/30 bg-[#f0dbc8]/20"
        />
      ))}
    </>
  ) : filteredTables.length === 0 ? (
    <p className="col-span-full py-12 text-center text-sm text-slate-400">
      {filter === "all" ? "No tables found." : `No ${filter} tables.`}
    </p>
  ) : (
    filteredTables.map((table) => {
      const o = table.order;
      const status = deriveTableStatus(o?.status ?? null, o?.pendingCash ?? 0, o?.confirmedPaid ?? 0);
      const style = STATUS_STYLES[status];
      const hasUnseen = unseenTables.has(table.id);

      return (
        <button
          key={table.id}
          type="button"
          onClick={() => {
            setUnseenTables((prev) => {
              if (!prev.has(table.id)) return prev;
              const next = new Set(prev);
              next.delete(table.id);
              return next;
            });
            setSelectedTable(table);
          }}
          className={`relative flex min-h-[8rem] flex-col items-start rounded-xl border p-3 text-left transition active:scale-[0.97] ${style.card}`}
        >
          {/* Payment status icon top-right */}
          {table.order && (
            <span className="absolute right-2.5 top-2.5">
              {table.order.status === "paid" ? (
                <CheckCircle2 size={16} className="text-emerald-500" />
              ) : (table.order.pendingCash ?? 0) > 0.01 ? (
                <Banknote size={16} className="text-orange-500" />
              ) : (table.order.confirmedPaid ?? 0) > 0.01 ? (
                <CreditCard size={16} className="text-amber-500" />
              ) : (
                <Clock size={16} className="text-blue-400" />
              )}
            </span>
          )}
          {hasUnseen && (
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
            </span>
          )}
          <span className="text-2xl font-bold text-slate-800">
            #{table.tableNumber}
          </span>
          <span
            className={`mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}
          >
            {style.label}
          </span>
          {table.order && (
            <div className="mt-auto space-y-0.5 pt-2 w-full">
              {table.order.items?.slice(0, 3).map((item, i) => (
                <p key={i} className="truncate text-[11px] text-slate-500">
                  {item.quantity}× {item.name}
                </p>
              ))}
              {(table.order.items?.length ?? 0) > 3 && (
                <p className="text-[11px] text-slate-400">
                  +{table.order.items.length - 3} more
                </p>
              )}
              <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {formatCurrency(table.order.total, currency)}
                </span>
                <span>{timeAgo(table.order.createdAt)}</span>
              </div>
            </div>
          )}
        </button>
      );
    })
  );

  const activeCount = tables.filter((t) => t.order).length;

  return (
    <>
      {toast ? (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-blue-600 px-4 py-3 text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}

      {/* Stats Bar */}
      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-[#e3c8af]/30 bg-white p-2.5 text-center sm:p-3">
          <p className="text-[10px] text-slate-500 sm:text-xs">Orders today</p>
          <p className="text-base font-bold text-[#062946] sm:text-lg">{stats.totalOrdersToday}</p>
        </div>
        <div className="rounded-xl border border-[#e3c8af]/30 bg-white p-2.5 text-center sm:p-3">
          <p className="text-[10px] text-slate-500 sm:text-xs">Revenue today</p>
          <p className="text-base font-bold text-emerald-600 sm:text-lg">{formatCurrency(stats.revenueToday, currency)}</p>
        </div>
        <div className="rounded-xl border border-[#e3c8af]/30 bg-white p-2.5 text-center sm:p-3">
          <p className="text-[10px] text-slate-500 sm:text-xs">Pending cash</p>
          <p className="text-base font-bold text-amber-600 sm:text-lg">{formatCurrency(stats.pendingCashToday, currency)}</p>
        </div>
      </div>

      {/* Waiter Calls */}
      {waiterCalls.length > 0 && (
        <div className="mb-4 space-y-2">
          {waiterCalls.map((call) => (
            <div
              key={call.id}
              className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
                  <Bell size={16} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-orange-900">
                    Table {call.tableSlug.split("-").pop()} — Waiter requested
                  </p>
                  <p className="text-xs text-orange-700">
                    {call.note ? call.note + " · " : ""}{timeAgo(call.createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissCall(call.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-orange-400 transition hover:bg-orange-100 hover:text-orange-600"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 sm:gap-2">
        <Filter size={14} className="hidden text-slate-400 sm:block" />
        {FILTER_OPTIONS.map((opt) => {
          const count = opt.key === "all"
            ? tables.length
            : opt.key === "active"
              ? activeCount
              : opt.key === "free"
                ? tables.length - activeCount
                : tables.filter((t) => (t.order?.pendingCash ?? 0) > 0.01).length;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition sm:px-3 sm:text-xs ${
                filter === opt.key
                  ? "bg-[#062946] text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-[#e3c8af]/40 hover:bg-slate-50"
              }`}
            >
              {opt.label} ({count})
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="ml-auto rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-[#e3c8af]/40 hover:bg-slate-50 sm:px-3 sm:text-xs"
        >
          {showHistory ? "Hide history" : "History"}
        </button>
      </div>

      {/* Order History */}
      {showHistory && (
        <div className="mb-4 rounded-xl border border-[#e3c8af]/30 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Completed Orders</h3>
          {orderHistory.length === 0 ? (
            <p className="text-sm text-slate-400">No completed orders yet.</p>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {orderHistory.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">Table {o.tableSlug.split("-").pop()}</span>
                    <span className="ml-2 text-slate-400">{o.itemCount} items</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-800">{formatCurrency(o.total, currency)}</span>
                    <span className="ml-2 text-xs text-slate-400">{timeAgo(o.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
        {gridBody}
      </div>

      {selectedTable && (
        <TableDetail
          table={selectedTable}
          currency={currency}
          guestOrderMode={guestOrderMode}
          onClose={() => setSelectedTable(null)}
          onStatusChange={() => {
            setSelectedTable(null);
            void fetchTables();
          }}
        />
      )}
    </>
  );
}
