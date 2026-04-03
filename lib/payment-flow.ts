import { PaymentType } from "@/lib/types";

export type CheckoutIntent = {
  paymentType: PaymentType;
  amount: number;
  itemSelections?: Array<{ menuItemId: string; quantity: number }>;
};

export function encodeSelections(
  selections: Array<{ menuItemId: string; quantity: number }>
) {
  return encodeURIComponent(JSON.stringify(selections));
}

export function decodeSelections(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Array<{
      menuItemId: string;
      quantity: number;
    }>;
    return parsed.filter((s) => s.quantity > 0);
  } catch {
    return [];
  }
}
