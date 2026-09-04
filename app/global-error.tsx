"use client";

import { useEffect } from "react";

// The last resort: a failure in the root layout itself, which error.tsx sits
// inside and therefore cannot catch. It replaces the whole document, so it
// has to bring its own <html> and <body> — and it cannot rely on globals.css
// or the fonts, since the layout that loads them is what failed. Hence the
// inline styles, which are deliberate rather than lazy.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root] layout failed:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#FAF6EC",
          color: "#2B2A24",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <h1 style={{ fontSize: 26, fontWeight: 400, margin: "0 0 12px" }}>
            Pieces by P
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "#6E6A5C", margin: 0 }}>
            The shop is having a moment. Nothing you did caused it and no
            payment was taken. Please try again shortly.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 22,
              background: "#2B2A24",
              color: "#FFFDF7",
              border: "none",
              borderRadius: 22,
              padding: "11px 22px",
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
