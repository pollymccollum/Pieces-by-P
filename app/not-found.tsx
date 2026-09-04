import Link from "next/link";
import { Badge } from "@/components/storefront/visuals";

export const metadata = { title: "Page not found | Pieces by P" };

// A mistyped or expired link should still look like the shop and offer a way
// back into it. The Next.js default 404 is unbranded and dead-ends, which on
// a link shared from Instagram reads as "this shop is broken".
export default function NotFound() {
  return (
    <div className="pp-root">
      <div className="pp-confirm">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Badge s={52} />
        </div>
        <p className="pp-eyebrow-c">
          <span className="pp-script">hmm</span>
        </p>
        <h2 className="pp-h2">We couldn&apos;t find that page</h2>
        <p className="pp-desc">
          The link may be out of date, or a piece may have sold and been taken
          down. Everything that&apos;s available is in the shop.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
          <Link href="/" className="pp-btn" style={{ textDecoration: "none" }}>
            Back to the shop
          </Link>
          <Link href="/contact" className="pp-btn sage" style={{ textDecoration: "none" }}>
            Get in touch
          </Link>
        </div>
      </div>
    </div>
  );
}
