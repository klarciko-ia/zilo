import fs from "fs";
import path from "path";
import type { OrderStatus } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const ORDERS_PATH = path.join(DATA_DIR, "demo-orders.json");

export type DemoOrderItem = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type DemoPayment = {
  id: string;
  method: "card" | "cash";
  amount: number;
  tipAmount: number;
  status: "confirmed" | "pending";
  createdAt: string;
};

export type DemoOrder = {
  id: string;
  tableSlug: string;
  restaurantId: string;
  status: OrderStatus;
  items: DemoOrderItem[];
  total: number;
  payments: DemoPayment[];
  createdAt: string;
};

export type DemoWaiterCall = {
  id: string;
  tableSlug: string;
  restaurantId: string;
  note: string | null;
  status: "open" | "dismissed";
  createdAt: string;
};

type OrderStore = {
  orders: DemoOrder[];
  waiterCalls: DemoWaiterCall[];
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readOrders(): OrderStore {
  try {
    if (fs.existsSync(ORDERS_PATH)) {
      const raw = fs.readFileSync(ORDERS_PATH, "utf-8");
      const parsed = JSON.parse(raw) as OrderStore;
      if (Array.isArray(parsed.orders)) {
        const orders = parsed.orders.map((o) => ({
          ...o,
          payments: Array.isArray(o.payments) ? o.payments : [],
        }));
        return { orders, waiterCalls: parsed.waiterCalls ?? [] };
      }
    }
  } catch { /* corrupted */ }
  return { orders: [], waiterCalls: [] };
}

function writeOrders(data: OrderStore) {
  ensureDir();
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/* ── Payment summary computation ── */

export type PaymentSummary = {
  confirmedCard: number;
  confirmedCash: number;
  pendingCash: number;
  totalConfirmed: number;
  totalClaimed: number;
  remainingToClaim: number;
};

export function computePaymentSummary(order: DemoOrder): PaymentSummary {
  const payments = order.payments ?? [];
  const confirmedCard = payments
    .filter((p) => p.method === "card" && p.status === "confirmed")
    .reduce((s, p) => s + p.amount, 0);
  const confirmedCash = payments
    .filter((p) => p.method === "cash" && p.status === "confirmed")
    .reduce((s, p) => s + p.amount, 0);
  const pendingCash = payments
    .filter((p) => p.method === "cash" && p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);
  const totalClaimed = payments.reduce((s, p) => s + p.amount, 0);
  const totalConfirmed = confirmedCard + confirmedCash;
  const remainingToClaim = Math.max(0, Number((order.total - totalClaimed).toFixed(2)));

  return { confirmedCard, confirmedCash, pendingCash, totalConfirmed, totalClaimed, remainingToClaim };
}

function autoCompleteIfFullyPaid(order: DemoOrder) {
  const summary = computePaymentSummary(order);
  if (summary.remainingToClaim <= 0.01 && summary.pendingCash <= 0.01) {
    order.status = "paid";
  }
}

/* ── Order CRUD ── */

export function createDemoOrder(
  tableSlug: string,
  restaurantId: string,
  items: DemoOrderItem[],
  status: OrderStatus = "pending"
): DemoOrder {
  const store = readOrders();

  store.orders = store.orders.filter(
    (o) => o.tableSlug !== tableSlug || o.status === "paid"
  );

  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const order: DemoOrder = {
    id: `demo-order-${tableSlug}-${Date.now()}`,
    tableSlug,
    restaurantId,
    status,
    items,
    total: Number(total.toFixed(2)),
    payments: [],
    createdAt: new Date().toISOString(),
  };

  store.orders.push(order);
  writeOrders(store);
  return order;
}

export function getActiveOrderByTableSlug(tableSlug: string): DemoOrder | null {
  const store = readOrders();
  return store.orders.find(
    (o) => o.tableSlug === tableSlug && o.status !== "paid"
  ) ?? null;
}

export function getOrdersByRestaurantId(restaurantId: string): DemoOrder[] {
  const store = readOrders();
  return store.orders.filter(
    (o) => o.restaurantId === restaurantId && o.status !== "paid"
  );
}

export function getOrderById(orderId: string): DemoOrder | null {
  const store = readOrders();
  return store.orders.find((o) => o.id === orderId) ?? null;
}

export function updateDemoOrderStatus(orderId: string, newStatus: OrderStatus): DemoOrder | null {
  const store = readOrders();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) return null;
  order.status = newStatus;
  writeOrders(store);
  return order;
}

export function updateDemoOrderItems(orderId: string, items: DemoOrderItem[]): DemoOrder | null {
  const store = readOrders();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) return null;
  order.items = items;
  order.total = Number(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2));
  writeOrders(store);
  return order;
}

export function getAllOrdersByRestaurantId(restaurantId: string): DemoOrder[] {
  const store = readOrders();
  return store.orders.filter((o) => o.restaurantId === restaurantId);
}

/* ── Payment operations ── */

export function addPaymentToOrder(
  orderId: string,
  method: "card" | "cash",
  amount: number,
  tipAmount: number = 0,
): DemoPayment | null {
  const store = readOrders();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) return null;

  const summary = computePaymentSummary(order);
  if (amount > summary.remainingToClaim + 0.01) return null;

  const payment: DemoPayment = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    method,
    amount: Number(amount.toFixed(2)),
    tipAmount: Number(tipAmount.toFixed(2)),
    status: method === "card" ? "confirmed" : "pending",
    createdAt: new Date().toISOString(),
  };

  order.payments.push(payment);
  autoCompleteIfFullyPaid(order);
  writeOrders(store);
  return payment;
}

export function confirmPayment(orderId: string, paymentId: string): boolean {
  const store = readOrders();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) return false;

  const payment = order.payments.find((p) => p.id === paymentId);
  if (!payment || payment.status !== "pending") return false;

  payment.status = "confirmed";
  autoCompleteIfFullyPaid(order);
  writeOrders(store);
  return true;
}

/* ── Stats ── */

export function getRestaurantStats(restaurantId: string) {
  const all = getAllOrdersByRestaurantId(restaurantId);
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = all.filter((o) => o.createdAt.slice(0, 10) === today);
  const revenue = todayOrders
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + o.total, 0);
  const pendingCash = todayOrders.reduce((s, o) => {
    const summary = computePaymentSummary(o);
    return s + summary.pendingCash;
  }, 0);
  return {
    totalOrdersToday: todayOrders.length,
    revenueToday: revenue,
    pendingCashToday: pendingCash,
  };
}

/* ── Waiter calls ── */

export function createWaiterCall(
  tableSlug: string,
  restaurantId: string,
  note: string | null
): DemoWaiterCall {
  const store = readOrders();
  const existing = store.waiterCalls.find(
    (c) => c.tableSlug === tableSlug && c.status === "open"
  );
  if (existing) return existing;

  const call: DemoWaiterCall = {
    id: `demo-waiter-${tableSlug}-${Date.now()}`,
    tableSlug,
    restaurantId,
    note,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  store.waiterCalls.push(call);
  writeOrders(store);
  return call;
}

export function getOpenWaiterCalls(restaurantId: string): DemoWaiterCall[] {
  const store = readOrders();
  return store.waiterCalls.filter(
    (c) => c.restaurantId === restaurantId && c.status === "open"
  );
}

export function dismissWaiterCall(callId: string): boolean {
  const store = readOrders();
  const call = store.waiterCalls.find((c) => c.id === callId);
  if (!call) return false;
  call.status = "dismissed";
  writeOrders(store);
  return true;
}
