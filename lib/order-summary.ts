import type { PaymentRecord, TableOrderState } from "@/lib/types";

/** Sum of all completed payments (card + confirmed cash). */
export function confirmedPaidTotal(payments: PaymentRecord[]): number {
  return payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
}

export function formatOrderStatus(status: TableOrderState["status"]): string {
  switch (status) {
    case "unpaid":
      return "Unpaid";
    case "partially_paid":
      return "Partial";
    case "pending_cash":
      return "Pending cash";
    case "paid":
      return "Paid";
    default:
      return status;
  }
}
