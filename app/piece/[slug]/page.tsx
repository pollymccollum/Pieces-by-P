import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProducts, getSiteSettings } from "@/lib/data";
import { findProductBySlug } from "@/lib/product-url";
import { SiteChrome } from "@/components/storefront/SiteChrome";
import { ProductPage } from "@/components/storefront/ProductPage";

// Same reasoning as every other storefront route: her edits and, more
// importantly, the stock count must be current. A cached page offering a
// piece that sold an hour ago is the one thing worth paying a render for.
export const dynamic = "force-dynamic";

// A piece's own page is the thing people will share, so the preview card in
// a message or a story has to be right — its name, its price, its photo.
export async function generateMetadata(props: PageProps<"/piece/[slug]">): Promise<Metadata> {
  const [{ slug }, products, settings] = await Promise.all([
    props.params,
    getProducts(),
    getSiteSettings(),
  ]);

  const product = findProductBySlug(products, slug);
  if (!product) return { title: `Piece not found · ${settings.brand}` };

  const cover = product.images[0]?.url;
  return {
    title: `${product.name} · ${settings.brand}`,
    description: product.description?.slice(0, 155) || `${product.name}, handmade to order.`,
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 155) || undefined,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function Piece(props: PageProps<"/piece/[slug]">) {
  const [{ slug }, products, settings] = await Promise.all([
    props.params,
    getProducts(),
    getSiteSettings(),
  ]);

  // getProducts() returns active pieces only, so a hidden or deleted piece
  // 404s rather than staying reachable by anyone holding an old link.
  const product = findProductBySlug(products, slug);
  if (!product) notFound();

  return (
    <SiteChrome settings={settings}>
      <ProductPage product={product} customBox={settings.customBox} />
    </SiteChrome>
  );
}
