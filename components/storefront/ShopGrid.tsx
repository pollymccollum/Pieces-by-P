"use client";

import { useMemo } from "react";
import { stockState, type Product } from "@/lib/types";
import { money } from "@/lib/format";
import { ProductVisual } from "./ProductVisual";

export function ShopGrid({
  products,
  categories,
  category,
  onCategoryChange,
  onSelectProduct,
}: {
  products: Product[];
  categories: string[];
  category: string;
  onCategoryChange: (c: string) => void;
  onSelectProduct: (id: string) => void;
}) {
  const cats = useMemo(() => ["All", ...categories], [categories]);
  const shown = useMemo(
    () => (category === "All" ? products : products.filter((p) => p.category === category)),
    [category, products]
  );

  return (
    <section id="shop" className="pp-section">
      <div className="pp-wrap">
        <p className="pp-eyebrow-c">
          <span className="pp-script">the collection</span>
        </p>
        <h2 className="pp-h2">Shop by piece</h2>
        <div className="pp-filter">
          {cats.map((c) => (
            <button key={c} className={`pp-cat ${category === c ? "on" : ""}`} onClick={() => onCategoryChange(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="pp-grid">
          {shown.length === 0 ? (
            <p className="pp-note" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "24px 0" }}>
              No pieces here yet. Check back soon.
            </p>
          ) : (
            shown.map((p) => {
              const st = stockState(p.stock);
              const soldOut = st.kind === "out";

              return (
                <div key={p.id} className={`pp-card ${soldOut ? "soldout" : ""}`}>
                  <button
                    className="pp-ph"
                    onClick={() => onSelectProduct(p.id)}
                    style={{ padding: 0, border: "1px solid var(--hair)" }}
                  >
                    {/* Sold-out pieces stay visible but greyed, so the shop
                        doesn't look emptier than it is and shoppers can see
                        what she makes. */}
                    {!soldOut && p.tag && (
                      <span className={`pp-tagpill ${p.tag === "New" ? "new" : ""}`}>{p.tag}</span>
                    )}
                    <ProductVisual product={p} size={88} />
                    {soldOut && (
                      <span className="pp-soldout">
                        <span>Sold out</span>
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => onSelectProduct(p.id)}
                    style={{ background: "none", border: "none", padding: 0, textAlign: "left" }}
                  >
                    <div className="pp-cardname">{p.name}</div>
                    <div className="pp-mat">{p.material}</div>
                    {st.kind === "low" && (
                      <div className="pp-lowstock">
                        Only {st.left} left
                      </div>
                    )}
                    <div className="pp-cardmeta">
                      <span className="pp-price">{money(p.price_cents)}</span>
                      <span className="pp-view">{soldOut ? "Sold out" : "View"}</span>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
