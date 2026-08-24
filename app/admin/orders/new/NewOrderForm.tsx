"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PaymentMethod, Product } from "@/lib/types";
import type { ShippingInput } from "@/lib/order-utils";
import { money } from "@/lib/format";
import { createManualOrder } from "../../actions";

type Line = { key: string; productId: string; qty: number; note: string };

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

function newKey() {
  return Math.random().toString(36).slice(2, 9);
}

export function NewOrderForm({
  products,
  freeShipOver,
  flatShip,
}: {
  products: Product[];
  freeShipOver: number;
  flatShip: number;
}) {
  const router = useRouter();
  const [ship, setShip] = useState<ShippingInput>(EMPTY_SHIP);
  const [lines, setLines] = useState<Line[]>([
    { key: newKey(), productId: products[0]?.id ?? "", qty: 1, note: "" },
  ]);
  const [method, setMethod] = useState<PaymentMethod>("venmo");
  const [markPaid, setMarkPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (key: keyof ShippingInput, value: string) =>
    setShip((s) => ({ ...s, [key]: value }));

  // Mirrors the server's maths so she sees the total before saving. The
  // server recalculates independently — this is a preview, not the source.
  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => {
      const p = products.find((x) => x.id === l.productId);
      return sum + (p ? p.price_cents * l.qty : 0);
    }, 0);
    const freeOver = Math.round(freeShipOver * 100);
    const shippingCents =
      subtotal <= 0 || (freeOver > 0 && subtotal >= freeOver) ? 0 : Math.round(flatShip * 100);
    return { subtotal, shippingCents, total: subtotal + shippingCents };
  }, [lines, products, freeShipOver, flatShip]);

  const submit = () => {
    setError(null);
    const cart = lines
      .filter((l) => l.productId)
      .map((l) => ({ productId: l.productId, qty: l.qty, note: l.note }));

    if (cart.length === 0) {
      setError("Add at least one piece to the order.");
      return;
    }

    start(async () => {
      const res = await createManualOrder(cart, ship, method, markPaid);
      if (res.ok) router.push("/admin/orders");
      else setError(res.error);
    });
  };

  if (products.length === 0) {
    return (
      <div className="ad-card">
        <div className="ad-empty">
          You need at least one piece before you can record an order.
          <br />
          Add one under <b>Pieces</b> first.
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="ad-h2">Add an order</h1>
      <p className="ad-lead">
        For orders that came in outside the website — an Instagram message, a pop-up,
        or someone paying you in person.
      </p>

      <div className="ad-card">
        <p className="ad-sec">Customer</p>
        <div className="ad-field">
          <span className="ad-lbl">Full name *</span>
          <input className="pp-input" value={ship.name} onChange={(e) => set("name", e.target.value)} />
        </div>

        <div className="ad-field" style={{ marginTop: 12 }}>
          <span className="ad-lbl">Email *</span>
          <input className="pp-input" type="email" value={ship.email} onChange={(e) => set("email", e.target.value)} />
          <span className="ad-help">Their confirmation and shipping notice go here.</span>
        </div>
        <div className="ad-grid2" style={{ marginTop: 12 }}>
          <div className="ad-field">
            <span className="ad-lbl">Phone</span>
            <input className="pp-input" type="tel" value={ship.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="ad-field">
            <span className="ad-lbl">Instagram</span>
            <input
              className="pp-input"
              value={ship.instagram}
              placeholder="@theirhandle"
              onChange={(e) => set("instagram", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="ad-card">
        <p className="ad-sec">Ship to</p>
        <div className="ad-field">
          <span className="ad-lbl">Address *</span>
          <input className="pp-input" value={ship.addr1} onChange={(e) => set("addr1", e.target.value)} placeholder="Street address" />
        </div>
        <div className="ad-field" style={{ marginTop: 12 }}>
          <span className="ad-lbl">Apt / suite</span>
          <input className="pp-input" value={ship.addr2} onChange={(e) => set("addr2", e.target.value)} />
        </div>
        <div className="ad-grid2" style={{ marginTop: 12 }}>
          <div className="ad-field">
            <span className="ad-lbl">City *</span>
            <input className="pp-input" value={ship.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="ad-field">
            <span className="ad-lbl">State *</span>
            <input className="pp-input" value={ship.state} onChange={(e) => set("state", e.target.value)} />
          </div>
          <div className="ad-field">
            <span className="ad-lbl">ZIP *</span>
            <input className="pp-input" value={ship.zip} onChange={(e) => set("zip", e.target.value)} />
          </div>
          <div className="ad-field">
            <span className="ad-lbl">Country</span>
            <input className="pp-input" value={ship.country} onChange={(e) => set("country", e.target.value)} />
          </div>
        </div>
        <div className="ad-field" style={{ marginTop: 12 }}>
          <span className="ad-lbl">Notes</span>
          <textarea className="pp-textarea" value={ship.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything to remember about this order" />
        </div>
      </div>

      <div className="ad-card">
        <p className="ad-sec">Pieces</p>
        {lines.map((l, i) => (
          <div key={l.key} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < lines.length - 1 ? "1px solid var(--hair)" : "none" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="ad-field" style={{ flex: 1, minWidth: 180 }}>
                <span className="ad-lbl">Piece</span>
                <select
                  className="pp-select"
                  value={l.productId}
                  onChange={(e) =>
                    setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, productId: e.target.value } : x)))
                  }
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {money(p.price_cents)}
                      {p.active ? "" : " (hidden)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ad-field" style={{ width: 84 }}>
                <span className="ad-lbl">Qty</span>
                <input
                  className="pp-input"
                  type="number"
                  min={1}
                  max={50}
                  value={l.qty}
                  onChange={(e) =>
                    setLines((ls) =>
                      ls.map((x) => (x.key === l.key ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x))
                    )
                  }
                />
              </div>
              {lines.length > 1 && (
                <button
                  className="ad-icon"
                  title="Remove this piece"
                  onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                >
                  ×
                </button>
              )}
            </div>
            <div className="ad-field" style={{ marginTop: 8 }}>
              <span className="ad-lbl">Make it yours note</span>
              <input
                className="pp-input"
                value={l.note}
                placeholder="Colours, initials, sizing…"
                onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, note: e.target.value } : x)))}
              />
            </div>
          </div>
        ))}

        <button
          className="pp-btn ghost"
          style={{ padding: "10px 16px" }}
          onClick={() =>
            setLines((ls) => [...ls, { key: newKey(), productId: products[0]?.id ?? "", qty: 1, note: "" }])
          }
        >
          + Add another piece
        </button>

        <div className="oa-total" style={{ marginTop: 16 }}>
          <span className="oa-ship-note">
            {totals.shippingCents === 0 ? "Free shipping" : `Includes ${money(totals.shippingCents)} shipping`}
          </span>
          <b>Total {money(totals.total)}</b>
        </div>
      </div>

      <div className="ad-card">
        <p className="ad-sec">Payment</p>
        <div className="ad-optrow">
          {(["venmo", "card"] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`ad-opt wide ${method === m ? "on" : ""}`}
              onClick={() => {
                setMethod(m);
                if (m === "card") setMarkPaid(false);
              }}
            >
              <strong style={{ fontWeight: 400 }}>{m === "venmo" ? "Venmo" : "Card"}</strong>
              <span className="ad-opt-help">
                {m === "venmo"
                  ? "You confirm when the money arrives"
                  : "Only for a card payment you took elsewhere"}
              </span>
            </button>
          ))}
        </div>

        {method === "venmo" && (
          <label className="ad-toggle" style={{ textTransform: "none", fontSize: 13, letterSpacing: 0, marginTop: 14 }}>
            <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
            They&apos;ve already paid me
          </label>
        )}
        {method === "card" && (
          <p className="ad-help" style={{ marginTop: 10 }}>
            Card orders recorded here stay unpaid, because Stripe isn&apos;t the one
            confirming them. Use Venmo unless you know you need this.
          </p>
        )}
      </div>

      {error && <p className="pp-hint">{error}</p>}

      <div className="ad-savebar">
        <span className="ad-saved" style={{ color: "var(--ink-soft)" }}>
          Total {money(totals.total)}
        </span>
        <button className="pp-btn ghost" onClick={() => router.push("/admin/orders")} disabled={pending}>
          Cancel
        </button>
        <button className="pp-btn sage" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save order"}
        </button>
      </div>
    </>
  );
}
