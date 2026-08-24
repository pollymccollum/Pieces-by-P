"use client";

import type { CartLine } from "@/lib/types";
import { money } from "@/lib/format";
import { ProductVisual } from "./ProductVisual";

export function CartDrawer({
  lines,
  subtotalCents,
  shipCents,
  totalCents,
  freeShipOverCents,
  onClose,
  onSetQty,
  onCheckout,
}: {
  lines: CartLine[];
  subtotalCents: number;
  shipCents: number;
  totalCents: number;
  freeShipOverCents: number;
  onClose: () => void;
  onSetQty: (lineId: string, qty: number) => void;
  onCheckout: () => void;
}) {
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="pp-overlay" onClick={onClose}>
      <aside className="pp-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="pp-dhead">
          <span className="pp-dtitle">Your cart{count > 0 ? ` (${count})` : ""}</span>
          <button className="pp-close" style={{ position: "static" }} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="pp-dbody">
          {lines.length === 0 ? (
            <div className="pp-empty">
              Your cart is empty.
              <br />
              Add a piece to get started.
            </div>
          ) : (
            lines.map((l) => (
              <div key={l.lineId} className="pp-line">
                <div className="pp-ph">
                  <ProductVisual product={l.product} size={42} />
                </div>
                <div>
                  <div className="pp-lname">{l.product.name}</div>
                  {l.note && <div className="pp-lnote">{l.note}</div>}
                  <div className="pp-mini">
                    <button onClick={() => onSetQty(l.lineId, l.qty - 1)} aria-label="Decrease">
                      –
                    </button>
                    <span>{l.qty}</span>
                    <button onClick={() => onSetQty(l.lineId, l.qty + 1)} aria-label="Increase">
                      +
                    </button>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="pp-price">{money(l.product.price_cents * l.qty)}</div>
                  <button className="pp-remove" onClick={() => onSetQty(l.lineId, 0)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {lines.length > 0 && (
          <div className="pp-dfoot">
            <div className="pp-row">
              <span>Subtotal</span>
              <span>{money(subtotalCents)}</span>
            </div>
            <div className="pp-row">
              <span>Shipping</span>
              <span>{shipCents === 0 ? "Free" : money(shipCents)}</span>
            </div>
            {subtotalCents < freeShipOverCents && subtotalCents > 0 && (
              <p className="pp-note" style={{ marginBottom: 8 }}>
                Add {money(freeShipOverCents - subtotalCents)} more for free shipping.
              </p>
            )}
            <div className="pp-row total">
              <span>Total</span>
              <span>{money(totalCents)}</span>
            </div>
            <button className="pp-btn" style={{ width: "100%", marginTop: 12 }} onClick={onCheckout}>
              Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
