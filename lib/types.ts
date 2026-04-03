export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  isAvailable: boolean;
};

export type RestaurantTable = {
  id: string;
  tableNumber: number;
  qrSlug: string;
};

export type CartLine = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type OrderItemState = {
  id?: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantityTotal: number;
  quantityPaid: number;
  quantityRemaining: number;
};

export type PaymentMethod = "card" | "cash";
export type PaymentType = "full" | "percentage_partial" | "item_partial";
export type PaymentStatus = "pending" | "completed" | "pending_cash_confirm" | "failed";

export type PaymentRecord = {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  status: PaymentStatus;
  createdAt: string;
};

export type TableOrderState = {
  orderId?: string;
  tableId: string;
  orderItems: OrderItemState[];
  totalAmount: number;
  amountPaidByCard: number;
  amountCashPending: number;
  remainingAmount: number;
  status: "unpaid" | "partially_paid" | "pending_cash" | "paid";
  payments: PaymentRecord[];
  updatedAt: string;
};

export type ReviewRecord = {
  id: string;
  tableId: string;
  rating: number;
  feedbackText: string | null;
  redirectedToGoogle: boolean;
  createdAt: string;
};
