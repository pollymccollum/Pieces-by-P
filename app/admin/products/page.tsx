import { requireOwner } from "@/lib/auth";
import { getAllProductsForOwner, getSiteSettings } from "@/lib/data";
import { AdminChrome } from "../AdminChrome";
import { ProductManager } from "./ProductManager";

export const metadata = { title: "Pieces | Pieces by P admin" };

export default async function ProductsPage() {
  await requireOwner();

  const [products, settings] = await Promise.all([
    getAllProductsForOwner(),
    getSiteSettings(),
  ]);

  return (
    <AdminChrome>
      <ProductManager
        products={products}
        categories={settings.categories}
        photoShape={settings.photoShape}
      />
    </AdminChrome>
  );
}
