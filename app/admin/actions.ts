"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { getSupabaseAuthClient } from "@/lib/supabase/admin-client";
import { getAllProductsForOwner, getOrdersForOwner, getSiteSettings } from "@/lib/data";
import {
  formatAddress,
  isEmailConfigured,
  sendNewOrderEmails,
  sendPaymentReceivedEmail,
  sendShippedEmail,
  sendVenmoReminderEmail,
} from "@/lib/email";
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
import {
  FULFILLMENT_STATUSES,
  isManuallyPaid,
  type FulfillmentStatus,
  type PaymentMethod,
  type PaymentStatus,
  type SiteSettingsData,
} from "@/lib/types";

const PHOTO_BUCKET = "product-photos";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Every mutation re-renders the storefront and the admin list.
function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/admin/content");
}

// ── orders ──────────────────────────────────────────────────

// Moves an order along New -> Making -> Shipped.
export async function setOrderStatus(
  orderId: string,
  status: FulfillmentStatus
): Promise<ActionResult> {
  await requireOwner();

  // Never trust a value arriving from the browser, even from our own UI.
  if (!FULFILLMENT_STATUSES.includes(status)) {
    return { ok: false, error: "That isn't a valid order status." };
  }

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase
    .from("orders")
    .update({ fulfillment_status: status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };

  // Tapping "Shipped" is what tells the customer. No extra step for Polly.
  if (status === "shipped") {
    const [order, settings] = await Promise.all([findOrder(orderId), getSiteSettings()]);
    if (order) await sendShippedEmail(order, settings.brand);
  }

  revalidatePath("/admin/orders");
  return { ok: true };
}

// Small helper: the status actions only receive an id, but the emails need
// the customer's name, address, and total.
async function findOrder(orderId: string) {
  const orders = await getOrdersForOwner();
  return orders.find((o) => o.id === orderId) ?? null;
}

// Marks a Venmo (or other off-site) order paid or unpaid by hand.
//
// Card orders are deliberately refused: Stripe is the source of truth for
// those, and letting the admin flip them by hand would let the site disagree
// with the payment processor — the kind of mismatch that turns into a refund
// dispute. The check is here on the server, not just hidden in the UI.
export async function setPaymentStatus(
  orderId: string,
  status: PaymentStatus
): Promise<ActionResult> {
  await requireOwner();

  if (!["pending", "paid", "refunded"].includes(status)) {
    return { ok: false, error: "That isn't a valid payment status." };
  }

  const supabase = await getSupabaseAuthClient();

  const { data: order, error: readErr } = await supabase
    .from("orders")
    .select("payment_method")
    .eq("id", orderId)
    .maybeSingle();

  if (readErr) return { ok: false, error: readErr.message };
  if (!order) return { ok: false, error: "That order no longer exists." };

  if (!isManuallyPaid(order.payment_method as PaymentMethod)) {
    return {
      ok: false,
      error: "Card payments are set by Stripe and can't be changed here.",
    };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: status,
      // paid_at is what "Paid this week" and her records read from.
      paid_at: status === "paid" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };

  // Closes the loop: the customer knows their Venmo landed and stops
  // wondering whether it went through.
  if (status === "paid") {
    const [order, settings] = await Promise.all([findOrder(orderId), getSiteSettings()]);
    if (order) await sendPaymentReceivedEmail(order, settings.brand);
  }

  revalidatePath("/admin/orders");
  return { ok: true };
}

// Nudges a customer whose Venmo hasn't arrived.
//
// Deliberately a button rather than a timer. Only Polly knows whether a
// nudge is welcome — someone who messaged her this morning saying "sending
// it tonight" should not get chased, and an automated reminder would look
// impersonal from a one-person shop.
//
// Refuses card orders: those are Stripe's to chase, and there is nothing a
// customer can do about a card payment that already succeeded or failed.
export async function sendVenmoReminder(orderId: string): Promise<ActionResult> {
  await requireOwner();

  const [order, settings] = await Promise.all([findOrder(orderId), getSiteSettings()]);
  if (!order) return { ok: false, error: "That order no longer exists." };

  if (order.payment_method !== "venmo") {
    return { ok: false, error: "Reminders are only for Venmo orders." };
  }
  if (order.payment_status !== "pending") {
    return { ok: false, error: "That order is already settled — no reminder needed." };
  }
  if (!order.customer_email) {
    return { ok: false, error: "No email address on that order. Try their phone or Instagram." };
  }
  if (!isEmailConfigured()) {
    return { ok: false, error: "Email isn't switched on yet, so reminders can't send." };
  }

  const res = await sendVenmoReminderEmail(
    order,
    settings.brand,
    settings.venmoHandle,
    settings.contact.location
  );
  if (!res.sent) {
    return { ok: false, error: `Couldn't send that reminder${res.reason ? ` (${res.reason})` : ""}.` };
  }

  revalidatePath("/admin/orders");
  return { ok: true };
}

// ── products ────────────────────────────────────────────────

export async function createProduct(): Promise<ActionResult> {
  await requireOwner();
  const supabase = await getSupabaseAuthClient();

  // New pieces go to the end of the grid.
  const { data: last } = await supabase
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("products").insert({
    name: "New piece",
    category: "Necklaces",
    price_cents: 0,
    material: "",
    description: "",
    charm: "heart",
    colors: ["#E4573B", "#E7789A", "#3E9DB0", "#E9C85A"],
    custom: true,
    active: false, // hidden until she's filled it in and ticked Visible
    sort_order: (last?.sort_order ?? 0) + 10,
  });

  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const supabase = await getSupabaseAuthClient();

  const priceDollars = Number(formData.get("price") ?? 0);
  if (!Number.isFinite(priceDollars) || priceDollars < 0) {
    return { ok: false, error: "Price must be a number, 0 or more." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Give the piece a name." };

  const tag = String(formData.get("tag") ?? "").trim();
  const charm = String(formData.get("charm") ?? "").trim();

  // Unticked "limited quantity" means made to order: stock stays null and the
  // piece never sells out. Ticked means the number is authoritative.
  const tracks = formData.get("trackStock") === "on";
  let stock: number | null = null;
  if (tracks) {
    const raw = Number(formData.get("stock") ?? 0);
    if (!Number.isFinite(raw) || raw < 0) {
      return { ok: false, error: "How many left must be 0 or more." };
    }
    stock = Math.floor(raw);
  }

  const { error } = await supabase
    .from("products")
    .update({
      name,
      category: String(formData.get("category") ?? "Necklaces"),
      // Dollars in the form, cents in the database (Stripe's unit).
      price_cents: Math.round(priceDollars * 100),
      material: String(formData.get("material") ?? ""),
      description: String(formData.get("description") ?? ""),
      tag: tag === "" ? null : tag,
      charm: charm === "" ? null : charm,
      custom: formData.get("custom") === "on",
      stock,
      active: formData.get("active") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = await getSupabaseAuthClient();

  // Remove stored photos first so the bucket doesn't accumulate orphans.
  // (product_images rows cascade automatically; storage objects don't.)
  const { data: images } = await supabase.from("product_images").select("url").eq("product_id", id);
  const paths = (images ?? [])
    .map((i) => storagePathFromUrl(i.url))
    .filter((p): p is string => p !== null);
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function moveProduct(id: string, direction: -1 | 1): Promise<ActionResult> {
  await requireOwner();
  const supabase = await getSupabaseAuthClient();

  const { data: all, error: listErr } = await supabase
    .from("products")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (listErr || !all) return { ok: false, error: listErr?.message ?? "Could not load pieces." };

  const i = all.findIndex((p) => p.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= all.length) return { ok: true }; // already at the end

  // Rewrite the whole run as 10, 20, 30… after the swap. Simpler and more
  // robust than swapping two values, which breaks when orders are duplicated.
  const reordered = [...all];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];

  for (const [index, row] of reordered.entries()) {
    const { error } = await supabase
      .from("products")
      .update({ sort_order: (index + 1) * 10 })
      .eq("id", row.id);
    if (error) return { ok: false, error: error.message };
  }

  refresh();
  return { ok: true };
}

// ── photos ──────────────────────────────────────────────────

export async function uploadProductPhoto(productId: string, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const supabase = await getSupabaseAuthClient();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a photo to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "That file isn't an image." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "That photo is larger than 10MB. Try a smaller one." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

  const { data: last } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: rowErr } = await supabase.from("product_images").insert({
    product_id: productId,
    url: pub.publicUrl,
    sort_order: (last?.sort_order ?? 0) + 10,
  });
  if (rowErr) return { ok: false, error: rowErr.message };

  refresh();
  return { ok: true };
}

export async function deleteProductPhoto(imageId: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = await getSupabaseAuthClient();

  const { data: img } = await supabase
    .from("product_images")
    .select("url")
    .eq("id", imageId)
    .maybeSingle();

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false, error: error.message };

  const path = img ? storagePathFromUrl(img.url) : null;
  if (path) await supabase.storage.from(PHOTO_BUCKET).remove([path]);

  refresh();
  return { ok: true };
}

export async function makePhotoCover(productId: string, imageId: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = await getSupabaseAuthClient();

  // Cover = lowest sort_order. Drop this one below the current minimum.
  const { data: first } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("product_images")
    .update({ sort_order: (first?.sort_order ?? 10) - 10 })
    .eq("id", imageId);

  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

// Records an order Polly took herself — Instagram DM, a pop-up, in person.
// Prices are still recomputed from the products table rather than taken from
// the form, so a typo can't silently create an order whose lines don't add up
// to its total.
export async function createManualOrder(
  cart: CartInput[],
  shipping: ShippingInput,
  method: PaymentMethod,
  markPaid: boolean
): Promise<ActionResult & { orderNumber?: string }> {
  await requireOwner();

  const ship = trimShipping(shipping);
  const invalid = validateShipping(ship);
  if (invalid) return { ok: false, error: invalid };

  const [products, settings] = await Promise.all([
    getAllProductsForOwner(), // includes hidden pieces — she may sell those in person
    getSiteSettings(),
  ]);

  const priced = priceOrder(cart, products, settings);
  if (!priced.ok) return { ok: false, error: priced.error };
  const { lines, subtotal_cents, shipping_cents, total_cents } = priced.order;

  const supabase = await getSupabaseAuthClient();
  const reservation = stockPayload(lines);

  // Same reservation as public checkout — an order Polly takes at a pop-up
  // has to reduce stock too, or the website will keep selling what's gone.
  const { error: reserveErr } = await supabase.rpc("reserve_stock", { items: reservation });
  if (reserveErr) {
    return { ok: false, error: stockErrorMessage(reserveErr.message, products) };
  }
  const release = async () => {
    await supabase.rpc("release_stock", { items: reservation });
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const orderId = crypto.randomUUID();
    const orderNumber = newOrderNumber();
    const paid = markPaid && isManuallyPaid(method);

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
      payment_method: method,
      payment_status: paid ? "paid" : "pending",
      fulfillment_status: "new",
      paid_at: paid ? new Date().toISOString() : null,
    });

    if (orderErr) {
      if (orderErr.code === "23505" && attempt < 2) continue;
      await release();
      return { ok: false, error: orderErr.message };
    }

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: orderId })));

    if (itemsErr) return { ok: false, error: itemsErr.message };

    // Customer still gets a confirmation for an order Polly took by hand.
    // She doesn't get the "new order" alert — she's the one entering it.
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
      paymentMethod: method,
      venmoHandle: settings.venmoHandle,
      brand: settings.brand,
      // Her wording, edited at /admin/content.
      note: settings.emails.confirmationNote,
      signoff: settings.emails.signoff,
      notifyOwner: false,
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { ok: true, orderNumber };
  }

  await release();
  return { ok: false, error: "Couldn't create the order. Please try again." };
}

