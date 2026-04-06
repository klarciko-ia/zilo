"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminSession } from "@/lib/admin-session";
import { formatCurrency } from "@/lib/format-currency";
import { deriveTableStatus } from "@/lib/order-lifecycle";
import type { Currency, TableDisplayStatus } from "@/lib/types";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { TableDetail } from "./table-detail";
import type { TableData } from "./table-detail";

const STATUS_STYLES: Record<
  TableDisplayStatus,
  { card: string; badge: string; label: string }
> = {
  free: {
    card: "border-slate-200 bg-slate-100",
    badge: "bg-slate-200 text-slate-500",
    label: "Free",
  },
  ordering: {
    card: "border-blue-200 bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    label: "Ordering",
  },
  confirmed: {
    card: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    label: "Confirmed",
  },
  awaiting_payment: {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    label: "Awaiting payment",
  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

export function TablesGrid() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [unseenTables, setUnseenTables] = useState<Set<string>>(() => new Set());

  const fetchTables = useCallback((): Promise<TableData[] | null> => {
    const session = getAdminSession();
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
          return data.tables as TableData[];
        }
        return null;
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const session = getAdminSession();
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

  const gridBody = loading ? (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
        />
      ))}
    </>
  ) : tables.length === 0 ? (
    <p className="col-span-full py-12 text-center text-sm text-slate-400">
      No tables found.
    </p>
  ) : (
    tables.map((table) => {
      const status = deriveTableStatus(table.order?.status ?? null);
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
          className={`relative flex min-h-[7rem] flex-col items-start rounded-xl border p-3 text-left transition active:scale-[0.97] ${style.card}`}
        >
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
            <div className="mt-auto pt-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">
                {formatCurrency(table.order.total, currency as Currency)}
              </span>
              {" · "}
              {timeAgo(table.order.createdAt)}
            </div>
          )}
        </button>
      );
    })
  );

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {gridBody}
      </div>

      {selectedTable && (
        <TableDetail
          table={selectedTable}
          currency={currency}
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
