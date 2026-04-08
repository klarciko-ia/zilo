import type { OrderStatus, TableDisplayStatus } from "./types";

export type { OrderStatus, TableDisplayStatus };

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "paid"],
  confirmed: ["awaiting_payment", "paid"],
  awaiting_payment: ["pending_cash", "paid"],
  pending_cash: ["paid"],
  paid: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function deriveTableStatus(
  orderStatus: OrderStatus | null,
  pendingCash: number = 0,
  confirmedPaid: number = 0,
): TableDisplayStatus {
  if (!orderStatus || orderStatus === "paid") return "free";
  if (pendingCash > 0.01) return "awaiting_payment";
  if (confirmedPaid > 0.01) return "awaiting_payment";
  if (orderStatus === "confirmed") return "confirmed";
  if (orderStatus === "pending_cash" || orderStatus === "awaiting_payment") return "awaiting_payment";
  return "ordering";
}
