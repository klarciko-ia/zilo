"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export function CartClient({ tableId }: { tableId: string }) {
  const { getCartLines, getSubtotal, updateQuantity, removeItem, clearCart } = useCart();
  const lines = getCartLines(tableId);
  const subtotal = getSubtotal(tableId);

  if (!lines.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Your Cart</h1>
        <p className="text-sm text-slate-600">Your cart is empty.</p>
        <Link
          href={`/table/${tableId}/menu`}
          className="block rounded-xl bg-brand px-4 py-3 text-center font-medium text-white"
        >
          Back to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Your Cart</h1>
        <p className="text-sm text-slate-600">Table {tableId}</p>
      </div>

      <div className="space-y-2">
        {lines.map((line) => (
          <div
            key={line.menuItemId}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{line.name}</p>
                <p className="text-sm text-slate-600">{line.unitPrice} MAD each</p>
              </div>
              <button
                className="text-sm text-red-600"
                onClick={() => removeItem(tableId, line.menuItemId)}
              >
                Remove
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="h-8 w-8 rounded-md border border-slate-300"
                  onClick={() =>
                    updateQuantity(tableId, line.menuItemId, line.quantity - 1)
                  }
                >
                  -
                </button>
                <span className="w-6 text-center">{line.quantity}</span>
                <button
                  className="h-8 w-8 rounded-md border border-slate-300"
                  onClick={() =>
                    updateQuantity(tableId, line.menuItemId, line.quantity + 1)
                  }
                >
                  +
                </button>
              </div>
              <p className="font-semibold">{line.unitPrice * line.quantity} MAD</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">Subtotal</p>
          <p className="font-semibold">{subtotal} MAD</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => clearCart(tableId)}
          className="rounded-xl border border-slate-300 px-4 py-3 font-medium"
        >
          Clear
        </button>
        <Link
          href={`/table/${tableId}/order-review`}
          className="rounded-xl bg-brand px-4 py-3 text-center font-medium text-white"
        >
          Review & continue
        </Link>
      </div>
    </div>
  );
}
