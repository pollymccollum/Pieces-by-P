import type { FontChoices } from "@/lib/fonts";

// Types mirroring supabase/schema.sql. Keep in sync with the database.

export type ProductImage = {
  id: string;
  url: string;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  material: string;
  description: string;
  tag: string | null;
  charm: string | null; // 'heart' | 'star' | 'coin' | null
  colors: string[]; // fallback bead colors when no photo
  custom: boolean; // show "make it yours" field
  // null = made to order, unlimited (the default). 0 = sold out. N = N left.
  stock: number | null;
  active: boolean;
  sort_order: number;
  images: ProductImage[]; // first = cover photo
};

// How many pieces left before the storefront starts warning shoppers.
export const LOW_STOCK_THRESHOLD = 5;

export type StockState =
  | { kind: "unlimited" }
  | { kind: "in"; left: number }
  | { kind: "low"; left: number }
  | { kind: "out" };

export function stockState(stock: number | null): StockState {
  if (stock === null || stock === undefined) return { kind: "unlimited" };
  if (stock <= 0) return { kind: "out" };
  if (stock < LOW_STOCK_THRESHOLD) return { kind: "low", left: stock };
  return { kind: "in", left: stock };
}

// How many more of this piece a shopper may add, given what's already
// in their cart. Infinity for made-to-order pieces.
export function remainingFor(stock: number | null, inCart: number): number {
  if (stock === null || stock === undefined) return Infinity;
  return Math.max(0, stock - inCart);
}

export type HeroContent = {
  eyebrow: string;
  eyebrowScript: string;
  title: string;
  titleScript: string;
  lede: string;
  cta: string;
};

export type AboutContent = {
  eyebrowScript: string;
  title: string;
  body: string;
};

export type ContactContent = {
  heading: string;
  instagram: string;
  email: string;
  maker: string;
  location: string;
  findus: string;
};

// Wording Polly can rewrite in the site editor. The facts around it —
// order number, items, totals, address, the Venmo instructions — stay
// generated, so editing the friendly part can't break the useful part.
export type EmailContent = {
  // Sits under "Thank you, <first name>!" in the order confirmation.
  confirmationNote: string;
  // Closing line on the confirmation, above the footer.
  signoff: string;
  // The auto-reply to someone who used the custom-orders form.
  contactReply: string;
};

// Client-side cart state. `product` is resolved live from the loaded
// products list (not stored), so edits to price/name during a session stay
// in sync — mirrors how pieces-by-p-store.jsx joins cart lines to products.
export type CartItem = {
  lineId: string;
  productId: string;
  qty: number;
  note: string;
};

export type CartLine = CartItem & { product: Product };

// ── contact messages ────────────────────────────────────────
// Enquiries from the contact form. Stored rather than only emailed, so a
// message survives email being misconfigured or a provider outage.

export type Message = {
  id: string;
  name: string;
  email: string;
  body: string;
  handled: boolean;
  created_at: string;
  dateLabel: string; // preformatted server-side, like orders
};

// ── orders ──────────────────────────────────────────────────
// Mirrors the orders / order_items tables. Line items snapshot the name
// and price at purchase time, so an order stays correct even if the piece
// is later renamed, repriced, or deleted.

export type PaymentStatus = "pending" | "paid" | "refunded";
export type FulfillmentStatus = "new" | "making" | "shipped";
export const FULFILLMENT_STATUSES: FulfillmentStatus[] = ["new", "making", "shipped"];

// 'card' is confirmed automatically by the Stripe webhook. Anything else is
// settled outside the site (Venmo, cash at a pop-up), so only Polly can say
// whether the money arrived — see MANUAL_PAYMENT_METHODS below.
export type PaymentMethod = "card" | "venmo";
export const MANUAL_PAYMENT_METHODS: PaymentMethod[] = ["venmo"];

export function isManuallyPaid(method: PaymentMethod): boolean {
  return MANUAL_PAYMENT_METHODS.includes(method);
}

export type OrderItem = {
  id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  customization: string | null; // the customer's "make it yours" note
  line_total_cents: number;
};

export type Order = {
  id: string;
  order_number: string;
  created_at: string;
  dateLabel: string; // preformatted in the shop's timezone (avoids hydration drift)
  customer_name: string;
  // At least one of these three is present; none is guaranteed.
  customer_email: string | null;
  customer_phone: string | null;
  customer_instagram: string | null; // bare handle, no @
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  notes: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paid_at: string | null;
  fulfillment_status: FulfillmentStatus;
  // Set when Polly clears a finished order off the board. The order keeps
  // every detail; it just stops competing for attention. null = on the board.
  archived_at: string | null;
  items: OrderItem[];
};

