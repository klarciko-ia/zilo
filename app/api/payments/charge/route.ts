import { NextRequest, NextResponse } from "next/server";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "idr", "jpy", "kmf", "krw", "mga", "pyg",
  "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

export async function POST(req: NextRequest) {
  const { orderId, amount, currency, tableSlug, tipAmount = 0 } = await req.json();

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ url: null, fallback: true });
  }

  const { getStripe } = await import("@/lib/stripe");
  const stripe = getStripe();

  const total = amount + tipAmount;
  const cur = (currency as string).toLowerCase();
  const amountInSmallestUnit = ZERO_DECIMAL_CURRENCIES.has(cur)
    ? Math.round(total)
    : Math.round(total * 100);

  const origin = req.headers.get("origin") || req.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: cur,
          unit_amount: amountInSmallestUnit,
          product_data: { name: `Order ${orderId}` },
        },
        quantity: 1,
      },
    ],
    metadata: { orderId, tableSlug },
    success_url: `${origin}/table/${tableSlug}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/table/${tableSlug}/checkout/method`,
  });

  return NextResponse.json({ url: session.url });
}
