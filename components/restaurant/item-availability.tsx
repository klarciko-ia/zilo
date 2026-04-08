"use client";

import { useEffect, useState } from "react";
import { sampleMenuItems, sampleCategories } from "@/lib/seed-data";
import type { MenuItem, MenuCategory } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  adminId: string;
};

export function ItemAvailability({
  open,
  onClose,
  restaurantId,
  adminId,
}: Props) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/restaurant/menu?restaurantId=${encodeURIComponent(restaurantId)}&adminId=${encodeURIComponent(adminId)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as {
            items?: MenuItem[];
            categories?: MenuCategory[];
          };
          if (!cancelled && data.items?.length) {
            setItems(data.items);
            setCategories(data.categories ?? []);
            return;
          }
        }
      } catch {
        /* fall through to demo data */
      }

      if (!cancelled) {
        setItems(sampleMenuItems);
        setCategories(sampleCategories);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, restaurantId, adminId]);

  async function handleToggle(item: MenuItem) {
    const newAvailable = !item.isAvailable;
    setToggling(item.id);

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, isAvailable: newAvailable } : i,
      ),
    );

    try {
      await fetch(
        `/api/restaurant/items/${encodeURIComponent(item.id)}/toggle?adminId=${encodeURIComponent(adminId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isAvailable: newAvailable }),
        },
      );
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isAvailable: !newAvailable } : i,
        ),
      );
    } finally {
      setToggling(null);
    }
  }

  if (!open) return null;

  const grouped = categories
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((cat) => ({
      ...cat,
      items: items.filter((i) => i.categoryId === cat.id),
    }))
    .filter((g) => g.items.length > 0);

  const ungrouped = items.filter(
    (i) => !categories.some((c) => c.id === i.categoryId),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div className="relative flex w-full flex-col rounded-t-2xl bg-white md:w-96 md:rounded-none">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Menu Management
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">
              No menu items found
            </p>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.id}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {group.name}
                  </h3>
                  <ul className="divide-y divide-slate-100">
                    {group.items.map((item) => (
                      <AvailabilityRow
                        key={item.id}
                        item={item}
                        toggling={toggling === item.id}
                        onToggle={() => handleToggle(item)}
                      />
                    ))}
                  </ul>
                </div>
              ))}

              {ungrouped.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Other
                  </h3>
                  <ul className="divide-y divide-slate-100">
                    {ungrouped.map((item) => (
                      <AvailabilityRow
                        key={item.id}
                        item={item}
                        toggling={toggling === item.id}
                        onToggle={() => handleToggle(item)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AvailabilityRow({
  item,
  toggling,
  onToggle,
}: {
  item: MenuItem;
  toggling: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {item.imageUrl && (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <p className={`truncate text-sm font-medium ${item.isAvailable ? "text-slate-700" : "text-slate-400 line-through opacity-50"}`}>
            {item.name}
          </p>
          <p className="text-xs text-slate-400">
            ${item.price?.toFixed(2) ?? "—"}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={toggling}
        onClick={onToggle}
        aria-label={
          item.isAvailable
            ? `Mark ${item.name} unavailable`
            : `Mark ${item.name} available`
        }
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${item.isAvailable ? "bg-emerald-500" : "bg-slate-300"} ${toggling ? "opacity-50" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${item.isAvailable ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </li>
  );
}
