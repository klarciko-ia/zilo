export async function fetchTableData(slug: string) {
  const res = await fetch(`/api/tables/${slug}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchOrder(slug: string) {
  const res = await fetch(`/api/tables/${slug}/order`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.order ?? null;
}

export async function createOrder(
  slug: string,
  items: Array<{ menuItemId: string; name: string; unitPrice: number; quantity: number }>
) {
  const res = await fetch(`/api/tables/${slug}/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function createPayment(data: {
  orderId: string;
  paymentType: string;
  paymentMethod: string;
  amount: number;
  itemSelections?: Array<{ orderItemId: string; quantity: number }>;
}) {
  const res = await fetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) return { error: body.error || "Payment failed" };
  return body;
}

export async function confirmCashPayment(paymentId: string) {
  const res = await fetch(`/api/payments/${paymentId}/confirm`, {
    method: "POST",
  });
  const body = await res.json();
  if (!res.ok) return { error: body.error || "Confirmation failed" };
  return body;
}

export async function postReview(data: {
  tableSlug: string;
  orderId?: string | null;
  rating: number;
  feedbackText?: string | null;
  redirectedToGoogle: boolean;
}) {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) return { error: body.error || "Review failed" };
  return body;
}

export async function fetchAllReviews() {
  const res = await fetch("/api/reviews");
  if (!res.ok) return [];
  const data = await res.json();
  return data.reviews ?? [];
}

export async function fetchAdminTables() {
  const res = await fetch("/api/admin/tables");
  if (!res.ok) return null;
  return res.json();
}

export async function loginAdminApi(email: string, password: string) {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) return { error: body.error || "Login failed" };
  return body;
}
