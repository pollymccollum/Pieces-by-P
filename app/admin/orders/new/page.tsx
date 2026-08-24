import { requireOwner } from "@/lib/auth";
import { getAllProductsForOwner, getSiteSettings } from "@/lib/data";
import { AdminChrome } from "../../AdminChrome";
import { NewOrderForm } from "./NewOrderForm";

export const metadata = { title: "Add an order | Pieces by P admin" };

export default async function NewOrderPage() {
  await requireOwner();

  const [products, settings] = await Promise.all([
    getAllProductsForOwner(),
    getSiteSettings(),
  ]);

  return (
    <AdminChrome>
      <NewOrderForm
        products={products}
        freeShipOver={settings.freeShipOver}
        flatShip={settings.flatShip}
      />
    </AdminChrome>
  );
}
