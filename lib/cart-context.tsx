"use client";

import { CartLine } from "@/lib/types";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

type CartMap = Record<string, CartLine[]>;

type CartContextValue = {
  getCartLines: (tableId: string) => CartLine[];
  addItem: (
    tableId: string,
    item: { id: string; name: string; price: number }
  ) => void;
  updateQuantity: (tableId: string, menuItemId: string, quantity: number) => void;
  removeItem: (tableId: string, menuItemId: string) => void;
  clearCart: (tableId: string) => void;
  getSubtotal: (tableId: string) => number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "zilo_cart_map_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartMap, setCartMap] = useState<CartMap>({});

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as CartMap;
      setCartMap(parsed);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartMap));
  }, [cartMap]);

  const value = useMemo<CartContextValue>(() => {
    const getCartLines = (tableId: string) => cartMap[tableId] ?? [];

    const addItem = (
      tableId: string,
      item: { id: string; name: string; price: number }
    ) => {
      setCartMap((prev) => {
        const current = prev[tableId] ?? [];
        const existing = current.find((line) => line.menuItemId === item.id);
        let next: CartLine[];
        if (existing) {
          next = current.map((line) =>
            line.menuItemId === item.id
              ? { ...line, quantity: line.quantity + 1 }
              : line
          );
        } else {
          next = [
            ...current,
            {
              menuItemId: item.id,
              name: item.name,
              unitPrice: item.price,
              quantity: 1
            }
          ];
        }
        return { ...prev, [tableId]: next };
      });
    };

    const updateQuantity = (
      tableId: string,
      menuItemId: string,
      quantity: number
    ) => {
      setCartMap((prev) => {
        const current = prev[tableId] ?? [];
        const next = current
          .map((line) =>
            line.menuItemId === menuItemId ? { ...line, quantity } : line
          )
          .filter((line) => line.quantity > 0);
        return { ...prev, [tableId]: next };
      });
    };

    const removeItem = (tableId: string, menuItemId: string) => {
      setCartMap((prev) => {
        const current = prev[tableId] ?? [];
        const next = current.filter((line) => line.menuItemId !== menuItemId);
        return { ...prev, [tableId]: next };
      });
    };

    const clearCart = (tableId: string) => {
      setCartMap((prev) => ({ ...prev, [tableId]: [] }));
    };

    const getSubtotal = (tableId: string) =>
      (cartMap[tableId] ?? []).reduce(
        (sum, line) => sum + line.unitPrice * line.quantity,
        0
      );

    return { getCartLines, addItem, updateQuantity, removeItem, clearCart, getSubtotal };
  }, [cartMap]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
