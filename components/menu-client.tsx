"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/lib/cart-context";
import { MenuCategory, MenuItem } from "@/lib/types";

type Props = {
  tableId: string;
  categories: MenuCategory[];
  items: MenuItem[];
};

export function MenuClient({ tableId, categories, items }: Props) {
  const { addItem, getCartLines } = useCart();

  const cartCount = useMemo(
    () =>
      getCartLines(tableId).reduce((sum, line) => sum + line.quantity, 0),
    [getCartLines, tableId]
  );

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-xl font-semibold">Menu</h1>
        <p className="text-sm text-slate-600">Table {tableId}</p>
      </div>

      {categories.map((category) => (
        <section key={category.id} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {category.name}
          </h2>
          {items
            .filter((item) => item.categoryId === category.id && item.isAvailable)
            .map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-slate-600">{item.description}</p>
                    <p className="mt-1 text-sm font-semibold">{item.price} MAD</p>
                  </div>
                  <button
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white"
                    onClick={() =>
                      addItem(tableId, {
                        id: item.id,
                        name: item.name,
                        price: item.price
                      })
                    }
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
        </section>
      ))}

      <Link
        href={`/table/${tableId}/cart`}
        className="fixed bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-brand px-4 py-3 text-center font-medium text-white shadow-lg"
      >
        View Cart ({cartCount})
      </Link>
    </div>
  );
}
