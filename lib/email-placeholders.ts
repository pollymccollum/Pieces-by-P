// The placeholders Polly may use in an email, and how to tell when she has
// mistyped one.
//
// Shared by the admin and the send path deliberately. If the two ever
// disagreed about what counts as valid, the preview would promise something
// the email didn't do — which is the one thing a preview must never do.

export const PLACEHOLDERS = [
  { token: "name", label: "Customer's first name", sample: "Sarah" },
  { token: "order", label: "Order number", sample: "PBP-K7QM2" },
  { token: "brand", label: "Your shop name", sample: "Pieces by P" },
] as const;

const KNOWN: ReadonlySet<string> = new Set<string>(PLACEHOLDERS.map((p) => p.token));

// Anything in braces that isn't one of the three above.
//
// A typo here used to reach the customer verbatim — "Thank you, {nmae}!" —
// which looks broken to them and is invisible to her. Finding them is what
// lets the admin warn her and the send path fall back.
export function unknownPlaceholders(text: string): string[] {
  const found = String(text ?? "").match(/\{[^}]*\}/g) ?? [];
  const bad = found
    .map((raw) => raw.slice(1, -1).trim().toLowerCase())
    .filter((token) => !KNOWN.has(token));
  return Array.from(new Set(bad));
}

// The closest real placeholder to something she mistyped, so the warning can
// say "did you mean {name}?" rather than only that she is wrong.
export function suggestFor(bad: string): string | null {
  const t = bad.toLowerCase().replace(/[^a-z]/g, "");
  if (!t) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const { token } of PLACEHOLDERS) {
    // Shared letters is crude, but it separates nmae/name from order/brand,
    // which is the whole job.
    const shared = [...new Set(t)].filter((c) => token.includes(c)).length;
    const score = shared / Math.max(token.length, t.length);
    if (score > bestScore) {
      bestScore = score;
      best = token;
    }
  }
  return bestScore >= 0.5 ? best : null;
}
