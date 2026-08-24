import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAuthClient } from "@/lib/supabase/admin-client";
import type {
  FulfillmentStatus,
  Message,
  Order,
  PaymentMethod,
  PaymentStatus,
  Product,
  SiteSettingsData,
} from "@/lib/types";

// Fallback content merged under whatever is in the database, so the site
// still renders sensibly if a field hasn't been filled in yet in
// site_settings (e.g. right after running the bare schema.sql seed, which
// only sets brand/announce/shipping/categories, not hero/about/contact).
const FALLBACK_SETTINGS: SiteSettingsData = {
  brand: "Pieces by P",
  announce: "Handmade to order in Anderson, SC",
  freeShipOver: 50,
  flatShip: 5,
  venmoHandle: "",
  categories: ["Necklaces", "Bracelets", "Chokers", "Charms"],
  heroImageUrl: null,
  logoUrl: null,
  logoHeight: 40,
  photoShape: "square",
  photoFit: "cover",
  gridSize: "medium",
  heroSize: "medium",
  accent: "coral",
  sections: [
    { id: "hero", show: true },
    { id: "shop", show: true },
    { id: "about", show: true },
    { id: "contact", show: true },
  ],
  hero: {
    eyebrow: "handmade, one at a time",
    eyebrowScript: "by Polly",
    title: "Colorful little pieces",
    titleScript: "worth collecting",
    lede: "Beaded necklaces, stacks, chokers, and charms, made to order in Anderson, South Carolina. Pick your piece, tell us your colors, and we'll make it yours.",
    cta: "Shop the collection",
  },
  about: {
    eyebrowScript: "about",
    title: "Made by hand, one piece at a time",
    body: "Every piece is designed and strung by Polly in small batches. Choose your colors, add an initial or a charm, and each order is made just for you. Handmade to order, so most pieces ship within about a week.",
  },
  contact: {
    heading: "Custom orders, pop-ups, and hellos",
    instagram: "@shop.piecesbyp",
    email: "hello@piecesbyp.co",
    maker: "Polly McCollum",
    location: "Anderson, South Carolina",
    findus: "local pop-ups and markets",
  },
};

export async function getSiteSettings(): Promise<SiteSettingsData> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("data")
    .eq("id", 1)
    .single();

  if (error || !data) {
    // No row yet (schema just applied, seed not run) — fall back quietly.
    return FALLBACK_SETTINGS;
  }

  const row = data.data as Partial<SiteSettingsData>;
  return {
    ...FALLBACK_SETTINGS,
    ...row,
    hero: { ...FALLBACK_SETTINGS.hero, ...row.hero },
    about: { ...FALLBACK_SETTINGS.about, ...row.about },
    contact: { ...FALLBACK_SETTINGS.contact, ...row.contact },
  };
}

const PRODUCT_COLUMNS =
  "id, name, category, price_cents, material, description, tag, charm, colors, custom, stock, active, sort_order, product_images(id, url, sort_order)";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  material: string | null;
  description: string | null;
  tag: string | null;
  charm: string | null;
  colors: unknown;
  custom: boolean;
  stock: number | null;
  active: boolean;
  sort_order: number;
  product_images: { id: string; url: string; sort_order: number }[] | null;
};

function toProduct(p: ProductRow): Product {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price_cents: p.price_cents,
    material: p.material ?? "",
    description: p.description ?? "",
    tag: p.tag,
    charm: p.charm,
    colors: Array.isArray(p.colors) ? (p.colors as string[]) : [],
    custom: p.custom,
    stock: p.stock,
    active: p.active,
    sort_order: p.sort_order,
    // First image is the cover.
    images: (p.product_images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
  };
}

// Storefront: active pieces only (also enforced by RLS).
export async function getProducts(): Promise<Product[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as ProductRow[]).map(toProduct);
}

// Admin: every piece, including hidden ones. Uses the owner's authenticated
// client, so RLS ("owner all products") is what permits seeing inactive rows.
export async function getAllProductsForOwner(): Promise<Product[]> {
  const supabase = await getSupabaseAuthClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as ProductRow[]).map(toProduct);
}

// ── orders ──────────────────────────────────────────────────

// The shop is in Anderson, South Carolina. Dates are formatted server-side
// in this zone rather than the browser's: it keeps server and client HTML
// identical (no hydration mismatch) and shows Polly her own local time
// regardless of where the site ends up hosted.
const SHOP_TIMEZONE = "America/New_York";

function formatOrderDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: SHOP_TIMEZONE,
  }).format(new Date(iso));
}

export type OrderStats = {
  newCount: number;
  makingCount: number;
  shippedCount: number;
  paidThisWeekCents: number;
  awaitingPaymentCount: number;
};

export async function getOrdersForOwner(): Promise<Order[]> {
  const supabase = await getSupabaseAuthClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_at, customer_name, customer_email, customer_phone, customer_instagram, address1, address2, city, state, zip, country, notes, subtotal_cents, shipping_cents, total_cents, payment_method, payment_status, paid_at, fulfillment_status, order_items(id, product_name, unit_price_cents, quantity, customization, line_total_cents)"
    )
    .order("created_at", { ascending: false }); // newest first

  if (error || !data) return [];

  return data.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    created_at: o.created_at,
    dateLabel: formatOrderDate(o.created_at),
    customer_name: o.customer_name,
    customer_email: o.customer_email,
    customer_phone: o.customer_phone,
    customer_instagram: o.customer_instagram,
    address1: o.address1,
    address2: o.address2,
    city: o.city,
    state: o.state,
    zip: o.zip,
    country: o.country,
    notes: o.notes,
    subtotal_cents: o.subtotal_cents,
    shipping_cents: o.shipping_cents,
    total_cents: o.total_cents,
    payment_method: o.payment_method as PaymentMethod,
    payment_status: o.payment_status as PaymentStatus,
    paid_at: o.paid_at,
    fulfillment_status: o.fulfillment_status as FulfillmentStatus,
    items: o.order_items ?? [],
  }));
}

// "Paid this week" means the last 7 days, not everything ever — the label
// on the dashboard says week, so the number should mean it.
export function summariseOrders(orders: Order[]): OrderStats {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return {
    newCount: orders.filter((o) => o.fulfillment_status === "new").length,
    makingCount: orders.filter((o) => o.fulfillment_status === "making").length,
    shippedCount: orders.filter((o) => o.fulfillment_status === "shipped").length,
    paidThisWeekCents: orders
      .filter((o) => o.payment_status === "paid" && new Date(o.created_at).getTime() >= weekAgo)
      .reduce((sum, o) => sum + o.total_cents, 0),
    awaitingPaymentCount: orders.filter((o) => o.payment_status === "pending").length,
  };
}

// ── contact messages ────────────────────────────────────────

export async function getMessagesForOwner(): Promise<Message[]> {
  const supabase = await getSupabaseAuthClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, name, email, body, handled, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    body: m.body,
    handled: m.handled,
    created_at: m.created_at,
    dateLabel: formatOrderDate(m.created_at),
  }));
}

export async function countUnhandledMessages(): Promise<number> {
  const supabase = await getSupabaseAuthClient();
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("handled", false);
  return error ? 0 : (count ?? 0);
}
