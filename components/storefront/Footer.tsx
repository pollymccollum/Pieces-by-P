"use client";

export function Footer({
  brand,
  location,
  links,
}: {
  brand: string;
  location: string;
  links: { id: string; label: string }[];
}) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="pp-footer">
      <div className="pp-wrap pp-frow">
        <span className="pp-fword">{brand}</span>
        <div className="pp-flinks">
          {links.map((l) => (
            <button key={l.id} onClick={() => scrollTo(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <span className="pp-fine">
          Handmade in {location} · © {new Date().getFullYear()} {brand}
        </span>
      </div>
    </footer>
  );
}
