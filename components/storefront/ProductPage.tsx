"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  focalStyle,
  remainingFor,
  stockState,
  type CustomOrderContent,
  type Product,
  type ReturnsContent,
} from "@/lib/types";
import { money } from "@/lib/format";
import { StrandArt } from "./visuals";
import { useCart } from "./useCart";

function newLineId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
}

// The chevron on both dropdown rows. Inline rather than a font or an
// entity so it inherits currentColor and can be rotated by CSS when the
// row opens — see .pp-acc[open] .pp-accarrow.
function AccArrow() {
  return (
    <svg className="pp-accarrow" width="11" height="7" viewBox="0 0 11 7" aria-hidden="true">
      <path
        d="M1 1l4.5 4.5L10 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
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
  returns,
}: {
  product: Product;
  customBox: CustomOrderContent;
  returns: ReturnsContent;
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

  // ---- hover-to-magnify on the main photo ----
  //
  // Desktop only, and gated on the device actually having a hover-capable
  // pointer rather than on screen width: a tap fires a synthetic mousemove
  // on many phones, which would leave a finger-sized zoom stuck on screen
  // with no way to dismiss it. matchMedia runs in an effect, so the first
  // render is identical on server and client.
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const q = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(q.matches);
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);

  // Photos are downscaled to 2000px on upload and the frame renders around
  // 600px wide, so there is roughly 3x of real detail to spend. Past about
  // 2.5x this magnifies compression artefacts rather than beads.
  const HOVER_ZOOM = 2.2;

  // Polly's own crop already uses transform/transform-origin via
  // focalStyle(), so the two are multiplied rather than one replacing the
  // other — otherwise hovering a piece she has zoomed would snap it back.
  const focalZoom =
    typeof mainImg?.zoom === "number" && mainImg.zoom > 0 ? mainImg.zoom / 100 : 1;
  const focalOrigin = `${mainImg?.focal_x ?? 50}% ${mainImg?.focal_y ?? 50}%`;

  // Written straight to the node instead of through state: this fires on
  // every pointer move, and re-rendering the whole page that often would
  // risk jank on the one page that has to feel good. React owns the style
  // attribute, so a re-render simply restores the un-zoomed base — a
  // harmless outcome, not a broken one.
  const zoomTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = imgRef.current;
    if (!el || !canHover || !mainImg) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 100;
    const y = ((e.clientY - box.top) / box.height) * 100;
    el.style.transformOrigin = `${x}% ${y}%`;
    el.style.transform = `scale(${focalZoom * HOVER_ZOOM})`;
  };

  const zoomOff = () => {
    const el = imgRef.current;
    if (!el) return;
    el.style.transformOrigin = focalZoom === 1 ? "" : focalOrigin;
    el.style.transform = focalZoom === 1 ? "" : `scale(${focalZoom})`;
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
            <div
              className={`pp-piecemain ${mainImg && canHover ? "canzoom" : ""}`}
              onMouseMove={zoomTo}
              onMouseLeave={zoomOff}
            >
              {mainImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={imgRef}
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

            {/* Below the buy block at the owner's request, and closed to start.
                <details> rather than state and a click handler: it opens with
                no JavaScript, the keyboard and screen readers get it for free,
                and the text stays in the page source either way, so Google
                still reads a description the visitor hasn't expanded. */}
            {product.description && (
              <details className="pp-acc">
                <summary>
                  Description
                  <AccArrow />
                </summary>
                <p className="pp-desc">{product.description}</p>
              </details>
            )}

            {/* Same row, her wording. Hidden entirely while the body is
                empty — a dropdown that opens on nothing reads as broken. */}
            {returns.body.trim() && (
              <details className="pp-acc">
                <summary>
                  {returns.label.trim() || "Returns and Exchanges"}
                  <AccArrow />
                </summary>
                {/* pre-line, so the paragraph breaks she types in the admin
                    survive without her needing to know any markup. */}
                <p className="pp-desc pp-accbody">{returns.body.trim()}</p>
              </details>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
