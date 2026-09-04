"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/storefront/visuals";

// Catches a render or data-fetch failure anywhere in the storefront.
//
// Without this the production build shows the bare Next.js error screen: no
// branding, no explanation, and no way back to the shop. A shopper who hits
// it mid-purchase should get somewhere to go and a way to reach Polly, and
// she should hear about it rather than losing the sale silently.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Netlify collects this. The digest is what ties it to the server-side
    // stack trace, which is why it's shown to the customer below.
    console.error("[storefront] render failed:", error);
  }, [error]);

  return (
    <div className="pp-root">
      <div className="pp-confirm">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Badge s={52} />
        </div>
        <p className="pp-eyebrow-c">
          <span className="pp-script">sorry</span>
        </p>
        <h2 className="pp-h2">Something went wrong at our end</h2>
        <p className="pp-desc">
          Nothing you did caused this, and no payment was taken. Trying again
          usually works — if it doesn&apos;t, send us a message and we&apos;ll
          sort it out.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
          <button className="pp-btn" onClick={reset}>
            Try again
          </button>
          <Link href="/contact" className="pp-btn sage" style={{ textDecoration: "none" }}>
            Get in touch
          </Link>
        </div>
        {error.digest && (
          <p className="pp-note" style={{ marginTop: 18 }}>
            If you message us, quoting <strong>{error.digest}</strong> helps us
            find what happened.
          </p>
        )}
      </div>
    </div>
  );
}
