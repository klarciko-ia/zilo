"use client";

import { useState } from "react";
import { getAdminSession } from "@/lib/admin-session";
import { formatCurrency } from "@/lib/format-currency";
import type { Currency, OrderStatus } from "@/lib/types";

type OrderItem = { name: string; quantity: number; unitPrice: number };

type TableOrder = {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

export type TableData = {
  id: string;
  tableNumber: number;
  qrSlug: string;
  order: TableOrder | null;
};

type Props = {
  table: TableData;
  currency: string;
  onClose: () => void;
  onStatusChange: () => void;
};

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-yellow-100 text-yellow-700", label: "Pending" },
  confirmed: {
    className: "bg-emerald-100 text-emerald-700",
    label: "Confirmed",
  },
  awaiting_payment: {
    className: "bg-amber-100 text-amber-700",
    label: "Awaiting Payment",
  },
  pending_cash: {
    className: "bg-orange-100 text-orange-700",
    label: "Pending Cash",
  },
  paid: { className: "bg-slate-100 text-slate-600", label: "Paid" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

export function TableDetail({
  table,
  currency,
  onClose,
  onStatusChange,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function transitionTo(newStatus: OrderStatus) {
    if (!table.order) return;
    const session = getAdminSession();
    if (!session) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/restaurant/orders/${table.order.id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus, adminId: session.id }),
        },
      );
      if (res.ok) {
        onStatusChange();
      }
    } finally {
      setLoading(false);
    }
  }

  const order = table.order;
  const badge = order ? STATUS_BADGE[order.status] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* panel */}
      <div className="relative flex w-full flex-col rounded-t-2xl bg-white md:w-96 md:rounded-none">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Table {table.tableNumber}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!order ? (
            <p className="py-12 text-center text-sm text-slate-400">
              No active order
            </p>
          ) : (
            <>
              {/* status + time */}
              <div className="mb-4 flex items-center gap-2">
                {badge && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  {timeAgo(order.createdAt)}
                </span>
              </div>

              {/* items */}
              <ul className="divide-y divide-slate-100">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="min-w-[1.5rem] text-center text-xs font-medium text-slate-500">
                        {item.quantity}×
                      </span>
                      <span className="text-sm text-slate-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(
                        item.unitPrice * item.quantity,
                        currency as Currency,
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* total */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-semibold text-slate-800">
                  Total
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {formatCurrency(order.total, currency as Currency)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* actions */}
        {order && (
          <div className="border-t border-slate-200 px-5 py-4">
            <ActionButtons
              status={order.status}
              loading={loading}
              onTransition={transitionTo}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButtons({
  status,
  loading,
  onTransition,
}: {
  status: OrderStatus;
  loading: boolean;
  onTransition: (s: OrderStatus) => void;
}) {
  const btnBase =
    "w-full min-h-[48px] rounded-lg text-sm font-semibold transition disabled:opacity-50";

  switch (status) {
    case "pending":
      return (
        <button
          type="button"
          disabled={loading}
          onClick={() => onTransition("confirmed")}
          className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-700`}
        >
          {loading ? "Confirming…" : "Confirm Order"}
        </button>
      );

    case "confirmed":
      return (
        <button
          type="button"
          disabled={loading}
          onClick={() => onTransition("awaiting_payment")}
          className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}
        >
          {loading ? "Updating…" : "Mark Awaiting Payment"}
        </button>
      );

    case "awaiting_payment":
      return (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => onTransition("pending_cash")}
            className={`${btnBase} bg-amber-600 text-white hover:bg-amber-700`}
          >
            {loading ? "Processing…" : "Confirm Cash Payment"}
          </button>
          <div
            className={`${btnBase} flex items-center justify-center bg-slate-100 text-slate-500`}
          >
            Paid by Card
          </div>
        </div>
      );

    case "pending_cash":
      return (
        <button
          type="button"
          disabled={loading}
          onClick={() => onTransition("paid")}
          className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-700`}
        >
          {loading ? "Confirming…" : "Confirm Cash Received"}
        </button>
      );

    case "paid":
      return (
        <p className="text-center text-sm text-slate-400">
          Table will clear automatically
        </p>
      );

    default:
      return null;
  }
}
