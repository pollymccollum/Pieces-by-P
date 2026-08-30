import { stockState, type Product, type SiteSettingsData } from "@/lib/types";

// Pure helpers shared by the public checkout and the admin's manual order
// entry. Kept out of the "use server" action files, which may only export
// async functions.

export type CartInput = { productId: string; qty: number; note: string };

export type ShippingInput = {
  name: string;
  email: string;
  phone: string;
  instagram: string;
  addr1: string;
  addr2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  notes: string;
};

export type PricedLine = {
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  customization: string | null;
  line_total_cents: number;
};

export type PricedOrder = {
  lines: PricedLine[];
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
};

const MAX_QTY_PER_LINE = 50;
// Quantity per line was capped but the line count wasn't, so a crafted
// request could contain thousands of items. Far above any real basket.
const MAX_LINES = 40;

export function newOrderNumber(): string {
  // PBP-XXXXX. Ambiguous characters (0/O, 1/I) are excluded so Polly and her
  // customers can read these aloud or copy them into a Venmo note reliably.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `PBP-${out}`;
}

// Payload for the reserve_stock / release_stock database functions.
export function stockPayload(lines: PricedLine[]) {
  return lines.map((l) => ({ product_id: l.product_id, qty: l.quantity }));
}

// Turns a Postgres error from reserve_stock into something a shopper can act
// on. The function raises 'OUT_OF_STOCK:<uuid>' when a piece went while they
// were filling in the form.
export function stockErrorMessage(message: string, products: Product[]): string {
  const match = /OUT_OF_STOCK:([0-9a-f-]+)/i.exec(message);
  if (match) {
    const p = products.find((x) => x.id === match[1]);
    return p
      ? `${p.name} sold out while you were checking out. Please remove it and try again.`
      : "One of those pieces sold out while you were checking out.";
  }
  if (/NO_SUCH_PRODUCT/i.test(message)) {
    return "One of those pieces is no longer available.";
  }
  return "Couldn't reserve those pieces. Please try again.";
}

export function shippingCentsFor(subtotalCents: number, settings: SiteSettingsData): number {
  if (subtotalCents <= 0) return 0;
  const freeOver = Math.round((settings.freeShipOver || 0) * 100);
  if (freeOver > 0 && subtotalCents >= freeOver) return 0;
  return Math.round((settings.flatShip || 0) * 100);
}

// Rebuilds the order from database prices. The browser sends product ids,
// quantities, and notes only — never money. Anything a customer could edit
// in devtools is recalculated here, so a tampered cart can't change what
// they are charged or what Polly is owed.
export function priceOrder(
  cart: CartInput[],
  products: Product[],
  settings: SiteSettingsData
): { ok: true; order: PricedOrder } | { ok: false; error: string } {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }
  if (cart.length > MAX_LINES) {
    return { ok: false, error: "That's too many different pieces in one order." };
  }

  const lines: PricedLine[] = [];

  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return { ok: false, error: "One of those pieces is no longer available." };
    }

    const qty = Math.floor(Number(item.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      return { ok: false, error: `Quantity for ${product.name} isn't valid.` };
    }

    // Friendly, specific message before we hit the database. reserve_stock()
    // re-checks atomically — this is for a clear error, not for safety.
    const st = stockState(product.stock);
    if (st.kind === "out") {
      return { ok: false, error: `${product.name} just sold out.` };
    }
    if ((st.kind === "low" || st.kind === "in") && qty > st.left) {
      return {
        ok: false,
        error: `Only ${st.left} left of ${product.name} — please lower the quantity.`,
      };
    }

    const note = (item.note ?? "").trim().slice(0, 500) || null;

    lines.push({
      product_id: product.id,
      product_name: product.name,
      unit_price_cents: product.price_cents,
      quantity: qty,
      customization: note,
      line_total_cents: product.price_cents * qty,
    });
  }

  const subtotal_cents = lines.reduce((s, l) => s + l.line_total_cents, 0);
  const shipping_cents = shippingCentsFor(subtotal_cents, settings);

  return {
    ok: true,
    order: { lines, subtotal_cents, shipping_cents, total_cents: subtotal_cents + shipping_cents },
  };
}

// Instagram handles get typed every which way: "@name", "name",
// "instagram.com/name", or a full URL. Store the bare handle so the admin
// can reliably build a profile link and a DM is always one tap away.
export function normalizeInstagram(raw: string): string {
  return (raw ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?instagram\.com\//i, "")
    .replace(/^@+/, "")
    .replace(/\/.*$/, "")
    .replace(/[^A-Za-z0-9._]/g, "")
    .slice(0, 30);
}

// Email is required: it's how the confirmation, payment-received, and
// shipped notices reach the customer, and those only work if every order has
// one. Phone and Instagram stay optional — handy extra ways for Polly to
// chase a Venmo payment, but not worth turning away a sale over.
export function validateShipping(s: ShippingInput): string | null {
  if (!s.name.trim()) return "Enter a full name.";
  if (!s.email.trim()) return "Enter an email address so we can send your confirmation.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())) {
    return "That email address doesn't look right.";
  }
  if (s.phone.trim() && s.phone.replace(/\D/g, "").length < 7) {
    return "That phone number looks too short.";
  }
  if (!s.addr1.trim()) return "Enter a street address.";
  if (!s.city.trim()) return "Enter a city.";
  if (!s.state.trim()) return "Enter a state.";
  if (!s.zip.trim()) return "Enter a ZIP code.";
  return null;
}

export function trimShipping(s: ShippingInput): ShippingInput {
  const clip = (v: string, n = 200) => (v ?? "").trim().slice(0, n);
  return {
    name: clip(s.name),
    email: clip(s.email),
    phone: clip(s.phone, 40),
    instagram: normalizeInstagram(s.instagram),
    addr1: clip(s.addr1),
    addr2: clip(s.addr2),
    city: clip(s.city, 100),
    state: clip(s.state, 60),
    zip: clip(s.zip, 20),
    country: clip(s.country, 100) || "United States",
    notes: clip(s.notes, 1000),
  };
}
