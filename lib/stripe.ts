import "server-only";
import Stripe from "stripe";

// Card checkout is optional infrastructure, same pattern as email: until
// STRIPE_SECRET_KEY exists the storefront shows the card option disabled and
// everything else (Venmo, admin, orders) works untouched.
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!isStripeConfigured()) return null;
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // Pinned to the version this SDK ships with (stripe/cjs/apiVersion.js),
      // so a Stripe-side upgrade can't silently change response shapes. Bump
      // this deliberately when upgrading the package, not by accident.
      apiVersion: "2026-07-29.dahlia",
      appInfo: { name: "Pieces by P" },
    });
  }
  return cached;
}

// True once a webhook endpoint has been created in the Stripe dashboard and
// its signing secret pasted into .env. Without it we refuse to trust webhook
// payloads at all — see app/api/stripe/webhook/route.ts.
export function isWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}
