"use client";

import { useMemo } from "react";
import { stockState, type Product } from "@/lib/types";
import Link from "next/link";
import { money } from "@/lib/format";
import { productPath } from "@/lib/product-url";
import { ProductVisual } from "./ProductVisual";

export function ShopGrid({
  products,
  categories,
  category,
  onCategoryChange,
}: {
  products: Product[];
  categories: string[];
  category: string;
  onCategoryChange: (c: string) => void;
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
                  {/* One link wrapping the whole tile rather than two buttons.
                      A real link means middle-click, open-in-new-tab and
                      "copy link address" all work, which is most of the point
                      of pieces having their own pages. */}
                  <Link href={productPath(p)} className="pp-cardlink">
                    <span className="pp-ph">
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
                    </span>
                    <span className="pp-cardname">{p.name}</span>
                    <span className="pp-mat">{p.material}</span>
                    {st.kind === "low" && <span className="pp-lowstock">Only {st.left} left</span>}
                    <span className="pp-cardmeta">
                      <span className="pp-price">{money(p.price_cents)}</span>
                      <span className="pp-view">{soldOut ? "Sold out" : "View"}</span>
                    </span>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
