"use client";

import { useState } from "react";
import { focalPosition, remainingFor, stockState, type Product } from "@/lib/types";
import { money } from "@/lib/format";
import { StrandArt } from "./visuals";

export function ProductModal({
  product,
  inCart,
  onClose,
  onAddToCart,
}: {
  product: Product;
  inCart: number; // already in the cart, so we don't let them exceed stock
  onClose: () => void;
  onAddToCart: (product: Product, qty: number, note: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [gIdx, setGIdx] = useState(0);

  const imgs = product.images;
  const mainImg = imgs[gIdx] || imgs[0] || null;

  const st = stockState(product.stock);
  const soldOut = st.kind === "out";
  const canAdd = remainingFor(product.stock, inCart); // Infinity if made to order
  const atLimit = qty >= canAdd;

  return (
    <div className="pp-scrim" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pp-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="pp-modal-grid">
          <div className="pp-gallery">
            <div className="pp-gmain">
              {mainImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mainImg.url}
                  alt={product.name}
                  className="pp-photo"
                  style={{ objectPosition: focalPosition(mainImg) }}
                />
              ) : (
                <StrandArt
                  category={product.category}
                  colors={product.colors}
                  charm={product.charm}
                  charmText={product.charm_text}
                  size={200}
                />
              )}
            </div>
            {imgs.length > 1 && (
              <div className="pp-thumbs">
                {imgs.map((img, i) => (
                  <button
                    key={img.id}
                    className={`pp-thumb ${gIdx === i ? "on" : ""}`}
                    onClick={() => setGIdx(i)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" style={{ objectPosition: focalPosition(img) }} />
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
          <div className="pp-detail">
            <span className="pp-spec">
              {product.category}
              {product.tag ? ` · ${product.tag}` : ""}
            </span>
            <div className="pp-cardname">{product.name}</div>
            <div className="pp-price" style={{ fontSize: 16 }}>
              {money(product.price_cents)}
            </div>
            <p className="pp-desc">{product.description}</p>
            {product.material && (
              <div>
                <span className="pp-spec">Made with</span>
                <div className="pp-mat" style={{ marginTop: 4, fontSize: 13 }}>
                  {product.material}
                </div>
              </div>
            )}
            <div className="pp-custom">
              <span className="pp-spec">Make it yours {product.custom ? "" : "(optional)"}</span>
              <input
                className="pp-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={product.custom ? "Color swaps, initials, team colors, sizing…" : "Any requests? Colors, length, initials…"}
              />
            </div>
            {st.kind === "low" && (
              <p className="pp-lowstock" style={{ marginTop: 10 }}>
                Only {st.left} left
              </p>
            )}

            {soldOut ? (
              <div style={{ marginTop: 10 }}>
                <button className="pp-btn" disabled style={{ opacity: 0.55, cursor: "not-allowed" }}>
                  Sold out
                </button>
                <p className="pp-note" style={{ marginTop: 8 }}>
                  This one&apos;s gone. Message us on Instagram — Polly may be able to make
                  another.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
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
                  <button
                    className="pp-btn"
                    disabled={canAdd < 1}
                    onClick={() => onAddToCart(product, Math.min(qty, canAdd), note)}
                  >
                    Add to cart · {money(product.price_cents * qty)}
                  </button>
                </div>
                {canAdd < 1 && (
                  <p className="pp-note" style={{ marginTop: 8 }}>
                    You already have all {inCart} of these in your cart.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
