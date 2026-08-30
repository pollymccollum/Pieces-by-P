"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service";
import { getProducts, getSiteSettings } from "@/lib/data";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  newOrderNumber,
  priceOrder,
  stockErrorMessage,
  stockPayload,
  trimShipping,
  validateShipping,
  type CartInput,
  type ShippingInput,
} from "@/lib/order-utils";
import { isRateLimited, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export type CardCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

// Starts a card payment.
//
// Order of operations matters:
//   1. Reprice from the database (never trust the browser)
//   2. Reserve stock — so the piece can't be sold twice while they're on
//      Stripe's payment page
//   3. Save the order as PENDING, with its own id
//   4. Create a Stripe Checkout Session carrying that id in metadata
//   5. Return the URL; the browser redirects to Stripe's hosted page
//
// The webhook later flips the order to paid and sends the emails. Creating
// the order up front means an abandoned checkout leaves a visible pending
// order Polly can clear, rather than a silently lost sale.
export async function startCardCheckout(
  cart: CartInput[],
  shipping: ShippingInput
): Promise<CardCheckoutResult> {
  const stripe = getStripe();
  if (!stripe || !isStripeConfigured()) {
    return { ok: false, error: "Card payments aren't switched on yet." };
  }

  const ship = trimShipping(shipping);
  const invalid = validateShipping(ship);
  if (invalid) return { ok: false, error: invalid };

  if (await isRateLimited("orders", ship.email)) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const [products, settings] = await Promise.all([getProducts(), getSiteSettings()]);

  const priced = priceOrder(cart, products, settings);
  if (!priced.ok) return { ok: false, error: priced.error };
  const { lines, subtotal_cents, shipping_cents, total_cents } = priced.order;

  const supabase = getSupabaseServerClient();
  const reservation = stockPayload(lines);

  // Stock changes go through the service-role client. The stock functions
  // are SECURITY DEFINER and deliberately NOT executable by anon, or any
  // visitor could call them directly and mark the shop sold out.
  if (!isServiceRoleConfigured()) {
    console.error('[order] SUPABASE_SERVICE_ROLE_KEY missing — cannot reserve stock');
    return { ok: false, error: "We couldn't complete that just now. Please try again shortly." };
  }
  const stockDb = getSupabaseServiceClient();

  const { error: reserveErr } = await stockDb.rpc("reserve_stock", { items: reservation });
  if (reserveErr) {
    return { ok: false, error: stockErrorMessage(reserveErr.message, products) };
  }
  const release = async () => {
    await stockDb.rpc("release_stock", { items: reservation });
  };

  const orderId = crypto.randomUUID();
  let orderNumber = newOrderNumber();

  for (let attempt = 0; attempt < 3; attempt++) {
    const { error: orderErr } = await supabase.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_name: ship.name,
      customer_email: ship.email || null,
      customer_phone: ship.phone || null,
      customer_instagram: ship.instagram || null,
      address1: ship.addr1,
      address2: ship.addr2 || null,
      city: ship.city,
      state: ship.state,
      zip: ship.zip,
      country: ship.country,
      notes: ship.notes || null,
      subtotal_cents,
      shipping_cents,
      total_cents,
      payment_method: "card",
      payment_status: "pending", // the webhook makes it 'paid'
      fulfillment_status: "new",
    });

    if (!orderErr) break;
    if (orderErr.code === "23505" && attempt < 2) {
      orderNumber = newOrderNumber();
      continue;
    }
    await release();
    return { ok: false, error: "Something went wrong saving your order. Please try again." };
  }

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(lines.map((l) => ({ ...l, order_id: orderId })));
  if (itemsErr) {
    await release();
    return { ok: false, error: "Something went wrong saving your order. Please try again." };
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Stripe emails its own receipt to this address too.
      customer_email: ship.email || undefined,
      line_items: [
        ...lines.map((l) => ({
          quantity: l.quantity,
          price_data: {
            currency: "usd",
            unit_amount: l.unit_price_cents,
            product_data: {
              name: l.product_name,
              ...(l.customization ? { description: `Make it yours: ${l.customization}` } : {}),
            },
          },
        })),
        // Shipping as a line item keeps the Stripe total identical to ours.
        ...(shipping_cents > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: shipping_cents,
                  product_data: { name: "Shipping" },
                },
              },
            ]
          : []),
      ],
      // The webhook reads these to find the order it belongs to.
      metadata: { order_id: orderId, order_number: orderNumber },
      payment_intent_data: {
        metadata: { order_id: orderId, order_number: orderNumber },
      },
      // Stock is reserved the moment this session is created. Expiring it
      // after 30 minutes (Stripe's minimum) means an abandoned checkout
      // returns the pieces quickly instead of holding them for a day.
      // checkout.session.expired is what releases them — see the webhook.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${site}/order/success?order=${encodeURIComponent(orderNumber)}`,
      cancel_url: `${site}/order/cancelled?order=${encodeURIComponent(orderNumber)}`,
    });

    if (!session.url) {
      await release();
      return { ok: false, error: "Couldn't start the payment. Please try again." };
    }

    return { ok: true, url: session.url };
  } catch (err) {
    // Stripe refused the session — hand the stock back so the pieces stay
    // sellable. The pending order row stays, which is deliberate: Polly can
    // see that someone tried and failed.
    await release();
    console.error("[stripe] session create failed:", err);
    return { ok: false, error: "Couldn't reach the payment page. Please try again." };
  }
}
