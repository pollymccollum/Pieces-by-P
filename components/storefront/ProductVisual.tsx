import { focalPosition, type Product } from "@/lib/types";
import { StrandArt } from "./visuals";

// Cover photo (first uploaded product_images row) if there is one,
// otherwise the beaded-strand SVG illustration.
export function ProductVisual({ product, size }: { product: Product; size: number }) {
  const cover = product.images[0];
  if (cover) {
    // Product photos live on Supabase Storage at owner-controlled,
    // unpredictable paths; a plain <img> avoids configuring next/image
    // remote patterns per bucket.
    // objectPosition is the owner's crop: which part of the photo has to
    // survive when the square tile cuts the rest off.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cover.url}
        alt={product.name}
        className="pp-photo"
        style={{ objectPosition: focalPosition(cover) }}
      />
    );
  }
  return (
    <StrandArt
      category={product.category}
      colors={product.colors}
      charm={product.charm}
      charmText={product.charm_text}
      size={size}
    />
  );
}
