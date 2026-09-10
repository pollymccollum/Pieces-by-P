"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  focalStyle,
  remainingFor,
  stockState,
  type CustomOrderContent,
  type Product,
} from "@/lib/types";
import { money } from "@/lib/format";
import { StrandArt } from "./visuals";
import { useCart } from "./useCart";

function newLineId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
}

// One piece, on its own page.
//
// This replaced a modal over the shop. A modal cannot be linked to, so
// pointing someone at one necklace meant "go to the shop and scroll"; now
// every piece has an address Polly can put in a story, and search engines
// have something to index. It also gives the photos room — the whole point
// of a page rather than a box.
export function ProductPage({
  product,
  customBox,
}: {
  product: Product;
  customBox: CustomOrderContent;
}) {
  const router = useRouter();
  const { cart } = useCart();
  const { setCart } = useCart();

  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [color, setColor] = useState(product.color_options[0] ?? "");
  const [gIdx, setGIdx] = useState(0);
  const [added, setAdded] = useState(false);

  const imgs = product.images;
  const mainImg = imgs[gIdx] || imgs[0] || null;

  const st = stockState(product.stock);
  const soldOut = st.kind === "out";

  // How many of this piece are already in the cart, across every colour and
  // note variant — the stock limit is per piece, not per variant.
  const inCart = cart
    .filter((l) => l.productId === product.id)
    .reduce((s, l) => s + l.qty, 0);
  const canAdd = remainingFor(product.stock, inCart);
  const atLimit = qty >= canAdd;

  const addToCart = () => {
    const cleanNote = note.trim();
    const cleanColor = color.trim();
    const add = Math.min(qty, canAdd);
    if (add < 1) return;

    setCart((prev) => {
      const existing = prev.find(
        (l) => l.productId === product.id && l.note === cleanNote && l.color === cleanColor
      );
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, qty: l.qty + add } : l));
      }
      return [
        ...prev,
        { lineId: newLineId(), productId: product.id, qty: add, note: cleanNote, color: cleanColor },
      ];
    });

    // Confirm in place rather than throwing her customer back to the grid.
    // Pricing a cart needs the whole product list, which this page doesn't
    // load, so the drawer opens on the shop page — but only if they ask.
    setAdded(true);
    setQty(1);
  };

  return (
    <section className="pp-page pp-piecepage">
      <div className="pp-piecewrap">
        <Link href="/#shop" className="pp-backlink">
          ← Back to the shop
        </Link>

        <div className="pp-piecegrid">
          {/* Filmstrip beside the main photo, the convention in jewellery
              retail for a good reason: the price and Add to cart never move
              while someone looks through the angles. A stacked scroll would
              carry the buy button off the screen, and with the three or four
              phone photos a piece actually has, it makes a long page for
              little return. On a phone the strip runs underneath instead —
              a vertical one there would eat width the photo needs. */}
          <div className="pp-piecegallery">
            <div className="pp-piecemain">
              {mainImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mainImg.url}
                  alt={product.name}
                  className="pp-photo"
                  style={focalStyle(mainImg)}
                />
              ) : (
                <StrandArt
                  category={product.category}
                  colors={product.colors}
                  charm={product.charm}
                  charmText={product.charm_text}
                  size={220}
                />
              )}
              {soldOut && (
                <span className="pp-soldout">
                  <span>Sold out</span>
                </span>
              )}
            </div>

            {imgs.length > 1 && (
              <div className="pp-piecethumbs">
                {imgs.map((img, i) => (
                  <button
                    key={img.id}
                    className={`pp-piecethumb ${gIdx === i ? "on" : ""}`}
                    onClick={() => setGIdx(i)}
                    aria-label={`Photo ${i + 1} of ${imgs.length}`}
                    aria-current={gIdx === i}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" style={focalStyle(img)} />
                  </button>
                ))}
              </div>
            )}

            {imgs.length === 0 && (
              <p className="pp-note" style={{ textAlign: "center", marginTop: 10 }}>
                Illustrated preview. Real photos load once uploaded.
              </p>
            )}
          </div>

          <div className="pp-piecedetail">
            <span className="pp-spec">
              {product.category}
              {product.tag ? ` · ${product.tag}` : ""}
            </span>
            <h1 className="pp-piecename">{product.name}</h1>
            <div className="pp-pieceprice">{money(product.price_cents)}</div>

            {product.description && <p className="pp-desc">{product.description}</p>}

            {product.material && (
              <div className="pp-piecemade">
                <span className="pp-spec">Made with</span>
                <div className="pp-mat" style={{ marginTop: 4, fontSize: 13.5 }}>
                  {product.material}
                </div>
              </div>
            )}

            {product.color_options.length > 0 && (
              <div className="pp-colorpick">
                <span className="pp-spec">Color</span>
                <div className="pp-coloropts" role="radiogroup" aria-label="Color">
                  {product.color_options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={color === opt}
                      className={`pp-coloropt ${color === opt ? "on" : ""}`}
                      onClick={() => setColor(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.custom && (
              <div className="pp-custom">
                <span className="pp-spec">{customBox.label.trim() || "Make it yours"}</span>
                <input
                  className="pp-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={customBox.placeholder}
                />
              </div>
            )}

            {st.kind === "low" && (
              <p className="pp-lowstock" style={{ marginTop: 12 }}>
                Only {st.left} left
              </p>
            )}

            {soldOut ? (
              <div style={{ marginTop: 14 }}>
                <button className="pp-btn" disabled style={{ opacity: 0.55, cursor: "not-allowed" }}>
                  Sold out
                </button>
                <p className="pp-note" style={{ marginTop: 10 }}>
                  This one&apos;s gone.{" "}
                  <Link href="/contact" style={{ color: "var(--sage-deep)" }}>
                    Send a message
                  </Link>{" "}
                  — Polly may be able to make another.
                </p>
              </div>
            ) : (
              <>
                <div className="pp-piecebuy">
                  <div className="pp-qty">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                      –
                    </button>
                    <span>{qty}</span>
                    <button
                      onClick={() => setQty((q) => Math.min(canAdd, q + 1))}
                      disabled={atLimit}
                      style={atLimit ? { opacity: 0.35, cursor: "not-allowed" } : undefined}
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                  <button className="pp-btn" disabled={canAdd < 1} onClick={addToCart}>
                    Add to cart · {money(product.price_cents * qty)}
                  </button>
                </div>

                {canAdd < 1 && (
                  <p className="pp-note" style={{ marginTop: 10 }}>
                    You already have all {inCart} of these in your cart.
                  </p>
                )}

                {added && (
                  <div className="pp-added" role="status">
                    <strong>Added to your cart.</strong>
                    <div className="pp-addedbtns">
                      <button className="pp-btn sage" onClick={() => router.push("/?cart=1")}>
                        View cart
                      </button>
                      <Link href="/#shop" className="pp-addedlink">
                        Keep shopping
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
