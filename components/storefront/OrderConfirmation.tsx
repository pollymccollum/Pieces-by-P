"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import type { PlacedOrder } from "@/app/actions/place-order";
import { Badge } from "./visuals";

// Shown after a Venmo order is saved. The customer still has to actually
// send the money, so the payment instruction is the loudest thing here.
export function OrderConfirmation({
  order,
  customerName,
  customerEmail,
  onBackToShop,
}: {
  order: PlacedOrder;
  customerName: string;
  customerEmail: string;
  onBackToShop: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the number is on screen to copy by hand */
    }
  };

  return (
    <>
      <div className="pp-announce">Order received</div>
      <div className="pp-confirm">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Badge s={52} />
        </div>
        <p className="pp-eyebrow-c">
          <span className="pp-script">thank you</span>
        </p>
        <h2 className="pp-h2">Your order is in, {customerName.split(" ")[0]}</h2>
        <p className="pp-desc">
          Order <strong style={{ color: "var(--ink)" }}>{order.orderNumber}</strong>.
          {customerEmail ? (
            <> A copy of these details went to {customerEmail}.</>
          ) : (
            <> Write your order number down — we&apos;ll use it to find your order.</>
          )}{" "}
          Each piece is handmade to order and ships in about a week.
        </p>

        <div className="pp-payblock">
          <h4>One last step — send your payment</h4>
          <p style={{ margin: "0 0 12px" }}>
            Your pieces are reserved. Send{" "}
            <strong style={{ color: "var(--ink)" }}>{money(order.totalCents)}</strong> on Venmo
            {order.venmoHandle ? (
              <>
                {" "}
                to <strong style={{ color: "var(--ink)" }}>{order.venmoHandle}</strong>
              </>
            ) : null}
            , and put your order number in the note so we can match it up.
          </p>
          <div className="pp-paynote">
            <span>{order.orderNumber}</span>
            <button className="pp-copybtn" onClick={copyNote}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="pp-note" style={{ marginTop: 12 }}>
            We start making your order as soon as the payment comes through.
          </p>
        </div>

        <div className="pp-block">
          <h4>Order total</h4>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Subtotal</span>
            <span>{money(order.subtotalCents)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Shipping</span>
            <span>{order.shippingCents === 0 ? "Free" : money(order.shippingCents)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              borderTop: "1px solid var(--hair)",
              paddingTop: 8,
            }}
          >
            <strong style={{ color: "var(--ink)" }}>Total</strong>
            <strong style={{ color: "var(--ink)" }}>{money(order.totalCents)}</strong>
          </div>
        </div>

        <button className="pp-btn" onClick={onBackToShop}>
          Back to the shop
        </button>
      </div>
    </>
  );
}
