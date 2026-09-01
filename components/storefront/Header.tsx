"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./visuals";

export type NavLink = { href: string; label: string };

// Shop lives on the home page; About and Contact are their own routes.
export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header({
  brand,
  logoUrl,
  logoHeight,
  brandFont,
  cartCount,
  onOpenCart,
}: {
  brand: string;
  logoUrl: string | null;
  logoHeight: number;
  brandFont?: React.CSSProperties;
  cartCount: number;
  // Only the shop page can show the cart's contents — it's the page that has
  // the product list to price them against. Everywhere else this is absent
  // and the button becomes a link home.
  onOpenCart?: () => void;
}) {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <header className="pp-header">
      <div className="pp-wrap pp-headrow">
        {/* On the shop page the wordmark scrolls to the top. Everywhere
            else it is plain, non-interactive text: as a link it took on
            underline-and-visited-purple and read as a mistake. Shop in the
            nav, or the browser's back button, is how you get back. */}
        {onHome ? (
          <button className="pp-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <BrandMark brand={brand} logoUrl={logoUrl} logoHeight={logoHeight} brandFont={brandFont} />
          </button>
        ) : (
          <span className="pp-brand">
            <BrandMark brand={brand} logoUrl={logoUrl} logoHeight={logoHeight} brandFont={brandFont} />
          </span>
        )}

        <nav className="pp-nav">
          {NAV_LINKS.map((l) =>
            // Already on the shop page, "Shop" should take you to the grid
            // rather than reload the page you're looking at.
            l.href === "/" && onHome ? (
              <button
                key={l.href}
                className="pp-navlink hideM"
                onClick={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}
              >
                {l.label}
              </button>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className={`pp-navlink hideM ${pathname === l.href ? "on" : ""}`}
              >
                {l.label}
              </Link>
            )
          )}

          {onOpenCart ? (
            <button className="pp-cartbtn" onClick={onOpenCart}>
              <span className="pp-navlink" style={{ letterSpacing: ".14em" }}>
                Cart
              </span>
              {cartCount > 0 && <span className="pp-badge-count">{cartCount}</span>}
            </button>
          ) : (
            // Opens on the shop page, which is where the cart can be priced.
            <Link className="pp-cartbtn" href="/?cart=1">
              <span className="pp-navlink" style={{ letterSpacing: ".14em" }}>
                Cart
              </span>
              {cartCount > 0 && <span className="pp-badge-count">{cartCount}</span>}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
