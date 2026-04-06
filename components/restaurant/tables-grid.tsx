"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminSession } from "@/lib/admin-session";
import { formatCurrency } from "@/lib/format-currency";
import { deriveTableStatus } from "@/lib/order-lifecycle";
import type { Currency, TableDisplayStatus } from "@/lib/types";
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

  const fetchTables = useCallback(() => {
    const session = getAdminSession();
    if (!session?.restaurantId) return;

    fetch(
      `/api/restaurant/tables?restaurantId=${session.restaurantId}&adminId=${session.id}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tables) setTables(data.tables);
        if (data?.restaurant?.currency) {
          setCurrency(data.restaurant.currency as Currency);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-400">
        No tables found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {tables.map((table) => {
        const status = deriveTableStatus(table.order?.status ?? null);
        const style = STATUS_STYLES[status];

        return (
          <button
            key={table.id}
            type="button"
            onClick={() => setSelectedTable(table)}
            className={`flex min-h-[7rem] flex-col items-start rounded-xl border p-3 text-left transition active:scale-[0.97] ${style.card}`}
          >
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
      })}

      {selectedTable && (
        <TableDetail
          table={selectedTable}
          currency={currency}
          onClose={() => setSelectedTable(null)}
          onStatusChange={() => {
            setSelectedTable(null);
            fetchTables();
          }}
        />
      )}
    </div>
  );
}
