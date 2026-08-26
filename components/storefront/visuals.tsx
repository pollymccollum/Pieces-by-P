// Pure, stateless visuals ported from pieces-by-p-store.jsx: the circular
// "P" badge, the beaded-strand SVG used as a product-photo fallback until a
// real photo is uploaded, and the bead divider rule. No hooks, so these
// render fine from Server or Client Components alike.

const GOLD = "#C79A3E";
const GOLD_HI = "#E6CD86";

function heartPath(x: number, y: number, s: number) {
  return `M ${x} ${y + s * 0.85} C ${x - s * 1.3} ${y - s * 0.1}, ${x - s * 1.05} ${y - s * 1.05}, ${x} ${y - s * 0.32} C ${x + s * 1.05} ${y - s * 1.05}, ${x + s * 1.3} ${y - s * 0.1}, ${x} ${y + s * 0.85} Z`;
}

function starPath(x: number, y: number, r: number) {
  const ri = r * 0.46;
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? ri : r;
    d += (i ? "L" : "M") + (x + rr * Math.cos(a)).toFixed(1) + "," + (y + rr * Math.sin(a)).toFixed(1) + " ";
  }
  return d + "Z";
}

function Charm({ type, x, y, s }: { type: string | null; x: number; y: number; s: number }) {
  if (type === "heart") return <path d={heartPath(x, y, s)} fill={GOLD} stroke={GOLD_HI} strokeWidth="0.5" />;
  if (type === "star") return <path d={starPath(x, y, s * 1.2)} fill={GOLD} stroke={GOLD_HI} strokeWidth="0.5" />;
  if (type === "coin")
    return (
      <g>
        <circle cx={x} cy={y} r={s * 1.15} fill={GOLD} stroke={GOLD_HI} strokeWidth="0.6" />
        <circle cx={x} cy={y} r={s * 0.7} fill="none" stroke={GOLD_HI} strokeWidth="0.5" />
      </g>
    );
  return null;
}

export function StrandArt({
  category,
  colors,
  charm,
  size = 96,
}: {
  category: string;
  colors: string[];
  charm: string | null;
  size?: number;
}) {
  const safeColors = colors && colors.length ? colors : ["#E4573B", "#E7789A", "#3E9DB0", "#E9C85A"];
  const cx = 50;
  const beads: React.ReactNode[] = [];
  const col = (i: number) => safeColors[i % safeColors.length];

  if (category === "Bracelets") {
    [0, 1, 2].forEach((row) => {
      const y = 40 + row * 12;
      const n = 13;
      for (let i = 0; i < n; i++) {
        const x = 16 + (i * 68) / (n - 1);
        beads.push(
          <circle key={`b${row}-${i}`} cx={x} cy={y} r="2.7" fill={col(i + row)} stroke="rgba(0,0,0,.1)" strokeWidth="0.4" />
        );
      }
    });
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        {beads}
        <line x1="86" y1="52" x2="86" y2="58" stroke={GOLD} strokeWidth="0.8" />
        <Charm type="heart" x={86} y={62} s={3} />
      </svg>
    );
  }

  const isChoker = category === "Chokers";
  const isCharm = category === "Charms";
  const cy = isChoker ? 40 : 26;
  const rx = isChoker ? 31 : isCharm ? 30 : 32;
  const ry = isChoker ? 12 : isCharm ? 24 : 26;
  const N = isChoker ? 24 : 22;
  for (let i = 0; i < N; i++) {
    const t = Math.PI + (i / (N - 1)) * Math.PI;
    const x = cx + rx * Math.cos(t);
    const y = cy - ry * Math.sin(t);
    beads.push(<circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.7" fill={col(i)} stroke="rgba(0,0,0,.1)" strokeWidth="0.4" />);
  }
  const bottomY = cy + ry;
  const charmS = isCharm ? 5.6 : isChoker ? 3.2 : 4.2;
  const charmY = bottomY + charmS + 3;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {beads}
      {charm && <line x1={cx} y1={bottomY} x2={cx} y2={charmY - charmS} stroke={GOLD} strokeWidth="0.8" />}
      {charm && <Charm type={charm} x={cx} y={charmY} s={charmS} />}
    </svg>
  );
}

export function Badge({ s = 36 }: { s?: number }) {
  return (
    <span className="pp-badge" style={{ width: s, height: s }} aria-hidden="true">
      <span className="pp-badge-p">P</span>
    </span>
  );
}

// The shop's mark in the header. Her uploaded logo if she has one,
// otherwise the sage "P" badge beside the letterspaced wordmark.
// A logo normally already contains the shop name, so it replaces both
// rather than sitting next to a second copy of the name.
export function BrandMark({
  brand,
  logoUrl,
  logoHeight,
  brandFont,
}: {
  brand: string;
  logoUrl: string | null;
  logoHeight: number;
  brandFont?: React.CSSProperties;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={brand} className="pp-logo" style={{ height: logoHeight }} />
    );
  }
  return (
    <>
      <Badge />
      <span className="pp-word" style={brandFont}>
        {brand}
      </span>
    </>
  );
}

export function BeadDivider() {
  const cols = ["#E4573B", "#E7789A", "#3E9DB0", "#E9C85A", "#8FB98F", "#EBA9BE"];
  return (
    <div className="pp-divider" role="presentation">
      <span className="pp-rule" />
      <svg width="120" height="20" viewBox="0 0 120 20" aria-hidden="true">
        {Array.from({ length: 15 }).map((_, i) => (
          <circle key={i} cx={6 + i * 8} cy="7" r="3" fill={cols[i % cols.length]} stroke="rgba(0,0,0,.1)" strokeWidth="0.5" />
        ))}
        <line x1="60" y1="10" x2="60" y2="13" stroke={GOLD} strokeWidth="1" />
        <path d={heartPath(60, 16, 3)} fill={GOLD} stroke={GOLD_HI} strokeWidth="0.5" />
      </svg>
      <span className="pp-rule" />
    </div>
  );
}
