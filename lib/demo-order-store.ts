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

export type DemoOrder = {
  id: string;
  tableSlug: string;
  restaurantId: string;
  status: OrderStatus;
  items: DemoOrderItem[];
  total: number;
  createdAt: string;
};

type OrderStore = { orders: DemoOrder[] };

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
      if (Array.isArray(parsed.orders)) return parsed;
    }
  } catch { /* corrupted */ }
  return { orders: [] };
}

function writeOrders(data: OrderStore) {
  ensureDir();
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function createDemoOrder(
  tableSlug: string,
  restaurantId: string,
  items: DemoOrderItem[],
  status: OrderStatus = "pending"
): DemoOrder {
  const store = readOrders();

  // Replace any existing non-paid order for this table
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
    total,
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
