"use client";

import { useState, useTransition } from "react";
import type { PhotoShape, Product } from "@/lib/types";
import { money } from "@/lib/format";
import { StrandArt } from "@/components/storefront/visuals";
import { createProduct, moveProduct } from "../actions";
import { ProductEditor } from "./ProductEditor";

export function ProductManager({
  products,
  categories,
  photoShape,
}: {
  products: Product[];
  categories: string[];
  photoShape: PhotoShape;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const editing = products.find((p) => p.id === editingId) ?? null;

  const move = (id: string, dir: -1 | 1) => {
    setError(null);
    start(async () => {
      const res = await moveProduct(id, dir);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <>
      <h1 className="ad-h2">Your pieces</h1>
      <p className="ad-lead">
        Add a piece, upload photos, set the price. The arrows change the order
        they appear in the shop. Anything not ticked <em>Visible</em> stays
        hidden from customers.
      </p>

      {error && <p className="pp-hint">{error}</p>}

      <div className="ad-card">
        {products.length === 0 ? (
          <div className="ad-empty">No pieces yet. Add your first one below.</div>
        ) : (
          products.map((p, i) => (
            <div key={p.id} className="ad-prow">
              <div className="ad-pthumb">
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].url} alt="" />
                ) : (
                  <StrandArt
                    category={p.category}
                    colors={p.colors}
                    charm={p.charm}
                    charmText={p.charm_text}
                    size={48}
                  />
                )}
              </div>

              <button
                onClick={() => setEditingId(p.id)}
                style={{ background: "none", border: "none", textAlign: "left", padding: 0 }}
              >
                <div className="ad-pname">
                  {p.name}
                  {!p.active && <span className="ad-hidden-pill">Hidden</span>}
                  {p.stock === 0 && <span className="ad-soldout-pill">Sold out</span>}
                </div>
                <div className="ad-pmeta">
                  {p.category} · {money(p.price_cents)} ·{" "}
                  {p.images.length === 0
                    ? "illustration"
                    : `${p.images.length} photo${p.images.length > 1 ? "s" : ""}`}
                  {p.stock !== null && (
                    <>
                      {" · "}
                      <span style={p.stock < 5 ? { color: "#B4472F" } : undefined}>
                        {p.stock} left
                      </span>
                    </>
                  )}
                </div>
              </button>

              <div className="ad-pactions">
                <button
                  className="ad-icon"
                  title="Move up"
                  disabled={pending || i === 0}
                  onClick={() => move(p.id, -1)}
                >
                  ↑
                </button>
                <button
                  className="ad-icon"
                  title="Move down"
                  disabled={pending || i === products.length - 1}
                  onClick={() => move(p.id, 1)}
                >
                  ↓
                </button>
                <button className="ad-icon" title="Edit" onClick={() => setEditingId(p.id)}>
                  ✎
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        className="pp-btn sage"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await createProduct();
            if (!res.ok) setError(res.error);
          })
        }
      >
        + Add a piece
      </button>
      <p className="ad-help" style={{ marginTop: 8 }}>
        New pieces start hidden so you can add photos and a price before anyone sees them.
      </p>

      {editing && (
        <ProductEditor
          product={editing}
          categories={categories}
          photoShape={photoShape}
          onClose={() => setEditingId(null)}
        />
      )}
    </>
  );
}
