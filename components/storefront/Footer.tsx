"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "./Header";

export function Footer({ brand, location }: { brand: string; location: string }) {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <footer className="pp-footer">
      <div className="pp-wrap pp-frow">
        <span className="pp-fword">{brand}</span>
        <div className="pp-flinks">
          {NAV_LINKS.map((l) =>
            l.href === "/" && onHome ? (
              <button
                key={l.href}
                onClick={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}
              >
                {l.label}
              </button>
            ) : (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            )
          )}
        </div>
        {/* "Handmade in ·" with nothing after it is what showed when the
            location was left blank. The phrase only makes sense with a place
            in it, so without one it drops out entirely. */}
        <span className="pp-fine">
          {location.trim() ? `Handmade in ${location.trim()} · ` : ""}© {new Date().getFullYear()}{" "}
          {brand}
        </span>
      </div>
    </footer>
  );
}
