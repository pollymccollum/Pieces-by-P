"use client";

import { useState, useTransition } from "react";
import type { CartLine } from "@/lib/types";
import { money } from "@/lib/format";
import { placeVenmoOrder, type PlacedOrder } from "@/app/actions/place-order";
import { startCardCheckout } from "@/app/actions/card-checkout";
import type { ShippingInput } from "@/lib/order-utils";
import { BrandMark } from "./visuals";

const EMPTY_SHIP: ShippingInput = {
  name: "",
  email: "",
  phone: "",
  instagram: "",
  addr1: "",
  addr2: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
  notes: "",
};

export function CheckoutView({
  brand,
  logoUrl,
  logoHeight,
  brandFont,
  lines,
  subtotalCents,
  shipCents,
  totalCents,
  venmoHandle,
  cardAvailable,
  onBack,
  onPlaced,
}: {
  brand: string;
  logoUrl: string | null;
  logoHeight: number;
  brandFont?: React.CSSProperties;
  lines: CartLine[];
  subtotalCents: number;
  shipCents: number;
  totalCents: number;
  venmoHandle: string;
  cardAvailable: boolean;
  onBack: () => void;
  onPlaced: (order: PlacedOrder, ship: ShippingInput) => void;
}) {
  const [ship, setShip] = useState<ShippingInput>(EMPTY_SHIP);
  const [pay, setPay] = useState<"card" | "venmo">(cardAvailable ? "card" : "venmo");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (key: keyof ShippingInput, value: string) =>
    setShip((s) => ({ ...s, [key]: value }));

  const requiredOk =
    ship.name && ship.email && ship.addr1 && ship.city && ship.state && ship.zip;

  const submit = () => {
    setTouched(true);
    setError(null);
    if (!requiredOk || lines.length === 0) return;

    const cart = lines.map((l) => ({
      productId: l.product.id,
      qty: l.qty,
      note: l.note,
    }));

    if (pay === "card") {
      if (!cardAvailable) {
        setError("Card checkout isn't switched on yet. Choose Venmo for now.");
        return;
      }
      start(async () => {
        const res = await startCardCheckout(cart, ship);
        // Hand off to Stripe's hosted payment page. The order already exists
        // as pending; their webhook marks it paid.
        if (res.ok) window.location.href = res.url;
        else setError(res.error);
      });
      return;
    }

    start(async () => {
      const res = await placeVenmoOrder(cart, ship);
      if (res.ok) onPlaced(res.order, ship);
      else setError(res.error);
    });
  };

  const field = (
    key: keyof ShippingInput,
    label: string,
    opts: { required?: boolean; span?: boolean; type?: string; ph?: string } = {}
  ) => {
    const missing = touched && opts.required && !ship[key];
    return (
      <label className="pp-field" style={{ gridColumn: opts.span ? "1 / -1" : "auto" }}>
        <span className="pp-flabel">
          {label}
          {opts.required && <em className="pp-req"> *</em>}
        </span>
        <input
          className="pp-input"
          style={missing ? { borderColor: "#C25B4A" } : undefined}
          value={ship[key]}
          type={opts.type || "text"}
          placeholder={opts.ph || ""}
          onChange={(e) => set(key, e.target.value)}
        />
      </label>
    );
  };

  return (
    <>
      <div className="pp-announce">Secure checkout</div>
      <header className="pp-header">
        <div className="pp-wrap pp-headrow">
          <button className="pp-brand" onClick={onBack}>
            <BrandMark brand={brand} logoUrl={logoUrl} logoHeight={logoHeight} brandFont={brandFont} />
          </button>
          <button className="pp-navlink" onClick={onBack}>
            ← Back to cart
          </button>
        </div>
      </header>
      <div className="pp-checkout">
        <p className="pp-eyebrow-c">
          <span className="pp-script">almost yours</span>
        </p>
        <h2 className="pp-h2">Where should we send it</h2>
        <div style={{ height: 28 }} />
        <div className="pp-co-grid">
          <div>
            <p className="pp-flabel" style={{ margin: "0 0 12px", color: "var(--sage-deep)" }}>
              How we reach you
            </p>
            <div className="pp-fields">
              {field("name", "Full name", { required: true, span: true })}
              {field("email", "Email", { required: true, type: "email", span: true })}
            </div>
            <p className="pp-note" style={{ marginTop: 6 }}>
              Your confirmation and shipping updates go here.
            </p>

            {/* Optional extras. Genuinely useful for chasing a Venmo payment,
                but never a reason to lose a sale — so no asterisks. */}
            <div className="pp-contactgroup" style={{ marginTop: 16 }}>
              <p className="pp-flabel" style={{ marginBottom: 4 }}>
                Optional
              </p>
              <p className="pp-note" style={{ marginBottom: 12 }}>
                Another way to reach you if there&apos;s a question about your order.
              </p>
              <div className="pp-fields">
                {field("phone", "Phone", { type: "tel", ph: "(864) 555-0100" })}
                {field("instagram", "Instagram", { ph: "@yourhandle" })}
              </div>
            </div>

            <p className="pp-flabel" style={{ margin: "26px 0 12px", color: "var(--sage-deep)" }}>
              Where it&apos;s going
            </p>
            <div className="pp-fields">
              {field("addr1", "Address", { required: true, span: true, ph: "Street address" })}
              {field("addr2", "Apt / suite", { span: true })}
              {field("city", "City", { required: true })}
              {field("state", "State", { required: true })}
              {field("zip", "ZIP", { required: true })}
              {field("country", "Country")}
              <label className="pp-field" style={{ gridColumn: "1 / -1" }}>
                <span className="pp-flabel">Order notes</span>
                <textarea
                  className="pp-textarea"
                  value={ship.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Gift wrap, delivery notes, anything else…"
                />
              </label>
            </div>

            <p className="pp-flabel" style={{ margin: "26px 0 12px", color: "var(--sage-deep)" }}>
              Payment
            </p>
            <div className="pp-pay">
              <div
                className={`pp-payopt ${pay === "card" ? "on" : ""} ${cardAvailable ? "" : "off"}`}
                onClick={() => cardAvailable && setPay("card")}
              >
                <span className="pp-radio" />
                <div>
                  <div style={{ fontSize: 14 }}>Card</div>
                  <div className="pp-note">
                    {cardAvailable
                      ? "Visa, Mastercard, Amex. Processed securely by Stripe."
                      : "Card payments aren't switched on yet — coming soon."}
                  </div>
                </div>
              </div>

              <div
                className={`pp-payopt ${pay === "venmo" ? "on" : ""}`}
                onClick={() => setPay("venmo")}
              >
                <span className="pp-radio" />
                <div>
                  <div style={{ fontSize: 14 }}>Venmo</div>
                  <div className="pp-note">
                    Place your order now, then send {money(totalCents)}
                    {venmoHandle ? <> to {venmoHandle}</> : null} on Venmo. We&apos;ll give you an
                    order number to put in the note.
                  </div>
                </div>
              </div>
            </div>

            {touched && !requiredOk && (
              <p className="pp-hint">Add the required fields marked * to place the order.</p>
            )}
            {error && <p className="pp-hint">{error}</p>}
          </div>

          <div className="pp-summary">
            <p className="pp-flabel" style={{ color: "var(--sage-deep)", marginBottom: 14 }}>
              Order summary
            </p>
            {lines.map((l) => (
              <div key={l.lineId} style={{ marginBottom: 8 }}>
                <div className="pp-row" style={{ marginBottom: 2 }}>
                  <span>
                    {l.product.name} × {l.qty}
                  </span>
                  <span>{money(l.product.price_cents * l.qty)}</span>
                </div>
                {l.note && <div className="pp-lnote">{l.note}</div>}
              </div>
            ))}
            <div className="pp-row">
              <span>Subtotal</span>
              <span>{money(subtotalCents)}</span>
            </div>
            <div className="pp-row">
              <span>Shipping</span>
              <span>{shipCents === 0 ? "Free" : money(shipCents)}</span>
            </div>
            <div className="pp-row total">
              <span>Total</span>
              <span>{money(totalCents)}</span>
            </div>
            <button
              className="pp-btn sage"
              style={{ width: "100%", marginTop: 16 }}
              disabled={lines.length === 0 || pending}
              onClick={submit}
            >
              {pending
                ? pay === "card"
                  ? "Taking you to payment…"
                  : "Placing order…"
                : pay === "card"
                  ? `Pay ${money(totalCents)}`
                  : `Place order · ${money(totalCents)}`}
            </button>
            <p className="pp-note" style={{ marginTop: 10, textAlign: "center" }}>
              {pay === "card"
                ? "You'll be taken to Stripe's secure payment page."
                : "Nothing is charged automatically — you send the Venmo yourself."}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
