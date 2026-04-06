import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const buf = await req.text();
  const sig = req.headers.get("stripe-signature");
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const { getStripe } = await import("@/lib/stripe");
  const stripe = getStripe();

  let event: Stripe.Event;

  if (endpointSecret) {
    try {
      event = stripe.webhooks.constructEvent(buf, sig!, endpointSecret);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    event = JSON.parse(buf) as Stripe.Event;
    console.warn("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { orderId, tableSlug } = session.metadata ?? {};
    console.log(
      `[stripe-webhook] Payment completed — order=${orderId} table=${tableSlug} amount=${session.amount_total}`,
    );
  }

  return NextResponse.json({ received: true });
}
