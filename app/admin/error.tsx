"use client";

import { useEffect } from "react";
import Link from "next/link";

// The admin's own error boundary.
//
// Without this, a failure in here fell through to the storefront's, so Polly
// was told "no payment was taken" and invited to "get in touch" — customer
// wording, on her own dashboard, about her own shop. Confusing at best, and
// it told her nothing she could act on or pass along.
//
// This one is written for the person who owns the site: what is safe, what to
// try, and the reference that lets someone find it in the logs.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] failed:", error);
  }, [error]);

  return (
    <div className="ad-root">
      <div className="ad-wrap" style={{ paddingTop: 48, maxWidth: 560 }}>
        <div className="ad-card">
          <p className="ad-sec">Something broke</p>
          <h1 className="ad-h2">That didn&apos;t work</h1>
          <p className="ad-lead">
            Your orders, pieces and settings are all safe — nothing was changed
            or lost. This is the page failing to load, not your shop.
          </p>
          <p className="ad-lead" style={{ marginBottom: 18 }}>
            If you were uploading a photo, it was most likely too large. Try one
            saved as a JPEG, or a smaller one.
          </p>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button className="pp-btn sage" onClick={reset}>
              Try again
            </button>
            <Link href="/admin/orders" className="ad-linkbtn">
              Back to orders
            </Link>
          </div>

          {error.digest && (
            <p className="ad-help" style={{ marginTop: 18 }}>
              If it keeps happening, send Jack this reference:{" "}
              <strong>{error.digest}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
