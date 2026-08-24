import type { Product } from "@/lib/types";
import { StrandArt } from "./visuals";

// Cover photo (first uploaded product_images row) if there is one,
// otherwise the beaded-strand SVG illustration.
export function ProductVisual({ product, size }: { product: Product; size: number }) {
  const cover = product.images[0]?.url;
  if (cover) {
    // Product photos live on Supabase Storage at owner-controlled,
    // unpredictable paths; a plain <img> avoids configuring next/image
    // remote patterns per bucket.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cover} alt={product.name} className="pp-photo" />;
  }
  return <StrandArt category={product.category} colors={product.colors} charm={product.charm} size={size} />;
}
