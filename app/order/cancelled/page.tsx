import Link from "next/link";
import { Badge } from "@/components/storefront/visuals";

export const metadata = { title: "Payment cancelled | Pieces by P" };

// Stripe sends the customer here if they back out of the payment page.
// Nothing was charged. The order row still exists as pending, which is
// intentional — Polly can see the attempt, and it means an accidental
// back-button doesn't silently lose a sale she could follow up on.
export default async function OrderCancelledPage({
  searchParams,
}: PageProps<"/order/cancelled">) {
  const params = await searchParams;
  const orderNumber = typeof params.order === "string" ? params.order : null;

  return (
    <div className="pp-root">
      <div className="pp-announce">Nothing was charged</div>
      <div className="pp-confirm">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Badge s={52} />
        </div>
        <h2 className="pp-h2">Payment cancelled</h2>
        <p className="pp-desc">
          You weren&apos;t charged{orderNumber ? <>, and order {orderNumber} is on hold</> : null}.
          Your pieces are still there if you&apos;d like to try again.
        </p>
        <Link className="pp-btn sage" href="/" style={{ textDecoration: "none" }}>
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
