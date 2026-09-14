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
        {/* On the shop page it scrolls to the top; everywhere else it goes
            home, which is what people already try first.

            It was left inert once before because as a link it picked up
            underline-and-visited-purple and read as broken. That was a
            styling bug, since fixed — the logo now looks identical whether
            it's a link or not, so there's no reason to withhold the one
            behaviour every shopper expects of it. */}
        {onHome ? (
          <button className="pp-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <BrandMark
              brand={brand}
              logoUrl={logoUrl}
              logoHeight={logoHeight}
              brandFont={brandFont}
              showWord={false}
            />
          </button>
        ) : (
          <Link className="pp-brand" href="/" aria-label={`${brand} — back to the shop`}>
            <BrandMark
              brand={brand}
              logoUrl={logoUrl}
              logoHeight={logoHeight}
              brandFont={brandFont}
              showWord={false}
            />
          </Link>
        )}

        {/* Centred on the page rather than sitting beside the mark, so it stays
            centred however wide the logo or the nav happen to be. Absolutely
            positioned for that reason: laying it out in the flex row would
            centre it in the gap between them, which is not the middle.

            aria-hidden because the logo's alt text already names the shop, and
            a screen reader shouldn't hear it twice. */}
        <span className="pp-word pp-word-mid" style={brandFont} aria-hidden="true">
          {brand}
        </span>

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
