"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/storefront/visuals";
import { signOut } from "./actions-auth";

// Orders first: it's what she opens every day.
const TABS = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Pieces" },
  { href: "/admin/content", label: "Site content" },
];

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="ad-root">
      <div className="ad-top">
        <div className="ad-wrap ad-toprow">
          <Badge s={34} />
          <div>
            <div className="ad-title">Shop admin</div>
            <div className="ad-sub">Pieces by P</div>
          </div>
          <span className="ad-spacer" />
          <form action={signOut}>
            <button className="ad-signout" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="ad-wrap">
        <nav className="ad-tabs">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`ad-tab ${pathname.startsWith(t.href) ? "on" : ""}`}
            >
              {t.label}
            </Link>
          ))}
          <a className="ad-tab" href="/" target="_blank" rel="noreferrer">
            View shop ↗
          </a>
        </nav>
        {children}
      </div>
    </div>
  );
}