// ── site settings ───────────────────────────────────────────

export async function saveSettings(next: SiteSettingsData): Promise<ActionResult> {
  await requireOwner();
  const supabase = await getSupabaseAuthClient();

  if (!next.brand?.trim()) return { ok: false, error: "The shop name can't be empty." };
  if (!Number.isFinite(next.freeShipOver) || next.freeShipOver < 0)
    return { ok: false, error: "Free shipping threshold must be 0 or more." };
  if (!Number.isFinite(next.flatShip) || next.flatShip < 0)
    return { ok: false, error: "Flat shipping must be 0 or more." };
  if (!next.categories?.length) return { ok: false, error: "Keep at least one category." };

  const { error } = await supabase
    .from("site_settings")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

// Shared by the hero and logo uploads: validate, store, hand back a public
// URL. The caller decides which setting to write it to, and the settings
// row is only persisted when she presses Save.
async function uploadSiteImage(
  folder: string,
  formData: FormData
): Promise<ActionResult & { url?: string }> {
  await requireOwner();
  const supabase = await getSupabaseAuthClient();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "That file isn't an image." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "That image is larger than 10MB. Try a smaller one." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return { ok: true, url: pub.publicUrl };
}

export async function uploadHeroPhoto(formData: FormData) {
  return uploadSiteImage("hero", formData);
}

export async function uploadLogo(formData: FormData) {
  return uploadSiteImage("logo", formData);
}

// Public Storage URLs look like:
//   https://<ref>.supabase.co/storage/v1/object/public/product-photos/<path>
// Returns the <path> part, or null if the URL isn't from our bucket (e.g.
// an older externally-hosted image), in which case there's nothing to delete.
function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  return decodeURIComponent(url.slice(at + marker.length));
}

// ── contact messages ────────────────────────────────────────

export async function setMessageHandled(id: string, handled: boolean): Promise<ActionResult> {
  await requireOwner();
  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.from("messages").update({ handled }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/messages");
  return { ok: true };
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/messages");
  return { ok: true };
}
