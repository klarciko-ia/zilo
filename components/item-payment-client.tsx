"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { encodeSelections } from "@/lib/payment-flow";
import { usePayment } from "@/lib/payment-context";

export function ItemPaymentClient({ tableId }: { tableId: string }) {
  const { ensureOrderFromCart, getOrder } = usePayment();
  const order = getOrder(tableId);
  const [selectedQtyMap, setSelectedQtyMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (order) return;
    let cancelled = false;
    ensureOrderFromCart(tableId).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [ensureOrderFromCart, order, tableId]);

  const selectedAmount = useMemo(() => {
    if (!order) return 0;
    return order.orderItems.reduce((sum, item) => {
      const qty = selectedQtyMap[item.menuItemId] ?? 0;
      return sum + qty * item.unitPrice;
    }, 0);
  }, [order, selectedQtyMap]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Pay for My Items</h1>
        <p className="text-sm text-slate-600">No order available yet.</p>
        <Link href={`/table/${tableId}/checkout`} className="block rounded-xl border border-slate-300 px-4 py-3 text-center font-medium">
          Back to Checkout
        </Link>
      </div>
    );
  }

  const selectedRows = order.orderItems
    .map((item) => ({
      menuItemId: item.menuItemId,
      quantity: selectedQtyMap[item.menuItemId] ?? 0,
    }))
    .filter((item) => item.quantity > 0);

  const encoded = encodeSelections(selectedRows);

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-xl font-semibold">Pay for My Items</h1>
      <p className="text-sm text-slate-600">
        Select only what you took. You cannot exceed remaining quantities.
      </p>

      <div className="space-y-2">
        {order.orderItems.map((item) => {
          const selectedQty = selectedQtyMap[item.menuItemId] ?? 0;
          return (
            <div key={item.menuItemId} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-slate-600">{item.unitPrice.toFixed(2)} MAD each</p>
                  <p className="text-xs text-slate-500">
                    Remaining: {item.quantityRemaining} / Total: {item.quantityTotal}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="h-8 w-8 rounded-md border border-slate-300"
                    onClick={() =>
                      setSelectedQtyMap((prev) => ({
                        ...prev,
                        [item.menuItemId]: Math.max(0, selectedQty - 1),
                      }))
                    }
                  >
                    -
                  </button>
                  <span className="w-6 text-center">{selectedQty}</span>
                  <button
                    className="h-8 w-8 rounded-md border border-slate-300"
                    onClick={() =>
                      setSelectedQtyMap((prev) => ({
                        ...prev,
                        [item.menuItemId]: Math.min(item.quantityRemaining, selectedQty + 1),
                      }))
                    }
                    disabled={selectedQty >= item.quantityRemaining}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-brand px-4 py-3 text-white shadow-lg">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>Selected total</span>
          <span>{selectedAmount.toFixed(2)} MAD</span>
        </div>
        {selectedAmount > 0 ? (
          <Link
            href={`/table/${tableId}/checkout/method?type=item_partial&amount=${selectedAmount.toFixed(2)}&items=${encoded}`}
            className="block rounded-lg bg-white px-3 py-2 text-center font-medium text-slate-900"
          >
            Continue to Payment Method
          </Link>
        ) : (
          <button
            className="block w-full rounded-lg bg-slate-300 px-3 py-2 text-center font-medium text-slate-700"
            disabled
          >
            Select at least one item
          </button>
        )}
      </div>
    </div>
  );
}
