"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import type { MenuCategory, MenuItem } from "@/lib/types";
import { useEffect, useState } from "react";

type Props = {
  tableId: string;
  restaurantName: string;
  tableNumber: number;
  categories: MenuCategory[];
  items: MenuItem[];
};

export function TableMenuCartClient({
  tableId,
  restaurantName,
  tableNumber,
  categories,
  items
}: Props) {
  const { addItem, getCartLines, getSubtotal, updateQuantity, removeItem } = useCart();
  const lines = getCartLines(tableId);
  const subtotal = getSubtotal(tableId);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-10 pb-40 pt-4">
      {/* Animated Background Mesh */}
      <div className="bg-mesh" />

      {/* Ultra-Modern Header */}
      <header className="flex flex-col items-center text-center space-y-2 px-4">
        <div className="inline-block px-3 py-1 rounded-full bg-black/[0.03] border border-black/[0.05]">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
            {restaurantName}
          </p>
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-black">
          Table <span className="text-[#FF3B30]">{tableNumber}</span>
        </h1>
      </header>

      {/* Floating Category Nav */}
      <nav className="sticky top-6 z-50 flex gap-3 overflow-x-auto px-4 py-2 no-scrollbar">
        {categories.map((cat) => (
          <button 
            key={cat.id} 
            className="whitespace-nowrap rounded-2xl bg-white/80 backdrop-blur-md px-6 py-3 text-xs font-black shadow-premium border border-white/50 active:scale-90 transition-all"
          >
            {cat.name}
          </button>
        ))}
      </nav>

      <section className="space-y-12 px-2">
        {categories.map((category, catIdx) => (
          <div key={category.id} className="space-y-6">
            <div className="flex items-center gap-4 px-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                {category.name}
              </h3>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            
            <div className="grid gap-6">
              {items
                .filter((item) => item.categoryId === category.id && item.isAvailable)
                .map((item, idx) => (
                  <div
                    key={item.id}
                    className="reveal-item glass-card group relative flex flex-col overflow-hidden rounded-[2.5rem] p-2 transition-all hover:ring-2 hover:ring-[#FF3B30]/20"
                    style={{ animationDelay: `${(catIdx * 3 + idx) * 0.1}s` }}
                  >
                    <div className="flex items-center gap-5 p-4">
                      {/* High-res style placeholder */}
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-slate-50 relative group-hover:scale-105 transition-transform duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5" />
                        <div className="flex h-full w-full items-center justify-center text-slate-200">
                          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-lg font-black leading-tight tracking-tight">{item.name}</p>
                        <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{item.description}</p>
                        <div className="pt-2 flex items-center justify-between">
                          <p className="price-tag text-base font-black text-black">{item.price} <span className="text-[10px] text-slate-400">MAD</span></p>
                          
                          <button
                            type="button"
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-white shadow-xl shadow-black/10 transition-all active:scale-75 hover:bg-[#FF3B30]"
                            onClick={() =>
                              addItem(tableId, {
                                id: item.id,
                                name: item.name,
                                price: item.price
                              })
                            }
                          >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v12m6-6H6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </section>

      {/* 2026 Floating Action Bar */}
      {mounted && lines.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 z-[100] px-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <Link
            href={`/table/${tableId}/checkout`}
            className="mx-auto max-w-md flex items-center justify-between rounded-[2.5rem] bg-black p-3 pl-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-white/20 transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-[#FF3B30] rounded-full blur opacity-40 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#FF3B30] text-xs font-black text-white">
                  {lines.reduce((s, l) => s + l.quantity, 0)}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Your Bill</span>
                <span className="text-sm font-bold text-white">View Summary</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="price-tag text-xl font-black text-white">{subtotal.toFixed(2)} MAD</span>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black group-hover:bg-[#FF3B30] group-hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
