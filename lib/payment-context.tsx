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
  /** Reload open bill from API after server-side changes (e.g. send to kitchen). */
  refreshOrderFromServer: (tableId: string) => Promise<void>;
};

type OrderMap = Record<string, TableOrderState>;
const STORAGE_KEY = "zilo_order_map_v1";
const REVIEWS_STORAGE_KEY = "zilo_reviews_v1";

const PaymentContext = createContext<PaymentContextValue | null>(null);

function isSupabaseClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

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

function computeStatus(
  remainingAmount: number,
  amountCashPending: number
): TableOrderState["status"] {
  if (remainingAmount <= 0) return "paid";
  if (amountCashPending > 0) return "pending_cash";
  if (remainingAmount > 0) return "partially_paid";
  return "unpaid";
}

function apiOrderToState(raw: Record<string, unknown>): TableOrderState {
  const orderItems = raw.orderItems as Record<string, unknown>[] | undefined;
  const payments = raw.payments as Record<string, unknown>[] | undefined;
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
    amountPaidByCard: (raw.amountPaid as number) ?? 0,
    amountCashPending: (raw.amountCashPending as number) ?? 0,
    remainingAmount: raw.remainingAmount as number,
    status: raw.status as TableOrderState["status"],
    payments: (payments ?? []).map((p) => ({
      id: p.id as string,
      amount: p.amount as number,
      paymentMethod: p.paymentMethod as PaymentMethod,
      paymentType: p.paymentType as PaymentType,
      status: p.status as PaymentRecord["status"],
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

  /* ── API helpers (best-effort, never throw) ── */

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

  /** Ensures a server row exists so /api/payments and admin dashboard see the bill. */
  const ensureServerOrderId = useCallback(
    async (
      tableId: string,
      order: TableOrderState
    ): Promise<TableOrderState | null> => {
      if (order.orderId) return order;

      const remote = await fetchOrderApi(tableId);
      if (remote?.orderId) {
        updateOrderMap((prev) => ({ ...prev, [tableId]: remote }));
        return remote;
      }

      const items = order.orderItems
        .map((oi) => ({
          menuItemId: oi.menuItemId,
          name: oi.name,
          unitPrice: oi.unitPrice,
          quantity:
            oi.quantityRemaining > 0 ? oi.quantityRemaining : oi.quantityTotal,
        }))
        .filter((i) => i.quantity > 0);
      if (!items.length) return null;

      const newId = await createOrderApi(tableId, items);
      if (!newId) return null;

      const full = await fetchOrderApi(tableId);
      if (full?.orderId) {
        updateOrderMap((prev) => ({ ...prev, [tableId]: full }));
        return full;
      }
      return null;
    },
    [fetchOrderApi, createOrderApi]
  );

  /* ── context methods ── */

  const getOrder = useCallback(
    (tableId: string): TableOrderState | null => {
      const fromRef = mapRef.current[tableId];
      if (fromRef) return fromRef;
      // Fallback: check localStorage directly (covers pre-hydration race)
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
      let existing = mapRef.current[tableId];

      // If mapRef hasn't been hydrated yet, check localStorage directly
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

      if (existing?.orderId) return existing;

      if (existing && isSupabaseClientConfigured()) {
        try {
          const synced = await ensureServerOrderId(tableId, existing);
          if (synced) return synced;
        } catch { /* Supabase unreachable */ }
      }

      if (existing) return existing;

      const cartLines = getCartLines(tableId);
      if (cartLines.length) {
        const orderItems = toOrderItems(cartLines);
        const totalAmount = toTotal(orderItems);
        const next: TableOrderState = {
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
        updateOrderMap((prev) => ({ ...prev, [tableId]: next }));
        return next;
      }

      try {
        const apiOrder = await fetchOrderApi(tableId);
        if (apiOrder) {
          updateOrderMap((prev) => ({ ...prev, [tableId]: apiOrder }));
          return apiOrder;
        }
      } catch { /* */ }

      return null;
    },
    [fetchOrderApi, getCartLines, ensureServerOrderId, updateOrderMap]
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
      itemSelections,
    }: ApplyPaymentInput): Promise<MutationResult> => {
      let order = mapRef.current[tableId];
      if (!order)
        return { ok: false, error: "No active order for this table." };
      if (amount <= 0)
        return { ok: false, error: "Payment amount must be greater than zero." };

      if (isSupabaseClientConfigured()) {
        try {
          const synced = await ensureServerOrderId(tableId, order);
          if (synced?.orderId) {
            order = synced;
          }
        } catch {
          // Supabase unreachable — proceed with local-only payment
        }
      }

      if (amount - order.remainingAmount > 0.001)
        return { ok: false, error: "Cannot pay more than remaining balance." };

      /* ── API (required when Supabase is configured) ── */
      if (order.orderId) {
        try {
          const apiItems = itemSelections
            ?.map((sel) => {
              const oi = order.orderItems.find(
                (i) => i.menuItemId === sel.menuItemId
              );
              return oi?.id
                ? { orderItemId: oi.id, quantity: sel.quantity }
                : null;
            })
            .filter(Boolean);

          const res = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.orderId,
              paymentType,
              paymentMethod,
              amount,
              tipAmount: tipAmount || undefined,
              itemSelections: apiItems?.length ? apiItems : undefined,
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
          // API call failed — fall through to local-only payment tracking
        }
      }

      /* ── localStorage fallback (no Supabase / demo mode) ── */
      let nextOrderItems = order.orderItems;
      if (paymentType === "item_partial") {
        if (!itemSelections?.length)
          return { ok: false, error: "Select at least one item." };

        const selMap = new Map(
          itemSelections.map((s) => [s.menuItemId, s.quantity])
        );
        for (const item of order.orderItems) {
          const req = selMap.get(item.menuItemId) ?? 0;
          if (req < 0 || req > item.quantityRemaining)
            return {
              ok: false,
              error: `Invalid quantity for ${item.name}.`,
            };
        }
        nextOrderItems = order.orderItems.map((item) => {
          const qty = selMap.get(item.menuItemId) ?? 0;
          return {
            ...item,
            quantityPaid: item.quantityPaid + qty,
            quantityRemaining: item.quantityRemaining - qty,
          };
        });

        const selectedAmt = itemSelections.reduce((s, sel) => {
          const it = order.orderItems.find(
            (i) => i.menuItemId === sel.menuItemId
          );
          return s + (it ? it.unitPrice * sel.quantity : 0);
        }, 0);
        if (Math.abs(selectedAmt - amount) > 0.001)
          return {
            ok: false,
            error: "Selected items total does not match payment amount.",
          };
      }

      const paymentId = `pay_${crypto.randomUUID()}`;
      const payment: PaymentRecord = {
        id: paymentId,
        amount,
        tipAmount: tipAmount || undefined,
        paymentMethod,
        paymentType,
        status: paymentMethod === "cash" ? "pending_cash_confirm" : "completed",
        createdAt: new Date().toISOString(),
      };

      const nextPaidByCard =
        order.amountPaidByCard + (paymentMethod === "card" ? amount : 0);
      const nextCashPending =
        order.amountCashPending + (paymentMethod === "cash" ? amount : 0);
      const nextRemaining = Number(
        (order.remainingAmount - amount).toFixed(2)
      );

      updateOrderMap((prev) => ({
        ...prev,
        [tableId]: {
          ...order,
          orderItems: nextOrderItems,
          amountPaidByCard: Number(nextPaidByCard.toFixed(2)),
          amountCashPending: Number(nextCashPending.toFixed(2)),
          remainingAmount: nextRemaining,
          status: computeStatus(nextRemaining, nextCashPending),
          payments: [payment, ...order.payments],
          updatedAt: new Date().toISOString(),
        },
      }));
      return { ok: true, paymentId };
    },
    [fetchOrderApi, ensureServerOrderId, updateOrderMap]
  );

  const confirmCashReceived = useCallback(
    async (
      tableId: string,
      paymentId: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const order = mapRef.current[tableId];
      if (!order) return { ok: false, error: "Order not found." };

      if (order.orderId) {
        try {
          const res = await fetch(`/api/payments/${paymentId}/confirm`, {
            method: "POST",
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
          /* fall through */
        }
      }

      const payment = order.payments.find((p) => p.id === paymentId);
      if (!payment) return { ok: false, error: "Payment not found." };
      if (
        payment.paymentMethod !== "cash" ||
        payment.status !== "pending_cash_confirm"
      )
        return { ok: false, error: "Payment is not pending cash confirmation." };

      const nextPayments = order.payments.map((p) =>
        p.id === paymentId ? { ...p, status: "completed" as const } : p
      );
      const nextCash = Math.max(
        0,
        Number((order.amountCashPending - payment.amount).toFixed(2))
      );

      updateOrderMap((prev) => ({
        ...prev,
        [tableId]: {
          ...order,
          payments: nextPayments,
          amountCashPending: nextCash,
          status: computeStatus(order.remainingAmount, nextCash),
          updatedAt: new Date().toISOString(),
        },
      }));
      return { ok: true };
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
