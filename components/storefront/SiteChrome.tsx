"use client";

import type { SiteSettingsData } from "@/lib/types";
import { fontStyle } from "@/lib/fonts";
import { storefrontStyle } from "@/lib/storefront-style";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { useCartCount } from "./useCart";

// Announcement bar, header, and footer for the pages that aren't the shop.
//
// The shop page builds its own because it also owns the cart drawer and the
// checkout view; here the Cart button is a link home, since pricing a cart
// needs the product list this page doesn't load.
export function SiteChrome({
  settings,
  children,
}: {
  settings: SiteSettingsData;
  children: React.ReactNode;
}) {
  const cartCount = useCartCount();

  return (
    <div className="pp-root" style={storefrontStyle(settings)}>
      <div className="pp-announce" style={fontStyle(settings.fonts, "announce")}>
        {settings.announce}
      </div>

      <Header
        brand={settings.brand}
        logoUrl={settings.logoUrl}
        logoHeight={settings.logoHeight}
        brandFont={fontStyle(settings.fonts, "brand")}
        cartCount={cartCount}
      />

      {children}

      <Footer brand={settings.brand} location={settings.contact.location} />
    </div>
  );
}
