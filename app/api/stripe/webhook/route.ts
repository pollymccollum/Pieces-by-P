import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, isWebhookConfigured } from "@/lib/stripe";
import { getSupabaseServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service";
import { getSiteSettings } from "@/lib/data";
import { formatAddress, sendNewOrderEmails } from "@/lib/email";

// Stripe calls this when a payment finishes. It's a public URL on the open
// internet, so the signature check below is the only thing separating a real
// Stripe callback from anyone who can POST JSON. Without a verified
// signature we never touch the database.
//
// Set up in the Stripe dashboard: Developers → Webhooks → Add endpoint,
//   URL:    https://<site>/api/stripe/webhook
//   Events: checkout.session.completed
// then copy the signing secret into STRIPE_WEBHOOK_SECRET.

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe || !isWebhookConfigured()) {
    // Nothing configured — say so plainly rather than pretending to succeed.
    return NextResponse.json({ error: "stripe not configured" }, { status: 503 });
  }
  if (!isServiceRoleConfigured()) {
    // Marking an order paid needs privileges the public key doesn't have.
    // 500 (not 200) so Stripe retries once this is configured.
    console.error("[stripe] SUPABASE_SERVICE_ROLE_KEY missing — cannot record payment");
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  // Must be the raw body: any parsing or re-serialising changes the bytes and
  // the signature no longer matches.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe] signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // An abandoned checkout: the customer reached Stripe and never paid.
  // Its stock was reserved when the session was created, so hand it back —
  // otherwise a few abandoned carts quietly mark real pieces sold out.
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    if (orderId) await releaseStockForOrder(orderId);
    return NextResponse.json({ received: true });
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledge anything else so Stripe stops retrying it.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;

  if (!orderId) {
    console.error("[stripe] completed session with no order_id metadata:", session.id);
    return NextResponse.json({ received: true });
  }

  // Belt and braces: only mark paid if Stripe says it actually is.
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const supabase = getSupabaseServiceClient();

  // Stripe retries webhooks, so this can arrive more than once. Filtering on
  // payment_status = 'pending' makes a repeat delivery a no-op instead of
  // sending the customer a second confirmation email.
  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("payment_status", "pending")
    .select("id, order_number, customer_name, customer_email, address1, address2, city, state, zip, subtotal_cents, shipping_cents, total_cents")
    .maybeSingle();

  if (error) {
    // Return 500 so Stripe retries — a dropped payment update is worth retrying.
    console.error("[stripe] failed to mark order paid:", error.message);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  if (!updated) {
    // Already processed by an earlier delivery. Nothing to do.
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Emails only now, not when the order was created: an abandoned checkout
  // should never produce a "thanks for your order" email.
  try {
    const [settings, itemsRes] = await Promise.all([
      getSiteSettings(),
      supabase
        .from("order_items")
        .select("product_name, quantity, line_total_cents, customization")
        .eq("order_id", orderId),
    ]);

    const emailOutcome = await sendNewOrderEmails({
      orderNumber: updated.order_number,
      customerName: updated.customer_name,
      customerEmail: updated.customer_email,
      items: (itemsRes.data ?? []).map((i) => ({
        name: i.product_name,
        qty: i.quantity,
        lineTotalCents: i.line_total_cents,
        note: i.customization,
      })),
      subtotalCents: updated.subtotal_cents,
      shippingCents: updated.shipping_cents,
      totalCents: updated.total_cents,
      address: formatAddress({
        name: updated.customer_name,
        address1: updated.address1,
        address2: updated.address2,
        city: updated.city,
        state: updated.state,
        zip: updated.zip,
      }),
      paymentMethod: "card",
      venmoHandle: settings.venmoHandle,
      brand: settings.brand,
      // Her wording, edited at /admin/content.
      note: settings.emails.confirmationNote,
      signoff: settings.emails.signoff,
    });

    // Record whether the receipt actually went out. Wrapped and ignored on
    // failure: this is a note for Polly, and it must never be the reason a
    // saved order reports an error.
    if (emailOutcome) {
      await supabase
        .from("orders")
        .update({ confirmation_email: emailOutcome })
        .eq("id", orderId)
        .then(undefined, () => {});
    }
  } catch (err) {
    // The payment is recorded; a failed email must not make Stripe retry and
    // risk double-processing. Log and move on.
    console.error("[stripe] order paid but emails failed:", err);
  }

  return NextResponse.json({ received: true });
}

// Returns the stock an abandoned order was holding.
//
// Reads the order's own line items rather than the Stripe session, so the
// quantities put back are exactly the ones taken. Only touches orders still
// 'pending': a paid order must keep its stock, and Stripe can deliver an
// expiry event for a session that was completed at the last moment.
async function releaseStockForOrder(orderId: string): Promise<void> {
  try {
    const db = getSupabaseServiceClient();

    const { data: order } = await db
      .from("orders")
      .select("id, payment_status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order || order.payment_status !== "pending") return;

    const { data: items } = await db
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);

    const payload = (items ?? [])
      .filter((i) => i.product_id)
      .map((i) => ({ product_id: i.product_id, qty: i.quantity }));

    if (payload.length === 0) return;

    await db.rpc("release_stock", { items: payload });
    console.log(`[stripe] released stock for abandoned order ${orderId}`);
  } catch (err) {
    // Never throw: a failure here must not make Stripe retry forever.
    console.error("[stripe] could not release stock for", orderId, err);
  }
}
