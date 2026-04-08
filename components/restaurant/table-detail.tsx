"use client";

import { useState } from "react";
import { X, Plus, Minus, Pencil, Save, Check, Clock, CreditCard, Banknote } from "lucide-react";
import { getRestaurantSession } from "@/lib/admin-session";
import { formatCurrency } from "@/lib/format-currency";
import type { Currency, GuestOrderMode, OrderStatus } from "@/lib/types";

type OrderItem = { name: string; quantity: number; unitPrice: number };

type OrderPayment = {
  id: string;
  method: "card" | "cash";
  amount: number;
  status: "confirmed" | "pending";
  createdAt: string;
};

type TableOrder = {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: OrderItem[];
  payments: OrderPayment[];
  confirmedPaid: number;
  pendingCash: number;
  remainingToClaim: number;
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
  guestOrderMode: GuestOrderMode;
  onClose: () => void;
  onStatusChange: () => void;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function statusBadge(order: TableOrder) {
  if (order.status === "paid") return { className: "bg-emerald-100 text-emerald-700", label: "Complete" };
  if (order.pendingCash > 0.01) return { className: "bg-orange-100 text-orange-700", label: "Cash Pending" };
  if (order.confirmedPaid > 0.01) return { className: "bg-blue-100 text-blue-700", label: "Partially Paid" };
  if (order.status === "confirmed") return { className: "bg-emerald-100 text-emerald-700", label: "Confirmed" };
  return { className: "bg-yellow-100 text-yellow-700", label: "New Order" };
}

export function TableDetail({ table, currency, guestOrderMode, onClose, onStatusChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");

  const order = table.order;
  const badge = order ? statusBadge(order) : null;
  const isSelfService = guestOrderMode === "self_service";

  function startEditing() {
    if (!order) return;
    setEditItems(order.items.map((i) => ({ ...i })));
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditItems([]);
    setNewItemName("");
    setNewItemPrice("");
  }

  function changeQuantity(idx: number, delta: number) {
    setEditItems((prev) => {
      const next = [...prev];
      const newQty = next[idx].quantity + delta;
      if (newQty <= 0) { next.splice(idx, 1); } else { next[idx] = { ...next[idx], quantity: newQty }; }
      return next;
    });
  }

  function addItem() {
    const name = newItemName.trim();
    const price = parseFloat(newItemPrice);
    if (!name || isNaN(price) || price <= 0) return;
    setEditItems((prev) => [...prev, { name, unitPrice: price, quantity: 1 }]);
    setNewItemName("");
    setNewItemPrice("");
  }

  async function saveEdits() {
    if (!order || editItems.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/restaurant/orders/${order.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: editItems.map((i) => ({
            menuItemId: `manual-${i.name}`,
            name: i.name,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
        }),
      });
      if (res.ok) {
        setEditing(false);
        onStatusChange();
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmCashPayment(paymentId: string) {
    if (!order) return;
    const session = getRestaurantSession();
    if (!session) return;

    setConfirmingId(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, adminId: session.id }),
      });
      if (res.ok) {
        onStatusChange();
      }
    } finally {
      setConfirmingId(null);
    }
  }

  const editTotal = editItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const originalTotal = order?.total ?? 0;
  const diff = editTotal - originalTotal;

  const pendingCashPayments = order?.payments.filter((p) => p.method === "cash" && p.status === "pending") ?? [];
  const confirmedPayments = order?.payments.filter((p) => p.status === "confirmed") ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center md:items-stretch md:justify-end">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white sm:max-w-md sm:rounded-2xl md:max-h-none md:w-[420px] md:rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e3c8af]/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#062946]">Table {table.tableNumber}</h2>
              <p className="text-xs text-slate-400">{isSelfService ? "Self-service" : "Waiter-service"}</p>
            </div>
            {badge && order && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!order ? (
            <p className="py-12 text-center text-sm text-slate-400">No active order</p>
          ) : editing ? (
            /* ---- Edit Mode ---- */
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Edit Order</h3>
                <button type="button" onClick={cancelEditing} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
              </div>
              <ul className="space-y-2">
                {editItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">{item.name}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(item.unitPrice, currency as Currency)} each</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => changeQuantity(i, -1)} className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-red-50 hover:text-red-600"><Minus size={14} /></button>
                      <span className="w-6 text-center text-sm font-medium text-slate-700">{item.quantity}</span>
                      <button type="button" onClick={() => changeQuantity(i, 1)} className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-600"><Plus size={14} /></button>
                    </div>
                    <span className="min-w-[4rem] text-right text-sm font-medium text-slate-700">
                      {formatCurrency(item.unitPrice * item.quantity, currency as Currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <input type="text" placeholder="Item name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm placeholder:text-slate-400 focus:border-[#062946] focus:outline-none" />
                <input type="number" placeholder="Price" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm placeholder:text-slate-400 focus:border-[#062946] focus:outline-none" step="0.01" min="0" />
                <button type="button" onClick={addItem} disabled={!newItemName.trim() || !newItemPrice} className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#062946] text-white transition hover:bg-[#0a3a5e] disabled:opacity-40"><Plus size={16} /></button>
              </div>
              <div className="mt-4 space-y-1 border-t border-[#e3c8af]/30 pt-3">
                <div className="flex justify-between text-sm text-slate-500"><span>Original total</span><span>{formatCurrency(originalTotal, currency as Currency)}</span></div>
                <div className="flex justify-between text-sm font-semibold text-[#062946]"><span>New total</span><span>{formatCurrency(editTotal, currency as Currency)}</span></div>
                {diff !== 0 && (
                  <div className={`flex justify-between text-sm font-semibold ${diff > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    <span>{diff > 0 ? "Extra to pay" : "Refund"}</span>
                    <span>{diff > 0 ? "+" : ""}{formatCurrency(Math.abs(diff), currency as Currency)}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ---- View Mode ---- */
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">{timeAgo(order.createdAt)}</span>
                {order.status !== "paid" && (
                  <button type="button" onClick={startEditing} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#062946] transition hover:bg-slate-100">
                    <Pencil size={12} /> Edit order
                  </button>
                )}
              </div>

              {/* Items */}
              <ul className="divide-y divide-[#e3c8af]/20">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="min-w-[1.5rem] text-center text-xs font-medium text-slate-500">{item.quantity}×</span>
                      <span className="text-sm text-slate-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(item.unitPrice * item.quantity, currency as Currency)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Total + Payment Breakdown */}
              <div className="mt-3 space-y-2 border-t border-[#e3c8af]/30 pt-3">
                <div className="flex justify-between text-sm font-semibold text-[#062946]">
                  <span>Total</span>
                  <span>{formatCurrency(order.total, currency as Currency)}</span>
                </div>

                {(order.confirmedPaid > 0.01 || order.pendingCash > 0.01) && (
                  <div className="space-y-1.5 rounded-lg bg-slate-50 p-3 mt-2">
                    {order.confirmedPaid > 0.01 && (
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1 text-emerald-700"><Check size={12} /> Confirmed</span>
                        <span className="font-medium text-emerald-700">{formatCurrency(order.confirmedPaid, currency as Currency)}</span>
                      </div>
                    )}
                    {order.pendingCash > 0.01 && (
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1 text-orange-600"><Clock size={12} /> Cash pending</span>
                        <span className="font-medium text-orange-600">{formatCurrency(order.pendingCash, currency as Currency)}</span>
                      </div>
                    )}
                    {order.remainingToClaim > 0.01 && (
                      <div className="flex justify-between text-xs border-t border-slate-200 pt-1.5">
                        <span className="font-semibold text-slate-700">Remaining</span>
                        <span className="font-semibold text-slate-700">{formatCurrency(order.remainingToClaim, currency as Currency)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Transactions */}
              {order.payments.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Payments</p>
                  <div className="space-y-2">
                    {/* Pending cash first */}
                    {pendingCashPayments.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl bg-orange-50 px-3 py-2.5 ring-1 ring-orange-200">
                        <Banknote size={16} className="shrink-0 text-orange-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-orange-800">
                            Cash — {formatCurrency(p.amount, currency as Currency)}
                          </p>
                          <p className="text-[10px] text-orange-600">{timeAgo(p.createdAt)}</p>
                        </div>
                        <button
                          type="button"
                          disabled={confirmingId === p.id}
                          onClick={() => confirmCashPayment(p.id)}
                          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {confirmingId === p.id ? "..." : "Confirm"}
                        </button>
                      </div>
                    ))}

                    {/* Confirmed payments */}
                    {confirmedPayments.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                        {p.method === "card" ? (
                          <CreditCard size={16} className="shrink-0 text-blue-500" />
                        ) : (
                          <Banknote size={16} className="shrink-0 text-emerald-500" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700">
                            {p.method === "card" ? "Card" : "Cash"} — {formatCurrency(p.amount, currency as Currency)}
                          </p>
                          <p className="text-[10px] text-slate-400">{timeAgo(p.createdAt)}</p>
                        </div>
                        <Check size={14} className="shrink-0 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {order && (
          <div className="border-t border-[#e3c8af]/30 px-5 py-4">
            {editing ? (
              <button
                type="button"
                disabled={saving || editItems.length === 0}
                onClick={saveEdits}
                className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#062946] text-sm font-semibold text-white transition hover:bg-[#0a3a5e] disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            ) : order.status === "paid" ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-medium text-emerald-700">
                <Check size={18} /> Fully paid — table will clear
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
