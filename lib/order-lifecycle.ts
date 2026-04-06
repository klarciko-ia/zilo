import type { OrderStatus, TableDisplayStatus } from "./types";

export type { OrderStatus, TableDisplayStatus };

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed"],
  confirmed: ["awaiting_payment"],
  awaiting_payment: ["pending_cash", "paid"],
  pending_cash: ["paid"],
  paid: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function deriveTableStatus(orderStatus: OrderStatus | null): TableDisplayStatus {
  if (!orderStatus) return "free";
  if (orderStatus === "pending") return "ordering";
  if (orderStatus === "confirmed") return "confirmed";
  if (orderStatus === "awaiting_payment" || orderStatus === "pending_cash") return "awaiting_payment";
  return "free";
}
