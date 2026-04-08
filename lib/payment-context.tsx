"use client";

import { useCart } from "@/lib/cart-context";
import type {
  CartLine,
  OrderItemState,
  PaymentMethod,
  PaymentRecord,
  PaymentType,
  ReviewRecord,
  TableOrderState,
} from "@/lib/types";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ApplyPaymentInput = {
  tableId: string;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  amount: number;
  tipAmount?: number;
  itemSelections?: Array<{ menuItemId: string; quantity: number }>;
};

type MutationResult = { ok: boolean; error?: string; paymentId?: string };
type ReviewResult = { ok: boolean; error?: string; reviewId?: string };

type PaymentContextValue = {
  getOrder: (tableId: string) => TableOrderState | null;
  getAllOrders: () => TableOrderState[];
  ensureOrderFromCart: (tableId: string) => Promise<TableOrderState | null>;
  getPayablePercentages: (
    tableId: string
  ) => Array<{ label: string; amount: number; percent: number }>;
  applyPayment: (input: ApplyPaymentInput) => Promise<MutationResult>;
  confirmCashReceived: (
    tableId: string,
    paymentId: string
  ) => Promise<{ ok: boolean; error?: string }>;
  submitReview: (input: {
    tableId: string;
    rating: number;
    feedbackText?: string;
    redirectedToGoogle: boolean;
  }) => Promise<ReviewResult>;
  getAllReviews: () => ReviewRecord[];
  refreshOrderFromServer: (tableId: string) => Promise<void>;
};

type OrderMap = Record<string, TableOrderState>;
const STORAGE_KEY = "zilo_order_map_v1";
const REVIEWS_STORAGE_KEY = "zilo_reviews_v1";

const PaymentContext = createContext<PaymentContextValue | null>(null);

/* ──────────── helpers ──────────── */

function toOrderItems(lines: CartLine[]): OrderItemState[] {
  return lines.map((line) => ({
    menuItemId: line.menuItemId,
    name: line.name,
    unitPrice: line.unitPrice,
    quantityTotal: line.quantity,
    quantityPaid: 0,
    quantityRemaining: line.quantity,
  }));
}

function toTotal(items: OrderItemState[]) {
  return items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantityTotal,
    0
  );
}

function apiOrderToState(raw: Record<string, unknown>): TableOrderState {
  const orderItems = raw.orderItems as Record<string, unknown>[] | undefined;
  const payments = raw.payments as Record<string, unknown>[] | undefined;

  const confirmedPaid = (raw.confirmedPaid as number) ?? 0;
  const pendingCash = (raw.pendingCash as number) ?? 0;
  const remainingToClaim = (raw.remainingToClaim as number) ?? (raw.totalAmount as number) ?? 0;

  let status: TableOrderState["status"] = "unpaid";
  if (remainingToClaim <= 0.01 && pendingCash <= 0.01) status = "paid";
  else if (pendingCash > 0.01) status = "pending_cash";
  else if (confirmedPaid > 0.01) status = "partially_paid";

  return {
    orderId: raw.id as string,
    tableId: raw.tableId as string,
    orderItems: (orderItems ?? []).map((oi) => ({
      id: oi.id as string,
      menuItemId: oi.menuItemId as string,
      name: oi.name as string,
      unitPrice: oi.unitPrice as number,
      quantityTotal: oi.quantityTotal as number,
      quantityPaid: oi.quantityPaid as number,
      quantityRemaining: oi.quantityRemaining as number,
    })),
    totalAmount: raw.totalAmount as number,
    amountPaidByCard: confirmedPaid,
    amountCashPending: pendingCash,
    remainingAmount: remainingToClaim,
    status,
    payments: (payments ?? []).map((p) => ({
      id: p.id as string,
      amount: p.amount as number,
      paymentMethod: (p.method ?? p.paymentMethod) as PaymentMethod,
      paymentType: (p.paymentType as PaymentType) ?? "full",
      status: p.status === "confirmed" ? "completed" as const : "pending_cash_confirm" as const,
      createdAt: p.createdAt as string,
    })),
    updatedAt: (raw.updatedAt as string) ?? new Date().toISOString(),
  };
}

