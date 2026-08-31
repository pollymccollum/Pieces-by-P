"use client";

import { useRef, useState, useTransition } from "react";
import { PHOTO_SHAPES, type PhotoShape, type Product } from "@/lib/types";
import { StrandArt } from "@/components/storefront/visuals";
import { PhotoPositioner } from "./PhotoPositioner";
import {
  deleteProduct,
  deleteProductPhoto,
  makePhotoCover,
  updateProduct,
  uploadProductPhoto,
} from "../actions";

export function ProductEditor({
  product,
  categories,
  photoShape,
  onClose,
}: {
  product: Product;
  categories: string[];
  photoShape: PhotoShape;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tracksStock, setTracksStock] = useState(product.stock !== null);
  const [stockValue, setStockValue] = useState(product.stock ?? 0);
  const fileRef = useRef<HTMLInputElement>(null);
  // Which photo is open for repositioning. One at a time keeps the
  // preview big enough to drag accurately.
  const [positioningId, setPositioningId] = useState<string | null>(null);
  // Controlled so the wording box can appear the moment she picks
  // the lettered charm.
  const [charm, setCharm] = useState(product.charm ?? "");
  const [charmText, setCharmText] = useState(product.charm_text ?? "");

  const save = (formData: FormData) => {
    setError(null);
    start(async () => {
      const res = await updateProduct(product.id, formData);
      if (res.ok) onClose();
      else setError(res.error);
    });
  };

  const addPhoto = (file: File) => {
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    start(async () => {
      const res = await uploadProductPhoto(product.id, fd);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="pp-scrim" onClick={onClose}>
      <div
        className="pp-modal"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="pp-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <form action={save} style={{ padding: "24px 24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="ad-sec" style={{ margin: 0 }}>Edit piece</span>

          {/* photos */}
          <div className="ad-field">
            <span className="ad-lbl">Photos</span>
            <div className="ad-photos">
              {product.images.map((img, i) => (
                <div key={img.id} className="ad-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" />
                  <button
                    type="button"
                    className="rm"
                    title="Remove photo"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await deleteProductPhoto(img.id);
                        if (!res.ok) setError(res.error);
                      })
                    }
                  >
                    ×
                  </button>
                  {/* Opens the positioner. Sits on the photo itself so
                      it's obvious which one it will move. */}
                  <button
                    type="button"
                    className="ad-pos"
                    title="Choose what shows in the shop"
                    disabled={pending}
                    onClick={() =>
                      setPositioningId((id) => (id === img.id ? null : img.id))
                    }
                  >
                    ⤧
                  </button>
                  {i === 0 ? (
                    <span className="ad-cover">Cover</span>
                  ) : (
                    <button
                      type="button"
                      className="ad-cover"
                      style={{ border: "none", cursor: "pointer", width: "100%" }}
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const res = await makePhotoCover(product.id, img.id);
                          if (!res.ok) setError(res.error);
                        })
                      }
                    >
                      Make cover
                    </button>
                  )}
                </div>
              ))}
              <label className="ad-upload" title="Add a photo">
                +
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={pending}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addPhoto(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="ad-help" style={{ marginTop: 6 }}>
              The first photo is the cover shown in the shop. With no photo, the
              beaded illustration below is used instead.
            </p>
            {positioningId && (
              <PhotoPositioner
                key={positioningId}
                image={
                  product.images.find((i) => i.id === positioningId) ?? product.images[0]
                }
                shapeRatio={PHOTO_SHAPES[photoShape].ratio}
                onDone={() => setPositioningId(null)}
              />
            )}

            {product.images.length === 0 && (
              <div style={{ marginTop: 8 }}>
                <StrandArt
                  category={product.category}
                  colors={product.colors}
                  charm={charm}
                  charmText={charmText}
                  size={80}
                />
              </div>
            )}
          </div>

          <div className="ad-field">
            <span className="ad-lbl">Name</span>
            <input className="pp-input" name="name" defaultValue={product.name} required />
          </div>

          <div className="ad-grid2">
            <div className="ad-field">
              <span className="ad-lbl">Price ($)</span>
              <input
                className="pp-input"
                name="price"
                type="number"
                min="0"
                step="1"
                defaultValue={(product.price_cents / 100).toFixed(0)}
              />
            </div>
            <div className="ad-field">
              <span className="ad-lbl">Category</span>
              <select className="pp-select" name="category" defaultValue={product.category}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {!categories.includes(product.category) && (
                  <option value={product.category}>{product.category}</option>
                )}
              </select>
            </div>
          </div>

          <div className="ad-field">
            <span className="ad-lbl">Made with</span>
            <input
              className="pp-input"
              name="material"
              defaultValue={product.material}
              placeholder="e.g. Glass beads, gold-fill heart"
            />
          </div>

          <div className="ad-field">
            <span className="ad-lbl">Description</span>
            <textarea className="pp-textarea" name="description" defaultValue={product.description} />
          </div>

          <div className="ad-grid2">
            <div className="ad-field">
              <span className="ad-lbl">Badge</span>
              {/* Free text, with the old fixed options kept as suggestions.
                  She knows what her pieces need to say better than a
                  dropdown written months ago does. */}
              <input
                className="pp-input"
                name="tag"
                list="pp-badge-ideas"
                maxLength={24}
                placeholder="Leave empty for none"
                defaultValue={product.tag ?? ""}
              />
              <datalist id="pp-badge-ideas">
                <option value="New" />
                <option value="Bestseller" />
                <option value="Back in stock" />
                <option value="Limited" />
                <option value="One of a kind" />
                <option value="Made to order" />
              </datalist>
              <span className="ad-help">
                Small label on the photo. Type anything, or pick a suggestion.
              </span>
            </div>
            <div className="ad-field">
              <span className="ad-lbl">Illustration charm</span>
              <select
                className="pp-select"
                name="charm"
                value={charm}
                onChange={(e) => setCharm(e.target.value)}
              >
                <option value="heart">Heart</option>
                <option value="star">Star</option>
                <option value="coin">Coin</option>
                <option value="text">Letters or a word</option>
                <option value="">None</option>
              </select>
              {/* Only meaningful for the lettered charm, so it appears
                  with it rather than sitting there confusing her. */}
              {charm === "text" && (
                <>
                  <input
                    className="pp-input"
                    name="charmText"
                    maxLength={12}
                    placeholder="e.g. P, love, 2026"
                    value={charmText}
                    onChange={(e) => setCharmText(e.target.value)}
                    style={{ marginTop: 6 }}
                  />
                  <span className="ad-help">
                    Shown on a gold charm in the drawing. One to four letters
                    looks best.
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="ad-field" style={{ borderTop: "1px solid var(--hair)", paddingTop: 14 }}>
            <span className="ad-lbl">How many you have</span>
            <label className="ad-toggle" style={{ textTransform: "none", fontSize: 13, letterSpacing: 0, marginTop: 6 }}>
              <input
                type="checkbox"
                name="trackStock"
                checked={tracksStock}
                onChange={(e) => setTracksStock(e.target.checked)}
              />
              Limited quantity — count them down as they sell
            </label>

            {tracksStock ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                  <input
                    className="pp-input"
                    name="stock"
                    type="number"
                    min={0}
                    step={1}
                    style={{ width: 110 }}
                    value={stockValue}
                    onChange={(e) => setStockValue(Math.max(0, Number(e.target.value) || 0))}
                  />
                  <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>left in stock</span>
                </div>
                <span className="ad-help" style={{ marginTop: 6 }}>
                  {stockValue === 0
                    ? "Shows as SOLD OUT and can't be bought."
                    : stockValue < 5
                      ? `Shoppers will see "Only ${stockValue} left".`
                      : "No warning shown until fewer than 5 remain."}
                </span>
              </>
            ) : (
              <span className="ad-help" style={{ marginTop: 6 }}>
                Made to order — never sells out, no count shown.
              </span>
            )}
          </div>

          <label className="ad-toggle" style={{ textTransform: "none", fontSize: 13, letterSpacing: 0 }}>
            <input type="checkbox" name="custom" defaultChecked={product.custom} />
            Show the &ldquo;make it yours&rdquo; box on this piece
          </label>

          <label className="ad-toggle" style={{ textTransform: "none", fontSize: 13, letterSpacing: 0 }}>
            <input type="checkbox" name="active" defaultChecked={product.active} />
            Visible in the shop
          </label>

          {error && <p className="pp-hint">{error}</p>}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              paddingTop: 8,
              borderTop: "1px solid var(--hair)",
            }}
          >
            {confirmDelete ? (
              <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#C25B4A" }}>Delete for good?</span>
                <button
                  type="button"
                  className="pp-btn danger"
                  style={{ padding: "9px 16px" }}
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await deleteProduct(product.id);
                      if (res.ok) onClose();
                      else setError(res.error);
                    })
                  }
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  className="pp-btn ghost"
                  style={{ padding: "9px 16px" }}
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="pp-btn danger"
                style={{ padding: "11px 18px" }}
                onClick={() => setConfirmDelete(true)}
              >
                Delete piece
              </button>
            )}
            <button className="pp-btn sage" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
