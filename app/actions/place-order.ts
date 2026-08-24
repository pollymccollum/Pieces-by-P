"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProducts, getSiteSettings } from "@/lib/data";
import { formatAddress, sendNewOrderEmails } from "@/lib/email";
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

export type PlacedOrder = {
  orderNumber: string;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  venmoHandle: string;
};

export type PlaceOrderResult =
  | { ok: true; order: PlacedOrder }
  | { ok: false; error: string };

// Public — no auth. Anyone checking out calls this.
//
// Two things make that safe:
//   1. Prices are recomputed from the database (see priceOrder). The browser
//      only ever sends product ids, quantities, and notes.
//   2. RLS allows anon INSERT on orders/order_items and nothing else, so a
//      caller can create an order but never read anyone else's.
//
// Because anon has no SELECT on orders, we generate the row id here rather
// than asking Postgres to return it — .insert().select() would come back
// empty under those policies.
export async function placeVenmoOrder(
  cart: CartInput[],
  shipping: ShippingInput
): Promise<PlaceOrderResult> {
  const ship = trimShipping(shipping);
  const invalid = validateShipping(ship);
  if (invalid) return { ok: false, error: invalid };

  const [products, settings] = await Promise.all([getProducts(), getSiteSettings()]);

  const priced = priceOrder(cart, products, settings);
  if (!priced.ok) return { ok: false, error: priced.error };
  const { lines, subtotal_cents, shipping_cents, total_cents } = priced.order;

  const supabase = getSupabaseServerClient();
  const reservation = stockPayload(lines);

  // Reserve stock BEFORE creating the order, so a piece can't be sold twice.
  // This is one atomic statement per line inside the database — the check and
  // the decrement can't be interleaved by another shopper.
  const { error: reserveErr } = await supabase.rpc("reserve_stock", { items: reservation });
  if (reserveErr) {
    return { ok: false, error: stockErrorMessage(reserveErr.message, products) };
  }

  // From here on, any failure must hand the stock back.
  const release = async () => {
    await supabase.rpc("release_stock", { items: reservation });
  };

  // order_number is unique; retry a couple of times on the rare collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderId = crypto.randomUUID();
    const orderNumber = newOrderNumber();

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
      payment_method: "venmo",
      payment_status: "pending", // Polly confirms once the Venmo lands
      fulfillment_status: "new",
    });

    if (orderErr) {
      // 23505 = unique violation, i.e. the order number was taken.
      if (orderErr.code === "23505" && attempt < 2) continue;
      await release();
      return { ok: false, error: "Something went wrong saving your order. Please try again." };
    }

    const { error: itemsErr } = await supabase.from("order_items").insert(
      lines.map((l) => ({ ...l, order_id: orderId }))
    );

    if (itemsErr) {
      // Deliberately NOT releasing stock here: the order row exists and Polly
      // will see it, so the pieces really are committed. Handing them back
      // would risk selling the same piece again.
      // The order exists but has no lines — better that Polly sees an order
      // she can ask about than that the customer thinks nothing happened.
      return {
        ok: false,
        error: `Your order saved as ${orderNumber}, but the item list didn't. Please email us with that number.`,
      };
    }

    // Confirmation to the customer, alert to Polly. Deliberately awaited so
    // serverless doesn't kill the request before they go out, but wrapped so
    // a mail failure can never turn a saved order into an error.
    await sendNewOrderEmails({
      orderNumber,
      customerName: ship.name,
      customerEmail: ship.email,
      items: lines.map((l) => ({
        name: l.product_name,
        qty: l.quantity,
        lineTotalCents: l.line_total_cents,
        note: l.customization,
      })),
      subtotalCents: subtotal_cents,
      shippingCents: shipping_cents,
      totalCents: total_cents,
      address: formatAddress({
        name: ship.name,
        address1: ship.addr1,
        address2: ship.addr2,
        city: ship.city,
        state: ship.state,
        zip: ship.zip,
      }),
      paymentMethod: "venmo",
      venmoHandle: settings.venmoHandle,
      brand: settings.brand,
    });

    return {
      ok: true,
      order: {
        orderNumber,
        totalCents: total_cents,
        subtotalCents: subtotal_cents,
        shippingCents: shipping_cents,
        venmoHandle: settings.venmoHandle,
      },
    };
  }

  await release();
  return { ok: false, error: "Couldn't create your order. Please try again." };
}
