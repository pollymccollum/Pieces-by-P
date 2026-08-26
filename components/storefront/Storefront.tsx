"use client";

import { useMemo, useState } from "react";
import {
  ACCENTS,
  GRID_SIZES,
  HERO_SIZES,
  PHOTO_SHAPES,
  remainingFor,
  SECTION_IDS,
  type CartItem,
  type CartLine,
  type Product,
  type SectionId,
  type SectionSetting,
  type SiteSettingsData,
} from "@/lib/types";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { ShopGrid } from "./ShopGrid";
import { ProductModal } from "./ProductModal";
import { CartDrawer } from "./CartDrawer";
import { CheckoutView } from "./CheckoutView";
import { fontStyle } from "@/lib/fonts";
import { OrderConfirmation } from "./OrderConfirmation";
import type { PlacedOrder } from "@/app/actions/place-order";
import type { ShippingInput } from "@/lib/order-utils";
import { AboutSection } from "./AboutSection";
import { ContactSection } from "./ContactSection";
import { Footer } from "./Footer";
import { BeadDivider } from "./visuals";

function newLineId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
}

// Sections come from the database, where the owner sets order and visibility.
// Anything missing (an older settings row, or a section added in a later
// release) is appended visible, so the page can never silently lose a section.
function resolveSections(configured: SectionSetting[] | undefined): SectionSetting[] {
  const list = Array.isArray(configured) ? configured.filter((s) => SECTION_IDS.includes(s.id)) : [];
  const seen = new Set(list.map((s) => s.id));
  const missing = SECTION_IDS.filter((id) => !seen.has(id)).map((id) => ({ id, show: true }));
  return [...list, ...missing];
}

