import type { Product } from "@/lib/types";

// URLs for a piece's own page.
//
// Shaped as <name>-<first 8 of the id>, e.g. /piece/red-white-and-blue-bead-3f9a2c11.
//
// The name is in there so a link Polly pastes into an Instagram story says
// what it leads to, and so search engines have something to read. The id
// fragment is what actually resolves it: renaming a piece changes the words
// but not the id, so links she shared last month keep working and land on
// the same piece rather than a 404 or, worse, a different necklace.
//
// Eight hex characters is 4 billion values against a catalogue of dozens.
// The lookup checks for a genuine unique match anyway rather than assuming.

const ID_CHARS = 8;

function slugify(name: string): string {
  return (name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function productPath(product: Product): string {
  const words = slugify(product.name);
  const idPart = product.id.replace(/-/g, "").slice(0, ID_CHARS);
  return `/piece/${words ? `${words}-${idPart}` : idPart}`;
}

// Finds the piece a slug refers to, or null.
//
// Matches on the id fragment only. The words in front of it are decoration
// and are deliberately not checked — an out-of-date name in an old link
// should still reach the right piece.
export function findProductBySlug(products: Product[], slug: string): Product | null {
  const tail = (slug ?? "").split("-").pop() ?? "";
  if (tail.length < ID_CHARS) return null;

  const matches = products.filter(
    (p) => p.id.replace(/-/g, "").slice(0, ID_CHARS) === tail
  );

  // Two pieces sharing a fragment would be a coin-flip as to which one a
  // customer got. Refusing is the honest answer; it has never happened and
  // would need a deliberate collision to.
  return matches.length === 1 ? matches[0] : null;
}