// Page sections Polly can show/hide and reorder from the site editor.
// 'shop' is deliberately not hideable (it's a store) but can be moved.
export const SECTION_IDS = ["hero", "shop", "about", "contact"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export type SectionSetting = {
  id: SectionId;
  show: boolean;
};

// ── photo display presets ───────────────────────────────────
// These drive CSS custom properties on the storefront root, so the admin
// and the shop always read the same source of truth. Keys are what land
// in site_settings; never store the raw CSS values.

// Shape of every product photo tile.
export const PHOTO_SHAPES = {
  square: { label: "Square", ratio: "1 / 1" },
  tall: { label: "Tall", ratio: "4 / 5" },
  wide: { label: "Wide", ratio: "4 / 3" },
} as const;
export type PhotoShape = keyof typeof PHOTO_SHAPES;

// cover = fill the tile, cropping the edges if the photo isn't that shape.
// contain = show the whole photo, with background around it.
export const PHOTO_FITS = {
  cover: { label: "Fill the frame", help: "Photos fill the tile. Edges may be trimmed." },
  contain: { label: "Show the whole photo", help: "Nothing is cut off. Leaves space around odd shapes." },
} as const;
export type PhotoFit = keyof typeof PHOTO_FITS;

// How many tiles per row, at phone / tablet / desktop. Fewer = bigger photos.
export const GRID_SIZES = {
  large: { label: "Large", cols: [1, 2, 3], help: "Fewer, bigger photos" },
  medium: { label: "Medium", cols: [2, 3, 4], help: "The original layout" },
  small: { label: "Small", cols: [2, 4, 5], help: "More pieces on screen at once" },
} as const;
export type GridSize = keyof typeof GRID_SIZES;

// How the hero image sits against the hero text. A collage wants width —
// squeezed into the side panel its individual pieces get too small to read.
export const HERO_LAYOUTS = {
  image: {
    label: "Just the collage",
    help: "No hero text at all — the collage leads straight into the collection.",
  },
  top: {
    label: "Full width, above the text",
    help: "The image is the first thing on the page. Best for a collage.",
  },
  side: {
    label: "Beside the text",
    help: "The original design. Good for one strong photo.",
  },
  band: {
    label: "Full width, under the text",
    help: "Best for a collage — it gets the whole width.",
  },
  background: {
    label: "Full width, text on top",
    help: "Boldest. Needs an image that isn't busy behind the words.",
  },
} as const;
export type HeroLayout = keyof typeof HERO_LAYOUTS;

// Hero banner height, phone / desktop.
export const HERO_SIZES = {
  short: { label: "Short", heights: ["200px", "260px"] },
  medium: { label: "Medium", heights: ["270px", "340px"] },
  tall: { label: "Tall", heights: ["340px", "460px"] },
} as const;
export type HeroSize = keyof typeof HERO_SIZES;

// Accent colour presets. Keys are stored in site_settings; the hex
// values drive --coral at render time (hero script, tag pills, cart count).
export const ACCENTS = {
  coral: { label: "Coral", hex: "#E4573B" },
  pink: { label: "Pink", hex: "#E15E92" },
  sage: { label: "Sage", hex: "#6E7F49" },
  gold: { label: "Gold", hex: "#C79A3E" },
  blue: { label: "Blue", hex: "#3E9DB0" },
} as const;
export type AccentKey = keyof typeof ACCENTS;

// Shape of the JSONB `data` column on the single site_settings row.
export type SiteSettingsData = {
  brand: string;
  announce: string;
  freeShipOver: number; // dollars
  flatShip: number; // dollars
  venmoHandle: string; // shown on the orders page when chasing a Venmo payment
  categories: string[];
  heroImageUrl: string | null; // Supabase Storage URL; null = beaded-strand illustration
  // Header logo. null = the sage "P" badge + letterspaced wordmark.
  // A logo usually already contains the shop name, so it replaces both.
  logoUrl: string | null;
  logoHeight: number; // px tall in the header; width scales to match
  // Per-field font overrides chosen in the site editor. Absent or
  // 'inherit' means the field keeps the design's own font.
  fonts: FontChoices;
  photoShape: PhotoShape;
  photoFit: PhotoFit;
  gridSize: GridSize;
  heroSize: HeroSize;
  heroLayout: HeroLayout;
  // 'contain' shows the whole image — what a collage needs. 'cover' fills
  // the frame and crops, which suits a single photo.
  heroFit: PhotoFit;
  accent: AccentKey;
  sections: SectionSetting[];
  hero: HeroContent;
  about: AboutContent;
  contact: ContactContent;
  emails: EmailContent;
};
