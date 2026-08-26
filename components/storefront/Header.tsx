"use client";

import { BrandMark } from "./visuals";

export function Header({
  brand,
  logoUrl,
  logoHeight,
  brandFont,
  cartCount,
  links,
  onOpenCart,
}: {
  brand: string;
  logoUrl: string | null;
  logoHeight: number;
  brandFont?: React.CSSProperties;
  cartCount: number;
  links: { id: string; label: string }[];
  onOpenCart: () => void;
}) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <header className="pp-header">
      <div className="pp-wrap pp-headrow">
        <button className="pp-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <BrandMark brand={brand} logoUrl={logoUrl} logoHeight={logoHeight} brandFont={brandFont} />
        </button>
        <nav className="pp-nav">
          {links.map((l) => (
            <button key={l.id} className="pp-navlink hideM" onClick={() => scrollTo(l.id)}>
              {l.label}
            </button>
          ))}
          <button className="pp-cartbtn" onClick={onOpenCart}>
            <span className="pp-navlink" style={{ letterSpacing: ".14em" }}>
              Cart
            </span>
            {cartCount > 0 && <span className="pp-badge-count">{cartCount}</span>}
          </button>
        </nav>
      </div>
    </header>
  );
}
