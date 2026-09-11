import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unknownPlaceholders } from "@/lib/email-placeholders";
import { getSupabaseAuthClient } from "@/lib/supabase/admin-client";
import type {
  EmailCopy,
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
  announce: "Handmade to order in Easley, SC",
  freeShipOver: 50,
  flatShip: 5,
  venmoHandle: "",
  categories: ["Necklaces", "Bracelets", "Chokers", "Charms"],
  heroImageUrl: null,
  aboutImageUrl: null,
  logoUrl: null,
  logoHeight: 40,
  fonts: {},
  photoShape: "square",
  photoFit: "cover",
  gridSize: "medium",
  heroSize: "medium",
  heroLayout: "side",
  heroFit: "cover",
  accent: "coral",
  sections: [
    { id: "hero", show: true },
    { id: "shop", show: true },
  ],
  hero: {
    eyebrow: "handmade, one at a time",
    eyebrowScript: "by Polly",
    title: "Colorful little pieces",
    titleScript: "worth collecting",
    lede: "Beaded necklaces, stacks, chokers, and charms, made to order in Easley, South Carolina. Pick your piece, tell us your colors, and we'll make it yours.",
    cta: "Shop the collection",
  },
  shop: {
    eyebrowScript: "the collection",
    title: "Shop by piece",
  },
  about: {
    eyebrowScript: "about",
    title: "Made by hand, one piece at a time",
    body: "Every piece is designed and strung by Polly in small batches. Choose your colors, add an initial or a charm, and each order is made just for you. Handmade to order, so most pieces ship within about a week." +
      String.fromCharCode(10, 10) +
      "This is your About page — rewrite it in your own words in the admin. Tell people who you are, what your brand is about, and how you started. Leave a blank line between paragraphs.",
  },
  customBox: {
    label: "Make it yours",
    placeholder: "Color swaps, initials, team colors, sizing…",
  },
  emails: {
    notifyOnOrder: true,
    notifyOnMessage: true,
    confirmation: {
      subject: "Your {brand} order {order}",
      heading: "Thank you, {name}!",
      message: "Each piece is handmade to order and ships in about a week.",
    },
    paymentReceived: {
      subject: "Payment received for {order}",
      heading: "Payment received, {name}",
      message:
        "Thank you \u2014 your Venmo came through and your order is now in the making queue.",
    },
    shipped: {
      subject: "{order} has shipped",
      heading: "Your pieces are on the way, {name}",
      message: "Your order is in the post and on its way to you now.",
    },
    venmoReminder: {
      subject: "A reminder about your {brand} order",
      heading: "Just a nudge, {name}",
      message:
        "Your pieces are still reserved for you. Once the Venmo comes through, we'll start making them.",
    },
    contactReply: {
      subject: "We got your message \u2014 {brand}",
      heading: "Thanks, {name} \u2014 we've got your message",
      message:
        "Polly reads every message herself and will come back to you as soon as she can. Custom pieces usually start with a few questions about colors and sizing, so expect a reply rather than a quote straight away.",
    },
    signoff: "Thank you for supporting a small handmade shop.",
  },
  contact: {
    heading: "Custom orders, pop-ups, and hellos",
    instagram: "@shop.piecesbyp",
    email: "hello@piecesbyp.co",
    maker: "Polly McCollum",
    location: "Easley, South Carolina",
    findus: "local pop-ups and markets",
  },
};


// Settings rows written before each email had its own subject and heading
// keep a single `confirmationNote` and a plain-string `contactReply`. Anything
// she typed into those is her writing, so it moves into the new shape rather
// than being silently replaced by the default.
type LegacyEmails = Partial<SiteSettingsData["emails"]> & {
  confirmationNote?: string;
  contactReply?: unknown;
};

// A field carrying a placeholder that doesn't exist falls back to the stock
// wording for that field.
//
// Her typo would otherwise reach the customer verbatim — "Thank you, {nmae}!"
// — which reads as broken to them and is invisible to her. Falling back means
// the worst case is a customer seeing perfectly good default wording, while
// the admin shows her exactly what's wrong and why hers isn't being used.
//
// Per field, not per email: one bad heading shouldn't discard a message she
// got right.
function safeField(mine: string | undefined, fallback: string): string {
  const text = mine ?? "";
  if (!text.trim()) return text;
  return unknownPlaceholders(text).length > 0 ? fallback : text;
}

function safeCopy(mine: Partial<EmailCopy> | undefined, base: EmailCopy): EmailCopy {
  return {
    subject: safeField(mine?.subject, base.subject),
    heading: safeField(mine?.heading, base.heading),
    message: safeField(mine?.message, base.message),
  };
}

function mergeEmails(row: unknown): SiteSettingsData["emails"] {
  const base = FALLBACK_SETTINGS.emails;
  const incoming = (row ?? {}) as LegacyEmails;

  const copy = (
    key: "confirmation" | "paymentReceived" | "shipped" | "venmoReminder" | "contactReply",
    legacyMessage?: string
  ): EmailCopy => {
    const saved = incoming[key];
    const fromObject =
      saved && typeof saved === "object" ? (saved as Partial<EmailCopy>) : undefined;
    return safeCopy(
      {
        ...base[key],
        ...(legacyMessage ? { message: legacyMessage } : {}),
        ...fromObject,
      },
      base[key]
    );
  };

  return {
    notifyOnOrder: incoming.notifyOnOrder ?? base.notifyOnOrder,
    notifyOnMessage: incoming.notifyOnMessage ?? base.notifyOnMessage,
    confirmation: copy("confirmation", incoming.confirmationNote),
    paymentReceived: copy("paymentReceived"),
    shipped: copy("shipped"),
    venmoReminder: copy("venmoReminder"),
    contactReply: copy(
      "contactReply",
      typeof incoming.contactReply === "string" ? incoming.contactReply : undefined
    ),
    signoff: safeField(incoming.signoff, base.signoff),
  };
}

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
    shop: { ...FALLBACK_SETTINGS.shop, ...row.shop },
    about: { ...FALLBACK_SETTINGS.about, ...row.about },
    contact: { ...FALLBACK_SETTINGS.contact, ...row.contact },
    // Merged like the rest: a settings row written before this existed
    // still gets the default wording rather than blank emails.
    customBox: { ...FALLBACK_SETTINGS.customBox, ...row.customBox },
    // Merged one level deeper than the rest, because each email is its own
    // object now. The two string fields that came before are carried across
    // rather than dropped — she may already have written them.
    emails: mergeEmails(row.emails),
  };
}

