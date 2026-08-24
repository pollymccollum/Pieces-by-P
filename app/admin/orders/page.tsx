import { requireOwner } from "@/lib/auth";
import { getOrdersForOwner, getSiteSettings, summariseOrders } from "@/lib/data";
import { AdminChrome } from "../AdminChrome";
import { OrdersBoard } from "./OrdersBoard";

export const metadata = { title: "Orders | Pieces by P admin" };

export default async function OrdersPage() {
  await requireOwner();

  const [orders, settings] = await Promise.all([getOrdersForOwner(), getSiteSettings()]);
  const stats = summariseOrders(orders);

  return (
    <AdminChrome>
      <OrdersBoard orders={orders} stats={stats} venmoHandle={settings.venmoHandle} />
    </AdminChrome>
  );
}