export function Storefront({
  settings,
  products,
  cardAvailable,
}: {
  settings: SiteSettingsData;
  products: Product[];
  cardAvailable: boolean;
}) {
  const [category, setCategory] = useState("All");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState<"shop" | "checkout" | "confirmed">("shop");
  const [placed, setPlaced] = useState<{ order: PlacedOrder; ship: ShippingInput } | null>(null);

  const activeProduct = products.find((p) => p.id === activeId) ?? null;

  const cartLines: CartLine[] = useMemo(
    () =>
      cart
        .map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return product ? { ...item, product } : null;
        })
        .filter((l): l is CartLine => l !== null),
    [cart, products]
  );

  const sections = useMemo(() => resolveSections(settings.sections), [settings.sections]);

  // The owner's appearance settings, expressed as CSS custom properties on
  // the storefront root. globals.css reads these with the original design as
  // fallbacks, so an unsaved or partial settings row still renders correctly.
  const rootStyle = useMemo(() => {
    const grid = GRID_SIZES[settings.gridSize] ?? GRID_SIZES.medium;
    const hero = HERO_SIZES[settings.heroSize] ?? HERO_SIZES.medium;
    const shape = PHOTO_SHAPES[settings.photoShape] ?? PHOTO_SHAPES.square;
    const accent = ACCENTS[settings.accent] ?? ACCENTS.coral;

    return {
      "--coral": accent.hex,
      "--tile-ratio": shape.ratio,
      "--photo-fit": settings.photoFit === "contain" ? "contain" : "cover",
      "--cols-sm": grid.cols[0],
      "--cols-md": grid.cols[1],
      "--cols-lg": grid.cols[2],
      "--hero-h-sm": hero.heights[0],
      "--hero-h-lg": hero.heights[1],
    } as React.CSSProperties;
  }, [
    settings.accent,
    settings.gridSize,
    settings.heroSize,
    settings.photoShape,
    settings.photoFit,
  ]);

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const subtotalCents = cartLines.reduce((s, l) => s + l.product.price_cents * l.qty, 0);
  const freeShipOverCents = Math.round(settings.freeShipOver * 100);
  const flatShipCents = Math.round(settings.flatShip * 100);
  const shipCents = subtotalCents === 0 || subtotalCents >= freeShipOverCents ? 0 : flatShipCents;
  const totalCents = subtotalCents + shipCents;

  // How many of a piece are already in the cart, across all its note variants.
  const qtyInCart = (productId: string) =>
    cart.filter((l) => l.productId === productId).reduce((s, l) => s + l.qty, 0);

  const addToCart = (product: Product, qty: number, note: string) => {
    const cleanNote = note.trim();
    setCart((prev) => {
      const already = prev.filter((l) => l.productId === product.id).reduce((s, l) => s + l.qty, 0);
      const room = remainingFor(product.stock, already);
      const add = Math.min(qty, room);
      if (add < 1) return prev;

      const existing = prev.find((l) => l.productId === product.id && l.note === cleanNote);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, qty: l.qty + add } : l));
      }
      return [...prev, { lineId: newLineId(), productId: product.id, qty: add, note: cleanNote }];
    });
    setActiveId(null);
    setCartOpen(true);
  };

  // Raising a line's quantity is capped by what's left, counting the other
  // lines of the same piece (someone can have two lines with different notes).
  const setLineQty = (lineId: string, qty: number) =>
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.lineId !== lineId) return [l];
        if (qty <= 0) return [];
        const product = products.find((p) => p.id === l.productId);
        const otherLines = prev
          .filter((x) => x.productId === l.productId && x.lineId !== lineId)
          .reduce((s, x) => s + x.qty, 0);
        const room = remainingFor(product?.stock ?? null, otherLines);
        return [{ ...l, qty: Math.min(qty, room) }];
      })
    );

  if (view === "confirmed" && placed) {
    return (
      <div className="pp-root" style={rootStyle}>
        <OrderConfirmation
          order={placed.order}
          customerName={placed.ship.name}
          customerEmail={placed.ship.email}
          onBackToShop={() => {
            setPlaced(null);
            setView("shop");
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  if (view === "checkout") {
    return (
      <div className="pp-root" style={rootStyle}>
        <CheckoutView
          brand={settings.brand}
          logoUrl={settings.logoUrl}
          logoHeight={settings.logoHeight}
          brandFont={fontStyle(settings.fonts, "brand")}
          lines={cartLines}
          subtotalCents={subtotalCents}
          shipCents={shipCents}
          totalCents={totalCents}
          venmoHandle={settings.venmoHandle}
          cardAvailable={cardAvailable}
          onBack={() => setView("shop")}
          onPlaced={(order, ship) => {
            setPlaced({ order, ship });
            setCart([]); // order is saved; don't let it be submitted twice
            setView("confirmed");
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  const sectionNode: Record<SectionId, React.ReactNode> = {
    hero: (
      <Hero key="hero" hero={settings.hero} heroImageUrl={settings.heroImageUrl} fonts={settings.fonts} />
    ),
    shop: (
      <ShopGrid
        key="shop"
        products={products}
        categories={settings.categories}
        category={category}
        onCategoryChange={setCategory}
        onSelectProduct={(id) => setActiveId(id)}
      />
    ),
    about: <AboutSection key="about" about={settings.about} fonts={settings.fonts} />,
    contact: <ContactSection key="contact" contact={settings.contact} fonts={settings.fonts} />,
  };

  const visible = sections.filter((s) => s.show);

  // Only link to sections that are actually on the page, in page order.
  // The hero has no anchor of its own — the wordmark scrolls to the top.
  const NAV_LABELS: Partial<Record<SectionId, string>> = {
    shop: "Shop",
    about: "About",
    contact: "Contact",
  };
  const navLinks = visible
    .filter((s) => NAV_LABELS[s.id])
    .map((s) => ({ id: s.id, label: NAV_LABELS[s.id]! }));

  return (
    <div className="pp-root" style={rootStyle}>
      <div className="pp-announce" style={fontStyle(settings.fonts, "announce")}>
        {settings.announce}
      </div>

      <Header
        brand={settings.brand}
        logoUrl={settings.logoUrl}
        logoHeight={settings.logoHeight}
        brandFont={fontStyle(settings.fonts, "brand")}
        cartCount={cartCount}
        links={navLinks}
        onOpenCart={() => setCartOpen(true)}
      />

      {visible.map((s, i) => (
        <div key={s.id} style={{ display: "contents" }}>
          {sectionNode[s.id]}
          {/* The bead rule sits between the grid and whatever follows it. */}
          {s.id === "shop" && i < visible.length - 1 && (
            <div className="pp-wrap">
              <BeadDivider />
            </div>
          )}
        </div>
      ))}

      <Footer brand={settings.brand} location={settings.contact.location} links={navLinks} />

      {activeProduct && (
        <ProductModal
          product={activeProduct}
          inCart={qtyInCart(activeProduct.id)}
          onClose={() => setActiveId(null)}
          onAddToCart={addToCart}
        />
      )}

      {cartOpen && (
        <CartDrawer
          lines={cartLines}
          subtotalCents={subtotalCents}
          shipCents={shipCents}
          totalCents={totalCents}
          freeShipOverCents={freeShipOverCents}
          onClose={() => setCartOpen(false)}
          onSetQty={setLineQty}
          onCheckout={() => {
            setCartOpen(false);
            setView("checkout");
            window.scrollTo({ top: 0 });
          }}
        />
      )}
    </div>
  );
}