const PRODUCT_COLUMNS =
  "id, name, category, price_cents, material, description, tag, charm, charm_text, colors, color_options, custom, stock, active, sort_order, product_images(id, url, sort_order, focal_x, focal_y, zoom)";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  material: string | null;
  description: string | null;
  tag: string | null;
  charm: string | null;
  charm_text: string | null;
  color_options: string[] | null;
  colors: unknown;
  custom: boolean;
  stock: number | null;
  active: boolean;
  sort_order: number;
  product_images:
    | {
        id: string;
        url: string;
        sort_order: number;
        focal_x: number | null;
        focal_y: number | null;
        zoom: number | null;
      }[]
    | null;
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
    charm_text: p.charm_text ?? null,
    color_options: Array.isArray(p.color_options) ? p.color_options : [],
    colors: Array.isArray(p.colors) ? (p.colors as string[]) : [],
    custom: p.custom,
    stock: p.stock,
    active: p.active,
    sort_order: p.sort_order,
    // First image is the cover.
    images: (p.product_images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      // Older rows predate the focal columns; centre matches how they
      // have always rendered.
      .map((i) => ({
        ...i,
        focal_x: i.focal_x ?? 50,
        focal_y: i.focal_y ?? 50,
        zoom: i.zoom ?? 100,
      })),
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

  // Log before falling back. An empty list is indistinguishable from a
  // healthy shop with nothing in it, so a query that fails — most often a
  // migration that hasn't been run — otherwise renders as "nothing here"
  // while the rows sit safely in the database.
  if (error) console.error("[data] query failed:", error.message);
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

  // Log before falling back. An empty list is indistinguishable from a
  // healthy shop with nothing in it, so a query that fails — most often a
  // migration that hasn't been run — otherwise renders as "nothing here"
  // while the rows sit safely in the database.
  if (error) console.error("[data] query failed:", error.message);
  if (error || !data) return [];
  return (data as ProductRow[]).map(toProduct);
}

// ── orders ──────────────────────────────────────────────────

// The shop is in Easley, South Carolina. Dates are formatted server-side
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
  activeCount: number;
  newCount: number;
  makingCount: number;
  shippedCount: number;
  paidThisWeekCents: number;
  awaitingPaymentCount: number;
  archivedCount: number;
};

export async function getOrdersForOwner(): Promise<Order[]> {
  const supabase = await getSupabaseAuthClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_at, customer_name, customer_email, customer_phone, customer_instagram, address1, address2, city, state, zip, country, notes, subtotal_cents, shipping_cents, total_cents, payment_method, payment_status, paid_at, fulfillment_status, archived_at, confirmation_email, order_items(id, product_name, unit_price_cents, quantity, customization, color, line_total_cents)"
    )
    .order("created_at", { ascending: false }); // newest first

  // Log before falling back. An empty list is indistinguishable from a
  // healthy shop with nothing in it, so a query that fails — most often a
  // migration that hasn't been run — otherwise renders as "nothing here"
  // while the rows sit safely in the database.
  if (error) console.error("[data] query failed:", error.message);
  if (error || !data) return [];

  return data.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    created_at: o.created_at,
    dateLabel: formatOrderDate(o.created_at),
    archived_at: o.archived_at ?? null,
    confirmation_email: o.confirmation_email ?? null,
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

  // The counts answer "what still needs me?", so archiving an order takes
  // it out of them — that is the whole point of archiving it.
  const live = orders.filter((o) => !o.archived_at);

  return {
    activeCount: live.length,
    newCount: live.filter((o) => o.fulfillment_status === "new").length,
    makingCount: live.filter((o) => o.fulfillment_status === "making").length,
    shippedCount: live.filter((o) => o.fulfillment_status === "shipped").length,
    // Money is a fact about the week, not a to-do. Counted across every
    // order, so tidying the board can never make revenue appear to drop.
    paidThisWeekCents: orders
      .filter((o) => o.payment_status === "paid" && new Date(o.created_at).getTime() >= weekAgo)
      .reduce((sum, o) => sum + o.total_cents, 0),
    awaitingPaymentCount: live.filter((o) => o.payment_status === "pending").length,
    archivedCount: orders.length - live.length,
  };
}

// ── contact messages ────────────────────────────────────────

export async function getMessagesForOwner(): Promise<Message[]> {
  const supabase = await getSupabaseAuthClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, name, email, body, handled, created_at")
    .order("created_at", { ascending: false });

  // Log before falling back. An empty list is indistinguishable from a
  // healthy shop with nothing in it, so a query that fails — most often a
  // migration that hasn't been run — otherwise renders as "nothing here"
  // while the rows sit safely in the database.
  if (error) console.error("[data] query failed:", error.message);
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
