import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/** Pin to stripe@22 typings (`ApiVersion` in node_modules/stripe). */
const STRIPE_API_VERSION = "2026-03-25.dahlia" as const;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    stripeInstance = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  }
  return stripeInstance;
}
