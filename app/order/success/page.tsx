import Link from "next/link";
import { getSiteSettings } from "@/lib/data";
import { Badge } from "@/components/storefront/visuals";

export const metadata = { title: "Order confirmed | Pieces by P" };

// Where Stripe sends the customer after a successful payment.
//
// Deliberately does NOT read the order from the database to decide anything.
// The webhook is what records the payment, and it may land a second either
// side of this redirect. Showing a friendly confirmation based on Stripe
// having redirected here at all avoids a confusing "not paid yet" message
// during that race.
export default async function OrderSuccessPage({
  searchParams,
}: PageProps<"/order/success">) {
  const settings = await getSiteSettings();
  const params = await searchParams;
  const orderNumber = typeof params.order === "string" ? params.order : null;

  return (
    <div className="pp-root">
      <div className="pp-announce">Payment received</div>
      <div className="pp-confirm">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Badge s={52} />
        </div>
        <p className="pp-eyebrow-c">
          <span className="pp-script">thank you</span>
        </p>
        <h2 className="pp-h2">Your order is confirmed</h2>
        <p className="pp-desc">
          {orderNumber ? (
            <>
              Order <strong style={{ color: "var(--ink)" }}>{orderNumber}</strong> is paid and
              in.{" "}
            </>
          ) : (
            <>Your payment went through. </>
          )}
          A receipt is on its way to your inbox. Each piece is handmade to order and ships in
          about a week.
        </p>

        <div className="pp-block">
          <h4>What happens next</h4>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            {settings.contact.maker || "Polly"} starts making your pieces. You&apos;ll get another
            email the moment they&apos;re on their way.
          </p>
        </div>

        <Link className="pp-btn" href="/" style={{ textDecoration: "none" }}>
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