/* ──────────── provider ──────────── */

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [orderMap, setOrderMap] = useState<OrderMap>({});
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const { getCartLines } = useCart();
  const mapRef = useRef(orderMap);
  mapRef.current = orderMap;

  const persistOrderMap = useCallback((next: OrderMap) => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* */ }
  }, []);

  const updateOrderMap = useCallback(
    (updater: (prev: OrderMap) => OrderMap) => {
      setOrderMap((prev) => {
        const next = updater(prev);
        mapRef.current = next;
        persistOrderMap(next);
        return next;
      });
    },
    [persistOrderMap]
  );

  /* localStorage hydration */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OrderMap;
        setOrderMap(parsed);
        mapRef.current = parsed;
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    try {
      const raw = window.localStorage.getItem(REVIEWS_STORAGE_KEY);
      if (raw) setReviews(JSON.parse(raw) as ReviewRecord[]);
    } catch {
      window.localStorage.removeItem(REVIEWS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  }, [reviews]);

  /* ── API helpers ── */

  const fetchOrderApi = useCallback(
    async (tableId: string): Promise<TableOrderState | null> => {
      try {
        const res = await fetch(`/api/tables/${tableId}/order`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.order) return null;
        return apiOrderToState(data.order);
      } catch {
        return null;
      }
    },
    []
  );

  const refreshOrderFromServer = useCallback(async (tableId: string) => {
    const fresh = await fetchOrderApi(tableId);
    if (fresh) {
      updateOrderMap((prev) => ({ ...prev, [tableId]: fresh }));
    }
  }, [fetchOrderApi, updateOrderMap]);

  const createOrderApi = useCallback(
    async (
      tableId: string,
      items: Array<{
        menuItemId: string;
        name: string;
        unitPrice: number;
        quantity: number;
      }>
    ): Promise<string | null> => {
      try {
        const res = await fetch(`/api/tables/${tableId}/order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.orderId ?? null;
      } catch {
        return null;
      }
    },
    []
  );

  /* ── context methods ── */

  const getOrder = useCallback(
    (tableId: string): TableOrderState | null => {
      const fromRef = mapRef.current[tableId];
      if (fromRef) return fromRef;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as OrderMap;
          if (stored[tableId]) {
            mapRef.current = { ...mapRef.current, [tableId]: stored[tableId] };
            return stored[tableId];
          }
        }
      } catch { /* */ }
      return null;
    },
    []
  );

  const getAllOrders = useCallback(
    () =>
      Object.values(mapRef.current).sort((a, b) =>
        a.tableId.localeCompare(b.tableId)
      ),
    []
  );

  const ensureOrderFromCart = useCallback(
    async (tableId: string): Promise<TableOrderState | null> => {
      const cartLines = getCartLines(tableId);

      if (cartLines.length) {
        const items = cartLines.map((l) => ({
          menuItemId: l.menuItemId,
          name: l.name,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
        }));

        const orderId = await createOrderApi(tableId, items);

        if (orderId) {
          const serverOrder = await fetchOrderApi(tableId);
          if (serverOrder) {
            updateOrderMap((prev) => ({ ...prev, [tableId]: serverOrder }));
            return serverOrder;
          }
        }

        const orderItems = toOrderItems(cartLines);
        const totalAmount = toTotal(orderItems);
        const fallback: TableOrderState = {
          tableId,
          orderItems,
          totalAmount,
          amountPaidByCard: 0,
          amountCashPending: 0,
          remainingAmount: totalAmount,
          status: "unpaid",
          payments: [],
          updatedAt: new Date().toISOString(),
        };
        updateOrderMap((prev) => ({ ...prev, [tableId]: fallback }));
        return fallback;
      }

      const serverOrder = await fetchOrderApi(tableId);
      if (serverOrder) {
        updateOrderMap((prev) => ({ ...prev, [tableId]: serverOrder }));
        return serverOrder;
      }

      let existing = mapRef.current[tableId];
      if (!existing) {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const stored = JSON.parse(raw) as OrderMap;
            if (stored[tableId]) {
              existing = stored[tableId];
              mapRef.current = { ...mapRef.current, [tableId]: existing };
              setOrderMap((prev) => ({ ...prev, [tableId]: existing! }));
            }
          }
        } catch { /* */ }
      }

      return existing ?? null;
    },
    [fetchOrderApi, createOrderApi, getCartLines, updateOrderMap]
  );

  const getPayablePercentages = useCallback((tableId: string) => {
    const order = mapRef.current[tableId] ?? null;
    if (!order) return [];
    return [25, 50, 75]
      .map((percent) => ({
        percent,
        label: `${percent}%`,
        amount: Number(
          ((order.remainingAmount * percent) / 100).toFixed(2)
        ),
      }))
      .filter((p) => p.amount > 0);
  }, []);

  const applyPayment = useCallback(
    async ({
      tableId,
      paymentMethod,
      paymentType,
      amount,
      tipAmount = 0,
    }: ApplyPaymentInput): Promise<MutationResult> => {
      let order = mapRef.current[tableId];
      if (!order)
        return { ok: false, error: "No active order for this table." };
      if (amount <= 0)
        return { ok: false, error: "Payment amount must be greater than zero." };

      if (!order.orderId) {
        const serverOrder = await fetchOrderApi(tableId);
        if (serverOrder?.orderId) {
          order = serverOrder;
          updateOrderMap((prev) => ({ ...prev, [tableId]: serverOrder }));
        }
      }

      if (!order.orderId) {
        return { ok: false, error: "No server order found. Please confirm your order first." };
      }

      try {
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.orderId,
            paymentType,
            paymentMethod,
            amount,
            tipAmount: tipAmount || undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const refreshed = await fetchOrderApi(tableId);
          if (refreshed)
            updateOrderMap((prev) => ({ ...prev, [tableId]: refreshed }));
          return { ok: true, paymentId: data.paymentId };
        }

        const errBody = await res.json().catch(() => ({}));
        return { ok: false, error: errBody.error || "Payment failed" };
      } catch {
        return { ok: false, error: "Network error. Check connection." };
      }
    },
    [fetchOrderApi, updateOrderMap]
  );

  const confirmCashReceived = useCallback(
    async (
      tableId: string,
      paymentId: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const order = mapRef.current[tableId];
      if (!order?.orderId) return { ok: false, error: "Order not found." };

      try {
        const res = await fetch(`/api/payments/${paymentId}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.orderId }),
        });
        if (res.ok) {
          const refreshed = await fetchOrderApi(tableId);
          if (refreshed)
            updateOrderMap((prev) => ({ ...prev, [tableId]: refreshed }));
          return { ok: true };
        }
        const errBody = await res.json().catch(() => ({}));
        return { ok: false, error: errBody.error || "Confirmation failed" };
      } catch {
        return { ok: false, error: "Network error." };
      }
    },
    [fetchOrderApi, updateOrderMap]
  );

  const submitReview = useCallback(
    async ({
      tableId,
      rating,
      feedbackText,
      redirectedToGoogle,
    }: {
      tableId: string;
      rating: number;
      feedbackText?: string;
      redirectedToGoogle: boolean;
    }): Promise<ReviewResult> => {
      if (rating < 1 || rating > 5)
        return { ok: false, error: "Rating must be between 1 and 5." };
      if (rating <= 3 && !feedbackText?.trim())
        return { ok: false, error: "Feedback is required for ratings 1 to 3." };

      try {
        const order = mapRef.current[tableId];
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableSlug: tableId,
            orderId: order?.orderId ?? null,
            rating,
            feedbackText: feedbackText?.trim() ?? null,
            redirectedToGoogle,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          return { ok: true, reviewId: data.reviewId };
        }
      } catch {
        /* fall through */
      }

      const review: ReviewRecord = {
        id: `rev_${crypto.randomUUID()}`,
        tableId,
        rating,
        feedbackText: feedbackText?.trim() || null,
        redirectedToGoogle,
        createdAt: new Date().toISOString(),
      };
      setReviews((prev) => [review, ...prev]);
      return { ok: true, reviewId: review.id };
    },
    []
  );

  const getAllReviews = useCallback(() => reviews, [reviews]);

  const value = useMemo<PaymentContextValue>(
    () => ({
      getOrder,
      getAllOrders,
      ensureOrderFromCart,
      getPayablePercentages,
      applyPayment,
      confirmCashReceived,
      submitReview,
      getAllReviews,
      refreshOrderFromServer,
    }),
    [
      orderMap,
      getOrder,
      getAllOrders,
      ensureOrderFromCart,
      getPayablePercentages,
      applyPayment,
      confirmCashReceived,
      submitReview,
      getAllReviews,
      refreshOrderFromServer,
    ]
  );

  return (
    <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
  );
}

export function usePayment() {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error("usePayment must be used inside PaymentProvider");
  return ctx;
}
