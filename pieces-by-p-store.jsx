import React, { useState, useEffect, useMemo, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// PIECES BY P — editable storefront preview
// Owner "Edit site" mode: upload photos, edit every price + word,
// add / remove / reorder pieces. Saves to the artifact's shared
// persistent storage so changes stick and show to anyone viewing.
// (Real per-account login + database come with the Stripe backend.)
// Owner passcode for edit mode: "pieces"
// ─────────────────────────────────────────────────────────────

const OWNER_CODE = "pieces";

const DEFAULT_CONFIG = {
  brand: "Pieces by P",
  announce: "Handmade to order in Anderson, SC · Free shipping over $50",
  freeShipOver: 50,
  flatShip: 5,
  categories: ["Necklaces", "Bracelets", "Chokers", "Charms"],
  heroImgKey: null,
  hero: {
    eyebrow: "handmade, one at a time",
    eyebrowScript: "by Polly",
    title: "Colorful little pieces",
    titleScript: "worth collecting",
    lede: "Beaded necklaces, stacks, chokers, and charms, made to order in Anderson, South Carolina. Pick your piece, tell us your colors, and we'll make it yours.",
    cta: "Shop the collection",
  },
  about: {
    eyebrowScript: "about",
    title: "Made by hand, one piece at a time",
    body: "Every piece is designed and strung by Polly in small batches. Choose your colors, add an initial or a charm, and each order is made just for you. Handmade to order, so most pieces ship within about a week.",
  },
  contact: {
    heading: "Custom orders, pop-ups, and hellos",
    instagram: "@shop.piecesbyp",
    email: "hello@piecesbyp.co",
    maker: "Polly McCollum",
    location: "Anderson, South Carolina",
    findus: "local pop-ups and markets",
  },
  products: [
    { id: "swt", name: "Sweetheart Strand", category: "Necklaces", price: 42, material: "Glass & clay beads, 14k gold-fill heart", desc: "Candy pinks and reds with a puffy gold heart. Our most-loved everyday necklace, made to layer.", colors: ["#E4573B", "#E7789A", "#F2B8C6", "#E4573B", "#C79A3E"], charm: "heart", tag: "Bestseller", custom: true, images: [] },
    { id: "cst", name: "Coastal Stack (set of 5)", category: "Bracelets", price: 38, material: "Glass beads on stretch cord", desc: "Five stretch bracelets in beachy blues, coral, and cream. Wear the whole stack or split them up.", colors: ["#3E9DB0", "#E4573B", "#F5EFE2", "#EBA9BE", "#8FB98F"], charm: "heart", tag: "Bestseller", custom: true, images: [] },
    { id: "gdc", name: "Game Day Choker", category: "Chokers", price: 28, material: "Clay beads, gold-fill accents", desc: "Pick your team colors. A short beaded choker that shows up loud on game day.", colors: ["#E4573B", "#2B2A24", "#C79A3E", "#FDFBF4"], charm: null, custom: true, images: [] },
    { id: "pfh", name: "Puffy Heart Necklace", category: "Charms", price: 34, material: "Gold-fill heart on beaded chain", desc: "A single puffy gold heart on a fine beaded chain. Simple, sweet, goes with everything.", colors: ["#F5EFE2", "#EAD7A8", "#C79A3E"], charm: "heart", tag: "New", custom: false, images: [] },
    { id: "crl", name: "Coral Reef Necklace", category: "Necklaces", price: 46, material: "Disc beads, gold-fill heart", desc: "Warm coral and sunset tones in a graduated disc strand. Summer in a necklace.", colors: ["#E4573B", "#EF8A6B", "#E7789A", "#F2C0A0"], charm: "heart", tag: "New", custom: true, images: [] },
    { id: "blb", name: "Bluebell Layered Set", category: "Necklaces", price: 54, material: "Glass beads, gold-fill coin & chain", desc: "A navy-and-turquoise beaded strand layered with a gold coin necklace. Two pieces, endless pairings.", colors: ["#2E4A7A", "#3E9DB0", "#7FB6C4", "#C79A3E"], charm: "coin", tag: null, custom: false, images: [] },
    { id: "cpb", name: "Color Pop Bangles (set of 4)", category: "Bracelets", price: 32, material: "Coated beads on memory wire", desc: "Four skinny bangles in orange, pink, green, and blue. Instant color, stacks with anything.", colors: ["#E58A2B", "#E15E92", "#8FB98F", "#3E9DB0"], charm: null, tag: null, custom: true, images: [] },
    { id: "pcc", name: "Pearl & Candy Choker", category: "Chokers", price: 30, material: "Freshwater pearls & glass beads", desc: "Freshwater pearls with soft pink beads. A little sweet, a little classic.", colors: ["#F5EFE2", "#EBA9BE", "#F2D7DE", "#E7789A"], charm: null, tag: null, custom: false, images: [] },
    { id: "inh", name: "Initial Heart Charm", category: "Charms", price: 24, material: "Gold-fill initial + heart", desc: "Your initial and a tiny heart on a beaded chain. The go-to gift, personalized just for her.", colors: ["#EADFC6", "#C79A3E"], charm: "heart", tag: null, custom: true, images: [] },
    { id: "sun", name: "Sunny Day Stack (set of 3)", category: "Bracelets", price: 30, material: "Glass & gold beads on stretch cord", desc: "Buttery yellows, cream, and gold. The stack that makes a white tee feel like an outfit.", colors: ["#E9C85A", "#FDFBF4", "#C79A3E"], charm: null, tag: null, custom: false, images: [] },
    { id: "blu", name: "Blush Beaded Necklace", category: "Necklaces", price: 40, material: "Clay beads, gold-fill heart", desc: "Soft blush and cream with a gold heart. Quiet enough for every day, pretty enough to notice.", colors: ["#EBA9BE", "#F2D7DE", "#F5EFE2", "#C79A3E"], charm: "heart", tag: null, custom: true, images: [] },
    { id: "stc", name: "Star & Coin Necklace", category: "Charms", price: 36, material: "Gold-fill star & coin on beads", desc: "A gold star and coin medallion on a deep-blue beaded chain. A little celestial, a little coastal.", colors: ["#2E4A7A", "#3E9DB0", "#C79A3E"], charm: "star", tag: null, custom: false, images: [] },
  ],
};

const money = (n) => `$${Number(n || 0).toFixed(0)}`;
const uid = () => Math.random().toString(36).slice(2, 8);
const GOLD = "#C79A3E", GOLD_HI = "#E6CD86";

// ── storage helpers (shared persistent artifact storage) ──────
const hasStore = typeof window !== "undefined" && window.storage;
async function ss(k, v) { try { if (hasStore) await window.storage.set(k, v, true); } catch (e) { console.warn("save", e); } }
async function sg(k) { try { if (hasStore) { const r = await window.storage.get(k, true); return r ? r.value : null; } } catch (e) { return null; } return null; }
async function sd(k) { try { if (hasStore) await window.storage.delete(k, true); } catch (e) {} }

function compressImage(file, maxDim = 1100, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
        else if (height >= width && height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
        const c = document.createElement("canvas");
        c.width = width; c.height = height;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject; img.src = reader.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

// ── charm + beaded-strand art (fallback when no photo) ────────
function heartPath(x, y, s) {
  return `M ${x} ${y + s * 0.85} C ${x - s * 1.3} ${y - s * 0.1}, ${x - s * 1.05} ${y - s * 1.05}, ${x} ${y - s * 0.32} C ${x + s * 1.05} ${y - s * 1.05}, ${x + s * 1.3} ${y - s * 0.1}, ${x} ${y + s * 0.85} Z`;
}
function starPath(x, y, r) {
  const ri = r * 0.46; let d = "";
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? ri : r; d += (i ? "L" : "M") + (x + rr * Math.cos(a)).toFixed(1) + "," + (y + rr * Math.sin(a)).toFixed(1) + " "; }
  return d + "Z";
}
function Charm({ type, x, y, s }) {
  if (type === "heart") return <path d={heartPath(x, y, s)} fill={GOLD} stroke={GOLD_HI} strokeWidth="0.5" />;
  if (type === "star") return <path d={starPath(x, y, s * 1.2)} fill={GOLD} stroke={GOLD_HI} strokeWidth="0.5" />;
  if (type === "coin") return (<g><circle cx={x} cy={y} r={s * 1.15} fill={GOLD} stroke={GOLD_HI} strokeWidth="0.6" /><circle cx={x} cy={y} r={s * 0.7} fill="none" stroke={GOLD_HI} strokeWidth="0.5" /></g>);
  return null;
}
function StrandArt({ category, colors, charm, size = 96 }) {
  const cx = 50; const beads = []; const col = (i) => colors[i % colors.length];
  if (category === "Bracelets") {
    [0, 1, 2].forEach((row) => { const y = 40 + row * 12; const n = 13; for (let i = 0; i < n; i++) { const x = 16 + (i * 68) / (n - 1); beads.push(<circle key={`b${row}-${i}`} cx={x} cy={y} r="2.7" fill={col(i + row)} stroke="rgba(0,0,0,.1)" strokeWidth="0.4" />); } });
    return (<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">{beads}<line x1="86" y1="52" x2="86" y2="58" stroke={GOLD} strokeWidth="0.8" /><Charm type="heart" x={86} y={62} s={3} /></svg>);
  }
  const isChoker = category === "Chokers", isCharm = category === "Charms";
  const cy = isChoker ? 40 : 26, rx = isChoker ? 31 : isCharm ? 30 : 32, ry = isChoker ? 12 : isCharm ? 24 : 26, N = isChoker ? 24 : 22;
  for (let i = 0; i < N; i++) { const t = Math.PI + (i / (N - 1)) * Math.PI; const x = cx + rx * Math.cos(t); const y = cy - ry * Math.sin(t); beads.push(<circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.7" fill={col(i)} stroke="rgba(0,0,0,.1)" strokeWidth="0.4" />); }
  const bottomY = cy + ry, charmS = isCharm ? 5.6 : isChoker ? 3.2 : 4.2, charmY = bottomY + charmS + 3;
  return (<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">{beads}{charm && <line x1={cx} y1={bottomY} x2={cx} y2={charmY - charmS} stroke={GOLD} strokeWidth="0.8" />}{charm && <Charm type={charm} x={cx} y={charmY} s={charmS} />}</svg>);
}

function Badge({ s = 36 }) {
  return (<span className="pp-badge" style={{ width: s, height: s }} aria-hidden="true"><span className="pp-badge-p">P</span></span>);
}
function BeadDivider() {
  const cols = ["#E4573B", "#E7789A", "#3E9DB0", "#E9C85A", "#8FB98F", "#EBA9BE"];
  return (<div className="pp-divider" role="presentation"><span className="pp-rule" /><svg width="120" height="20" viewBox="0 0 120 20" aria-hidden="true">{Array.from({ length: 15 }).map((_, i) => (<circle key={i} cx={6 + i * 8} cy="7" r="3" fill={cols[i % cols.length]} stroke="rgba(0,0,0,.1)" strokeWidth="0.5" />))}<line x1="60" y1="10" x2="60" y2="13" stroke={GOLD} strokeWidth="1" /><path d={heartPath(60, 16, 3)} fill={GOLD} stroke={GOLD_HI} strokeWidth="0.5" /></svg><span className="pp-rule" /></div>);
}

// editable text (input/textarea when edit mode on, plain element otherwise)
function Field({ on, value, set, as: As = "span", area = false, className = "", style, ph = "" }) {
  if (!on) { return <As className={className} style={style}>{value}</As>; }
  const common = { className: `${className} pp-ein`, style, value: value || "", placeholder: ph, onChange: (e) => set(e.target.value), onClick: (e) => e.stopPropagation() };
  return area ? <textarea {...common} rows={4} /> : <input {...common} />;
}

// picks first available uploaded photo for a product
function firstPhoto(p, images) { const k = (p.images || []).find((k) => images[k]); return k ? images[k] : null; }

export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [images, setImages] = useState({});
  const [ready, setReady] = useState(false);

  const [edit, setEdit] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passErr, setPassErr] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saveState, setSaveState] = useState("idle");

  const [category, setCategory] = useState("All");
  const [activeId, setActiveId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [gIdx, setGIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [noteInput, setNoteInput] = useState("");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [order, setOrder] = useState(null);
  const [pay, setPay] = useState("card");
  const [touched, setTouched] = useState(false);
  const [ship, setShip] = useState({ name: "", email: "", phone: "", addr1: "", addr2: "", city: "", state: "", zip: "", country: "United States", notes: "" });

  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  // discreet owner access: tap the footer shop name 5 times
  const secretRef = useRef({ n: 0, t: null });
  const secretTap = () => { const s = secretRef.current; s.n += 1; clearTimeout(s.t); s.t = setTimeout(() => { s.n = 0; }, 1600); if (s.n >= 5) { s.n = 0; setShowPass(true); } };

  // load saved config + hydrate images
  useEffect(() => {
    (async () => {
      let cfg = DEFAULT_CONFIG;
      const raw = await sg("pbp_config");
      if (raw) { try { cfg = { ...DEFAULT_CONFIG, ...JSON.parse(raw) }; } catch (e) {} }
      else { await ss("pbp_config", JSON.stringify(DEFAULT_CONFIG)); }
      setConfig(cfg); setReady(true);
      const keys = [...cfg.products.flatMap((p) => p.images || []), cfg.heroImgKey].filter(Boolean);
      const map = {};
      await Promise.all([...new Set(keys)].map(async (k) => { const v = await sg(k); if (v) map[k] = v; }));
      setImages(map);
    })();
  }, []);

  const doSave = async (cfg) => { setSaveState("saving"); await ss("pbp_config", JSON.stringify(cfg)); setSaveState("saved"); setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1600); };
  const commit = (next, save = true) => { setConfig(next); configRef.current = next; if (save) doSave(next); };
  const patchHero = (o) => setConfig((c) => ({ ...c, hero: { ...c.hero, ...o } }));
  const patchAbout = (o) => setConfig((c) => ({ ...c, about: { ...c.about, ...o } }));
  const patchContact = (o) => setConfig((c) => ({ ...c, contact: { ...c.contact, ...o } }));
  const patchProduct = (id, o) => setConfig((c) => ({ ...c, products: c.products.map((p) => (p.id === id ? { ...p, ...o } : p)) }));

  const products = config.products;
  const cats = ["All", ...config.categories];
  const shown = useMemo(() => (category === "All" ? products : products.filter((p) => p.category === category)), [category, products]);
  const active = products.find((p) => p.id === activeId);
  const editing = products.find((p) => p.id === editingId);

  const cartLines = cart.map((l) => ({ ...products.find((p) => p.id === l.id), ...l })).filter((l) => l.name);
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const subtotal = cartLines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipCost = subtotal >= config.freeShipOver || subtotal === 0 ? 0 : config.flatShip;
  const total = subtotal + shipCost;

  // ── product / image editing ──
  async function addImages(productId, files) {
    const arr = Array.from(files); if (!arr.length) return;
    const added = {}; const keys = [];
    for (const f of arr) { try { const d = await compressImage(f); const k = "pbpimg_" + Date.now().toString(36) + uid(); await ss(k, d); keys.push(k); added[k] = d; } catch (e) { console.warn(e); } }
    setImages((m) => ({ ...m, ...added }));
    const cfg = configRef.current;
    commit({ ...cfg, products: cfg.products.map((p) => (p.id === productId ? { ...p, images: [...(p.images || []), ...keys] } : p)) });
  }
  async function removeImage(productId, key) {
    const cfg = configRef.current;
    commit({ ...cfg, products: cfg.products.map((p) => (p.id === productId ? { ...p, images: (p.images || []).filter((k) => k !== key) } : p)) });
    setImages((m) => { const n = { ...m }; delete n[key]; return n; }); sd(key);
  }
  async function setHeroImage(files) {
    const f = files && files[0]; if (!f) return;
    try { const d = await compressImage(f); const k = "pbpimg_" + Date.now().toString(36) + uid(); await ss(k, d); setImages((m) => ({ ...m, [k]: d })); commit({ ...configRef.current, heroImgKey: k }); } catch (e) { console.warn(e); }
  }
  function addProduct() {
    const cfg = configRef.current; const id = "p_" + uid();
    const np = { id, name: "New piece", category: cfg.categories[0] || "Necklaces", price: 0, material: "", desc: "", colors: ["#E4573B", "#E7789A", "#3E9DB0", "#E9C85A"], charm: "heart", tag: "New", custom: true, images: [] };
    commit({ ...cfg, products: [...cfg.products, np] }); setEditingId(id);
  }
  function deleteProduct(id) {
    const cfg = configRef.current; const p = cfg.products.find((x) => x.id === id);
    commit({ ...cfg, products: cfg.products.filter((x) => x.id !== id) });
    (p?.images || []).forEach((k) => { sd(k); setImages((m) => { const n = { ...m }; delete n[k]; return n; }); });
    setEditingId(null);
  }
  function moveProduct(id, dir) {
    const cfg = configRef.current; const i = cfg.products.findIndex((p) => p.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= cfg.products.length) return;
    const arr = [...cfg.products]; [arr[i], arr[j]] = [arr[j], arr[i]]; commit({ ...cfg, products: arr });
  }
  function addCategory(name) { const n = (name || "").trim(); if (!n) return; const cfg = configRef.current; if (cfg.categories.includes(n)) return; commit({ ...cfg, categories: [...cfg.categories, n] }); }
  function removeCategory(name) { const cfg = configRef.current; commit({ ...cfg, categories: cfg.categories.filter((c) => c !== name) }); }
  function resetContent() { commit(DEFAULT_CONFIG); }

  // ── shopping ──
  const openProduct = (p) => { if (edit) { setEditingId(p.id); } else { setActiveId(p.id); setQty(1); setNoteInput(""); setGIdx(0); } };
  const addToCart = (product, n, note) => {
    const cleanNote = (note || "").trim();
    setCart((prev) => { const ex = prev.find((l) => l.id === product.id && (l.note || "") === cleanNote); if (ex) return prev.map((l) => (l === ex ? { ...l, qty: l.qty + n } : l)); return [...prev, { lineId: uid(), id: product.id, qty: n, note: cleanNote }]; });
  };
  const setLineQty = (lineId, n) => setCart((prev) => prev.flatMap((l) => (l.lineId === lineId ? (n <= 0 ? [] : [{ ...l, qty: n }]) : [l])));
  const requiredOk = ship.name && ship.email && ship.addr1 && ship.city && ship.state && ship.zip;
  const placeOrder = () => { setTouched(true); if (!requiredOk || cartLines.length === 0) return; const num = "PBP-" + uid().toUpperCase(); setOrder({ num, ship: { ...ship }, lines: cartLines, subtotal, shipCost, total, pay }); setCart([]); setCheckout(false); setCartOpen(false); };
  const startOver = () => { setOrder(null); setTouched(false); setCategory("All"); setShip({ name: "", email: "", phone: "", addr1: "", addr2: "", city: "", state: "", zip: "", country: "United States", notes: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const tryPass = () => { if (passInput.trim().toLowerCase() === OWNER_CODE) { setEdit(true); setShowPass(false); setPassInput(""); setPassErr(false); } else { setPassErr(true); } };
  const exitEdit = () => { doSave(configRef.current); setEdit(false); setEditingId(null); setShowSettings(false); };

  const field = (key, label, opts = {}) => {
    const req = opts.required; const missing = touched && req && !ship[key];
    return (<label className="pp-field" style={{ gridColumn: opts.span ? "1 / -1" : "auto" }}><span className="pp-flabel">{label}{req && <em className="pp-req"> *</em>}</span><input className="pp-input" style={missing ? { borderColor: "#C25B4A" } : undefined} value={ship[key]} type={opts.type || "text"} placeholder={opts.ph || ""} onChange={(e) => setShip((s) => ({ ...s, [key]: e.target.value }))} /></label>);
  };

  const ProductVisual = ({ p, size }) => { const ph = firstPhoto(p, images); return ph ? <img src={ph} alt={p.name} className="pp-photo" /> : <StrandArt category={p.category} colors={p.colors} charm={p.charm} size={size} />; };
  const heroPhoto = images[config.heroImgKey];

  return (
    <div className="pp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Dancing+Script:wght@600;700&family=Poppins:wght@300;400;500&display=swap');
        :root{--cream:#FAF6EC;--cream2:#F2EBD8;--surface:#FFFDF7;--ink:#2B2A24;--ink-soft:#6E6A5C;--sage:#A8BF83;--sage-deep:#6E7F49;--sage-soft:#DEE7C8;--gold:#C79A3E;--coral:#E4573B;--pink:#E15E92;--blue:#3E9DB0;--hair:#E7E0CD;--serif:'Fraunces',Georgia,serif;--script:'Dancing Script',cursive;--sans:'Poppins',system-ui,sans-serif;}
        *{box-sizing:border-box;}
        .pp-root{background:var(--cream);color:var(--ink);font-family:var(--sans);font-weight:300;line-height:1.6;-webkit-font-smoothing:antialiased;min-height:100vh;}
        .pp-root button{font-family:inherit;cursor:pointer;}
        .pp-wrap{max-width:1180px;margin:0 auto;padding:0 22px;}
        .pp-eyebrow,.pp-flabel,.pp-cat,.pp-navlink{letter-spacing:.16em;text-transform:uppercase;font-size:11px;}
        .pp-script{font-family:var(--script);font-weight:700;text-transform:none;letter-spacing:0;}
        .pp-photo{width:100%;height:100%;object-fit:cover;display:block;}

        .pp-announce{background:var(--sage-deep);color:#F7F4E8;text-align:center;padding:8px 12px;font-size:10.5px;letter-spacing:.15em;text-transform:uppercase;}

        .pp-badge{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--surface);border:1.5px solid var(--sage);flex:none;}
        .pp-badge-p{font-family:var(--script);font-weight:700;color:var(--sage-deep);font-size:20px;line-height:1;margin-top:-1px;}

        .pp-header{position:sticky;top:0;z-index:40;background:rgba(250,246,236,.9);backdrop-filter:blur(8px);border-bottom:1px solid var(--hair);}
        .pp-headrow{display:flex;align-items:center;justify-content:space-between;height:66px;}
        .pp-brand{display:flex;align-items:center;gap:11px;background:none;border:none;padding:0;}
        .pp-word{font-family:var(--serif);font-weight:400;font-size:22px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink);line-height:1;}
        .pp-nav{display:flex;gap:22px;align-items:center;}
        .pp-navlink{background:none;border:none;color:var(--ink);padding:6px 0;}
        .pp-navlink:hover{color:var(--sage-deep);}
        .pp-editbtn{background:none;border:1px solid var(--sage);color:var(--sage-deep);border-radius:20px;padding:6px 12px;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;}
        .pp-editbtn:hover{background:var(--sage-soft);}
        .pp-cartbtn{background:none;border:none;position:relative;display:flex;align-items:center;gap:7px;color:var(--ink);}
        .pp-cartbtn:hover{color:var(--sage-deep);}
        .pp-badge-count{min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:var(--coral);color:#fff;font-size:10px;display:inline-flex;align-items:center;justify-content:center;font-weight:400;}

        /* edit toolbar */
        .pp-editbar{position:sticky;top:0;z-index:50;background:var(--ink);color:var(--cream);display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 22px;}
        .pp-editbar .lbl{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--sage);}
        .pp-editbar .msg{font-size:11px;color:#C9C2B0;flex:1;min-width:180px;}
        .pp-tbtn{background:none;border:1px solid #4a473e;color:var(--cream);border-radius:20px;padding:7px 14px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;}
        .pp-tbtn:hover{border-color:var(--sage);}
        .pp-tbtn.primary{background:var(--sage-deep);border-color:var(--sage-deep);}
        .pp-tbtn.primary:hover{background:#5c6b3c;}
        .pp-saved{font-size:11px;color:var(--sage);letter-spacing:.1em;}

        .pp-ein{border:1px dashed var(--sage)!important;background:rgba(168,191,131,.1);border-radius:8px;padding:4px 8px;font-family:inherit;font-size:inherit;font-weight:inherit;color:inherit;width:100%;line-height:1.3;resize:vertical;}
        .pp-ein:focus{outline:none;border-color:var(--sage-deep)!important;background:rgba(168,191,131,.16);}

        .pp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1.5px solid var(--ink);background:var(--ink);color:var(--cream);padding:13px 26px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;}
        .pp-btn:hover{background:var(--sage-deep);border-color:var(--sage-deep);}
        .pp-btn.sage{background:var(--sage-deep);border-color:var(--sage-deep);}
        .pp-btn.sage:hover{background:#5c6b3c;}
        .pp-btn.ghost{background:none;color:var(--ink);}
        .pp-btn.ghost:hover{background:var(--ink);color:var(--cream);}
        .pp-btn.danger{background:none;color:#B4472F;border-color:#D9A99C;}
        .pp-btn.danger:hover{background:#B4472F;color:#fff;border-color:#B4472F;}
        .pp-btn:disabled{opacity:.4;cursor:not-allowed;}

        .pp-hero{display:grid;grid-template-columns:1fr;gap:0;border-bottom:1px solid var(--hair);background:linear-gradient(180deg,var(--cream),var(--cream2));}
        .pp-hero-copy{padding:52px 22px 44px;display:flex;flex-direction:column;justify-content:center;gap:16px;}
        .pp-hero-eye{color:var(--sage-deep);}
        .pp-hero-eye .pp-script{font-size:22px;color:var(--sage-deep);margin-left:4px;}
        .pp-h1{font-family:var(--serif);font-weight:400;font-size:clamp(36px,6.4vw,56px);line-height:1.04;margin:0;}
        .pp-h1 .pp-script{display:block;color:var(--coral);font-size:clamp(40px,7vw,64px);line-height:.9;margin-top:4px;}
        .pp-lede{max-width:40ch;color:var(--ink-soft);font-size:15px;}
        .pp-hero-art{min-height:270px;display:flex;align-items:center;justify-content:center;position:relative;padding:20px;overflow:hidden;}
        .pp-hero-art.haspic{padding:0;}
        .pp-hero-art .pp-photo{position:absolute;inset:0;}
        .pp-tag-note{position:absolute;bottom:14px;left:0;right:0;text-align:center;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--sage-deep);opacity:.75;}

        .pp-section{padding:54px 0;}
        .pp-eyebrow-c{text-align:center;color:var(--sage-deep);margin-bottom:8px;}
        .pp-eyebrow-c .pp-script{font-size:22px;}
        .pp-h2{font-family:var(--serif);font-weight:400;font-size:clamp(27px,4vw,38px);text-align:center;margin:0 0 4px;}

        .pp-filter{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:24px 0 32px;}
        .pp-cat{background:none;border:none;color:var(--ink-soft);padding:8px 14px;position:relative;}
        .pp-cat:hover{color:var(--ink);}
        .pp-cat.on{color:var(--sage-deep);}
        .pp-cat.on::after{content:"";position:absolute;left:14px;right:14px;bottom:2px;height:2px;background:var(--sage);border-radius:2px;}

        .pp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}
        .pp-card{background:none;border:none;padding:0;text-align:left;display:flex;flex-direction:column;gap:11px;position:relative;}
        .pp-ph{position:relative;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--hair);border-radius:14px;background:radial-gradient(120% 100% at 32% 22%,#FFFFFF 0%,var(--surface) 45%,#F1EAD7 100%);transition:transform .4s ease,box-shadow .4s ease;}
        .pp-card:hover .pp-ph{transform:translateY(-4px);box-shadow:0 18px 34px -22px rgba(110,127,73,.55);}
        .pp-tagpill{position:absolute;top:10px;left:10px;font-size:9px;letter-spacing:.12em;text-transform:uppercase;padding:4px 9px;border-radius:20px;background:var(--sage-soft);color:var(--sage-deep);z-index:2;}
        .pp-tagpill.new{background:#F7D9CF;color:var(--coral);}
        .pp-cardname{font-family:var(--serif);font-size:19px;line-height:1.15;}
        .pp-mat{font-size:11px;color:var(--ink-soft);letter-spacing:.02em;margin-top:1px;}
        .pp-cardmeta{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-top:6px;}
        .pp-price{font-size:13px;letter-spacing:.04em;}
        .pp-view{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--sage-deep);opacity:0;transition:opacity .3s;}
        .pp-card:hover .pp-view{opacity:1;}
        .pp-editflag{position:absolute;top:10px;right:10px;z-index:2;background:var(--ink);color:var(--cream);border:none;border-radius:20px;padding:6px 11px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;}
        .pp-cardmove{position:absolute;bottom:52px;right:10px;display:flex;gap:4px;z-index:2;}
        .pp-cardmove button{width:26px;height:26px;border-radius:50%;border:1px solid var(--hair);background:var(--cream);font-size:12px;}
        .pp-addcard{border:1.5px dashed var(--sage);border-radius:14px;background:rgba(168,191,131,.08);color:var(--sage-deep);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;aspect-ratio:1/1;font-size:12px;letter-spacing:.1em;text-transform:uppercase;}
        .pp-addcard:hover{background:rgba(168,191,131,.16);}
        .pp-addcard .plus{font-size:30px;line-height:1;font-weight:300;}

        .pp-scrim{position:fixed;inset:0;z-index:60;background:rgba(43,42,36,.42);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:20px;}
        .pp-modal{background:var(--cream);max-width:900px;width:100%;max-height:92vh;overflow:auto;border:1px solid var(--hair);border-radius:18px;position:relative;animation:pop .28s ease;}
        @keyframes pop{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}
        .pp-modal-grid{display:grid;grid-template-columns:1fr;}
        .pp-gallery{padding:26px;background:var(--surface);border-bottom:1px solid var(--hair);}
        .pp-gmain{aspect-ratio:1/1;border:1px solid var(--hair);border-radius:14px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(120% 100% at 32% 22%,#FFFFFF 0%,var(--surface) 45%,#F1EAD7 100%);}
        .pp-thumbs{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
        .pp-thumb{width:52px;height:52px;border:1px solid var(--hair);border-radius:9px;overflow:hidden;background:var(--surface);padding:0;position:relative;}
        .pp-thumb.on{border-color:var(--sage);}
        .pp-thumb img{width:100%;height:100%;object-fit:cover;}
        .pp-thumb .rm{position:absolute;top:1px;right:1px;background:rgba(43,42,36,.75);color:#fff;border:none;border-radius:50%;width:16px;height:16px;font-size:11px;line-height:1;padding:0;}
        .pp-detail{padding:28px 26px 30px;display:flex;flex-direction:column;gap:13px;}
        .pp-spec{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--sage-deep);}
        .pp-detail .pp-cardname{font-size:29px;}
        .pp-desc{color:var(--ink-soft);font-size:14.5px;line-height:1.65;}
        .pp-close{position:absolute;top:14px;right:16px;background:var(--cream);border:1px solid var(--hair);border-radius:50%;width:32px;height:32px;font-size:18px;color:var(--ink);line-height:1;z-index:3;}
        .pp-qty{display:inline-flex;align-items:center;border:1.5px solid var(--ink);border-radius:30px;}
        .pp-qty button{width:38px;height:40px;background:none;border:none;font-size:16px;color:var(--ink);}
        .pp-qty span{width:36px;text-align:center;font-size:14px;}
        .pp-custom{display:flex;flex-direction:column;gap:6px;}
        .pp-input,.pp-textarea,.pp-select{border:1px solid var(--hair);background:var(--surface);padding:11px 12px;border-radius:10px;font-family:var(--sans);font-size:14px;color:var(--ink);font-weight:300;width:100%;}
        .pp-input:focus,.pp-textarea:focus,.pp-select:focus{outline:none;border-color:var(--sage);}
        .pp-textarea{min-height:70px;resize:vertical;}
        .pp-note{font-size:11px;color:var(--ink-soft);line-height:1.5;}

        /* product editor */
        .pp-ed-body{padding:24px 24px 26px;display:flex;flex-direction:column;gap:14px;}
        .pp-ed-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .pp-ed-field{display:flex;flex-direction:column;gap:5px;}
        .pp-ed-lbl{font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--sage-deep);}
        .pp-uploadbtn{border:1.5px dashed var(--sage);background:rgba(168,191,131,.08);color:var(--sage-deep);border-radius:10px;padding:12px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;width:100%;}
        .pp-uploadbtn:hover{background:rgba(168,191,131,.16);}
        .pp-check{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink);}
        .pp-ed-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding-top:6px;border-top:1px solid var(--hair);}

        .pp-overlay{position:fixed;inset:0;z-index:60;background:rgba(43,42,36,.42);display:flex;justify-content:flex-end;}
        .pp-drawer{background:var(--cream);width:min(420px,100%);height:100%;display:flex;flex-direction:column;animation:slide .3s ease;border-left:1px solid var(--hair);}
        @keyframes slide{from{transform:translateX(100%)}to{transform:none}}
        .pp-dhead{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid var(--hair);}
        .pp-dtitle{font-family:var(--serif);font-size:23px;}
        .pp-dbody{flex:1;overflow:auto;padding:6px 22px;}
        .pp-line{display:grid;grid-template-columns:58px 1fr auto;gap:12px;padding:16px 0;border-bottom:1px solid var(--hair);align-items:start;}
        .pp-line .pp-ph{width:58px;height:58px;border-radius:10px;}
        .pp-lname{font-family:var(--serif);font-size:17px;line-height:1.1;}
        .pp-lnote{font-size:11px;color:var(--sage-deep);margin-top:3px;font-style:italic;}
        .pp-mini{display:inline-flex;align-items:center;border:1px solid var(--hair);border-radius:20px;margin-top:8px;}
        .pp-mini button{width:26px;height:26px;background:none;border:none;color:var(--ink);}
        .pp-mini span{width:26px;text-align:center;font-size:12px;}
        .pp-dfoot{border-top:1px solid var(--hair);padding:18px 22px 22px;background:var(--surface);}
        .pp-row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;letter-spacing:.02em;}
        .pp-row.total{font-size:15px;border-top:1px solid var(--hair);padding-top:10px;margin-top:4px;}
        .pp-empty{text-align:center;color:var(--ink-soft);padding:56px 20px;font-size:14px;}
        .pp-remove{background:none;border:none;color:var(--ink-soft);font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-top:8px;}

        .pp-checkout{max-width:960px;margin:0 auto;padding:38px 22px 70px;}
        .pp-co-grid{display:grid;grid-template-columns:1fr;gap:32px;}
        .pp-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        .pp-field{display:flex;flex-direction:column;gap:6px;}
        .pp-req{color:#C25B4A;font-style:normal;}
        .pp-summary{background:var(--surface);border:1px solid var(--hair);border-radius:16px;padding:22px;height:fit-content;}
        .pp-pay{display:flex;flex-direction:column;gap:10px;}
        .pp-payopt{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--hair);border-radius:12px;padding:14px;background:var(--surface);}
        .pp-payopt.on{border-color:var(--sage);background:#FBFAF2;}
        .pp-radio{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--ink);margin-top:2px;flex:none;position:relative;}
        .pp-payopt.on .pp-radio::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--sage-deep);}
        .pp-hint{font-size:12px;color:#C25B4A;margin-top:6px;}

        .pp-confirm{max-width:640px;margin:0 auto;padding:64px 22px;text-align:center;}
        .pp-block{text-align:left;background:var(--surface);border:1px solid var(--hair);border-radius:14px;padding:20px 22px;margin:22px 0;font-size:13.5px;line-height:1.7;}
        .pp-block h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--sage-deep);margin:0 0 8px;}

        .pp-contact{background:var(--sage-soft);border-top:1px solid var(--hair);}
        .pp-contact-grid{display:grid;grid-template-columns:1fr;gap:32px;padding:48px 0;}
        .pp-clines{font-size:14px;line-height:2;color:var(--ink-soft);}
        .pp-clines strong{color:var(--ink);font-weight:400;}
        .pp-cline-edit{display:grid;grid-template-columns:90px 1fr;gap:8px;align-items:center;margin-bottom:8px;}
        .pp-cform{display:grid;gap:12px;}

        .pp-footer{background:var(--ink);color:#D8D2C2;padding:30px 0;}
        .pp-frow{display:flex;flex-direction:column;gap:18px;align-items:center;text-align:center;}
        .pp-fword{font-family:var(--serif);font-size:20px;letter-spacing:.18em;text-transform:uppercase;color:var(--cream);}
        .pp-flinks{display:flex;gap:20px;flex-wrap:wrap;justify-content:center;}
        .pp-flinks button{background:none;border:none;color:#B4AE9C;font-size:11px;letter-spacing:.14em;text-transform:uppercase;}
        .pp-flinks button:hover{color:#fff;}
        .pp-fine{font-size:10.5px;color:#847E6E;letter-spacing:.06em;}

        .pp-divider{display:flex;align-items:center;gap:14px;justify-content:center;margin:0 auto;max-width:420px;}
        .pp-rule{height:1px;flex:1;background:var(--hair);}

        .pp-pass{background:var(--cream);border-radius:16px;border:1px solid var(--hair);max-width:340px;width:100%;padding:26px;text-align:center;}
        .pp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
        .pp-chip{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--hair);border-radius:16px;padding:5px 10px;font-size:12px;}
        .pp-chip button{background:none;border:none;color:#B4472F;font-size:13px;line-height:1;}

        @media(max-width:640px){ .pp-navlink.hideM{display:none;} .pp-fields{grid-template-columns:1fr;} .pp-ed-row{grid-template-columns:1fr;} }
        @media(min-width:641px){
          .pp-grid{grid-template-columns:repeat(3,1fr);}
          .pp-hero{grid-template-columns:1.05fr .95fr;}
          .pp-hero-copy{padding:66px 42px;}
          .pp-hero-art{min-height:340px;}
          .pp-modal-grid{grid-template-columns:1fr 1fr;}
          .pp-gallery{border-bottom:none;border-right:1px solid var(--hair);}
          .pp-co-grid{grid-template-columns:1.4fr 1fr;}
          .pp-contact-grid{grid-template-columns:1fr 1fr;align-items:center;}
          .pp-frow{flex-direction:row;justify-content:space-between;text-align:left;}
        }
        @media(min-width:960px){ .pp-grid{grid-template-columns:repeat(4,1fr);} }
      `}</style>

      {/* EDIT TOOLBAR */}
      {edit && !order && !checkout && (
        <div className="pp-editbar">
          <span className="lbl">Editing</span>
          <span className="msg">Tap any text to change it. Edits save to this shared preview and show to anyone who opens the link.</span>
          <button className="pp-tbtn" onClick={() => setShowSettings(true)}>Site settings</button>
          {saveState === "saved" ? <span className="pp-saved">Saved ✓</span> : saveState === "saving" ? <span className="pp-saved">Saving…</span> : <button className="pp-tbtn" onClick={() => doSave(configRef.current)}>Save changes</button>}
          <button className="pp-tbtn primary" onClick={exitEdit}>Done</button>
        </div>
      )}

      {order ? (
        <>
          <div className="pp-announce">Order received</div>
          <div className="pp-confirm">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Badge s={52} /></div>
            <p className="pp-eyebrow-c"><span className="pp-script">thank you</span></p>
            <h2 className="pp-h2">Your order is in, {order.ship.name.split(" ")[0]}</h2>
            <p className="pp-desc">Order <strong style={{ color: "var(--ink)" }}>{order.num}</strong>. A confirmation went to {order.ship.email}. Each piece is handmade to order and ships in about a week.</p>
            <div className="pp-block"><h4>Ship to</h4>{order.ship.name}<br />{order.ship.addr1}{order.ship.addr2 ? `, ${order.ship.addr2}` : ""}<br />{order.ship.city}, {order.ship.state} {order.ship.zip}<br />{order.ship.country}{order.ship.phone && <><br />{order.ship.phone}</>}{order.ship.notes && <><br /><span style={{ color: "var(--ink-soft)" }}>Note: {order.ship.notes}</span></>}</div>
            <div className="pp-block"><h4>Your pieces</h4>{order.lines.map((l) => (<div key={l.lineId} style={{ marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span>{l.name} × {l.qty}</span><span>{money(l.price * l.qty)}</span></div>{l.note && <div className="pp-lnote">Made to order: {l.note}</div>}</div>))}<div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "var(--ink-soft)" }}><span>Shipping</span><span>{order.shipCost === 0 ? "Free" : money(order.shipCost)}</span></div><div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, borderTop: "1px solid var(--hair)", paddingTop: 8 }}><strong style={{ color: "var(--ink)" }}>Total ({order.pay === "card" ? "Card / Stripe" : "Venmo"})</strong><strong style={{ color: "var(--ink)" }}>{money(order.total)}</strong></div></div>
            <p className="pp-note" style={{ marginBottom: 20 }}>Preview only. In the live shop this charge runs through Stripe and lands in Polly's dashboard with these ship-to details.</p>
            <button className="pp-btn" onClick={startOver}>Back to the shop</button>
          </div>
        </>
      ) : checkout ? (
        <>
          <div className="pp-announce">Secure checkout</div>
          <header className="pp-header"><div className="pp-wrap pp-headrow"><button className="pp-brand" onClick={() => setCheckout(false)}><Badge /><span className="pp-word">{config.brand}</span></button><button className="pp-navlink" onClick={() => setCheckout(false)}>← Back to cart</button></div></header>
          <div className="pp-checkout">
            <p className="pp-eyebrow-c"><span className="pp-script">almost yours</span></p>
            <h2 className="pp-h2">Where should we send it</h2>
            <div style={{ height: 28 }} />
            <div className="pp-co-grid">
              <div>
                <div className="pp-fields">
                  {field("name", "Full name", { required: true, span: true })}
                  {field("email", "Email", { required: true, type: "email" })}
                  {field("phone", "Phone", { type: "tel" })}
                  {field("addr1", "Address", { required: true, span: true, ph: "Street address" })}
                  {field("addr2", "Apt / suite", { span: true })}
                  {field("city", "City", { required: true })}
                  {field("state", "State", { required: true })}
                  {field("zip", "ZIP", { required: true })}
                  {field("country", "Country")}
                  <label className="pp-field" style={{ gridColumn: "1 / -1" }}><span className="pp-flabel">Order notes</span><textarea className="pp-textarea" value={ship.notes} onChange={(e) => setShip((s) => ({ ...s, notes: e.target.value }))} placeholder="Gift wrap, delivery notes, anything else…" /></label>
                </div>
                <p className="pp-flabel" style={{ margin: "26px 0 12px", color: "var(--sage-deep)" }}>Payment</p>
                <div className="pp-pay">
                  <div className={`pp-payopt ${pay === "card" ? "on" : ""}`} onClick={() => setPay("card")}><span className="pp-radio" /><div><div style={{ fontSize: 14 }}>Card</div><div className="pp-note">Visa, Mastercard, Amex. Processed by Stripe, deposits to the shop's bank account.</div></div></div>
                  <div className={`pp-payopt ${pay === "venmo" ? "on" : ""}`} onClick={() => setPay("venmo")}><span className="pp-radio" /><div><div style={{ fontSize: 14 }}>Venmo</div><div className="pp-note">Pay from your Venmo balance at checkout.</div></div></div>
                </div>
                <p className="pp-note" style={{ marginTop: 10 }}>Card fields aren't shown here because live payment happens on Stripe's secure page. This preview skips to confirmation.</p>
                {touched && !requiredOk && <p className="pp-hint">Add the required fields marked * to place the order.</p>}
              </div>
              <div className="pp-summary">
                <p className="pp-flabel" style={{ color: "var(--sage-deep)", marginBottom: 14 }}>Order summary</p>
                {cartLines.map((l) => (<div key={l.lineId} style={{ marginBottom: 8 }}><div className="pp-row" style={{ marginBottom: 2 }}><span>{l.name} × {l.qty}</span><span>{money(l.price * l.qty)}</span></div>{l.note && <div className="pp-lnote">{l.note}</div>}</div>))}
                <div className="pp-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                <div className="pp-row"><span>Shipping</span><span>{shipCost === 0 ? "Free" : money(shipCost)}</span></div>
                <div className="pp-row total"><span>Total</span><span>{money(total)}</span></div>
                <button className="pp-btn sage" style={{ width: "100%", marginTop: 16 }} onClick={placeOrder} disabled={cartLines.length === 0}>Place order · {money(total)}</button>
                <p className="pp-note" style={{ marginTop: 10, textAlign: "center" }}>Preview checkout, no card is charged.</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="pp-announce"><Field on={edit} as="span" value={config.announce} set={(v) => setConfig((c) => ({ ...c, announce: v }))} /></div>

          <header className="pp-header">
            <div className="pp-wrap pp-headrow">
              <button className="pp-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><Badge /><span className="pp-word">{config.brand}</span></button>
              <nav className="pp-nav">
                <button className="pp-navlink hideM" onClick={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}>Shop</button>
                <button className="pp-navlink hideM" onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>About</button>
                <button className="pp-navlink hideM" onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}>Contact</button>
                {/* No edit button on the public page. Owner opens edit mode via a discreet footer tap. */}
                <button className="pp-cartbtn" onClick={() => setCartOpen(true)}><span className="pp-navlink" style={{ letterSpacing: ".14em" }}>Cart</span>{count > 0 && <span className="pp-badge-count">{count}</span>}</button>
              </nav>
            </div>
          </header>

          <section className="pp-hero">
            <div className="pp-hero-copy">
              <span className="pp-hero-eye"><Field on={edit} value={config.hero.eyebrow} set={(v) => patchHero({ eyebrow: v })} /> <span className="pp-script">{edit ? <Field on={edit} value={config.hero.eyebrowScript} set={(v) => patchHero({ eyebrowScript: v })} /> : config.hero.eyebrowScript}</span></span>
              <h1 className="pp-h1"><Field on={edit} value={config.hero.title} set={(v) => patchHero({ title: v })} /><span className="pp-script"><Field on={edit} value={config.hero.titleScript} set={(v) => patchHero({ titleScript: v })} /></span></h1>
              <Field on={edit} as="p" area className="pp-lede" value={config.hero.lede} set={(v) => patchHero({ lede: v })} />
              <div>{edit ? <Field on={edit} value={config.hero.cta} set={(v) => patchHero({ cta: v })} /> : <button className="pp-btn" onClick={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}>{config.hero.cta}</button>}</div>
            </div>
            <div className={`pp-hero-art ${heroPhoto ? "haspic" : ""}`}>
              {heroPhoto ? <img src={heroPhoto} alt="" className="pp-photo" /> : <StrandArt category="Necklaces" colors={["#E4573B", "#E7789A", "#3E9DB0", "#E9C85A", "#8FB98F", "#EBA9BE"]} charm="heart" size={230} />}
              {edit ? (<label className="pp-btn sage" style={{ position: "absolute", zIndex: 2, cursor: "pointer" }}>Upload hero photo<input type="file" accept="image/*" hidden onChange={(e) => setHeroImage(e.target.files)} /></label>) : (!heroPhoto && <span className="pp-tag-note">Editorial photo goes here</span>)}
            </div>
          </section>

          <section id="shop" className="pp-section">
            <div className="pp-wrap">
              <p className="pp-eyebrow-c"><span className="pp-script">the collection</span></p>
              <h2 className="pp-h2">Shop by piece</h2>
              <div className="pp-filter">{cats.map((c) => (<button key={c} className={`pp-cat ${category === c ? "on" : ""}`} onClick={() => setCategory(c)}>{c}</button>))}</div>
              <div className="pp-grid">
                {shown.map((p, i) => (
                  <div key={p.id} className="pp-card">
                    {edit && <button className="pp-editflag" onClick={() => setEditingId(p.id)}>Edit</button>}
                    {edit && (<div className="pp-cardmove"><button onClick={() => moveProduct(p.id, -1)} title="Move up">↑</button><button onClick={() => moveProduct(p.id, 1)} title="Move down">↓</button></div>)}
                    <button className="pp-ph" onClick={() => openProduct(p)} style={{ padding: 0, border: "1px solid var(--hair)" }}>
                      {p.tag && <span className={`pp-tagpill ${p.tag === "New" ? "new" : ""}`}>{p.tag}</span>}
                      <ProductVisual p={p} size={88} />
                    </button>
                    <button onClick={() => openProduct(p)} style={{ background: "none", border: "none", padding: 0, textAlign: "left" }}>
                      <div className="pp-cardname">{p.name}</div>
                      <div className="pp-mat">{p.material}</div>
                      <div className="pp-cardmeta"><span className="pp-price">{money(p.price)}</span><span className="pp-view">{edit ? "Tap Edit" : "View"}</span></div>
                    </button>
                  </div>
                ))}
                {edit && (<button className="pp-addcard" onClick={addProduct}><span className="plus">+</span>Add a piece</button>)}
              </div>
            </div>
          </section>

          <div className="pp-wrap"><BeadDivider /></div>

          <section id="about" className="pp-section">
            <div className="pp-wrap" style={{ maxWidth: 620, textAlign: "center" }}>
              <p className="pp-eyebrow-c"><span className="pp-script">{edit ? <Field on={edit} value={config.about.eyebrowScript} set={(v) => patchAbout({ eyebrowScript: v })} /> : config.about.eyebrowScript}</span></p>
              <Field on={edit} as="h2" className="pp-h2" value={config.about.title} set={(v) => patchAbout({ title: v })} />
              <Field on={edit} as="p" area className="pp-desc" style={{ marginTop: 14 }} value={config.about.body} set={(v) => patchAbout({ body: v })} />
            </div>
          </section>

          <section id="contact" className="pp-contact">
            <div className="pp-wrap pp-contact-grid">
              <div>
                <p className="pp-eyebrow" style={{ color: "var(--sage-deep)" }}>Get in touch</p>
                <Field on={edit} as="h2" className="pp-h2" style={{ textAlign: "left", marginTop: 8 }} value={config.contact.heading} set={(v) => patchContact({ heading: v })} />
                {edit ? (
                  <div style={{ marginTop: 18 }}>
                    {[["instagram", "Instagram"], ["email", "Email"], ["maker", "Made by"], ["location", "Based in"], ["findus", "Find us"]].map(([k, lbl]) => (
                      <div className="pp-cline-edit" key={k}><span className="pp-ed-lbl">{lbl}</span><input className="pp-input" value={config.contact[k]} onChange={(e) => patchContact({ [k]: e.target.value })} /></div>
                    ))}
                  </div>
                ) : (
                  <div className="pp-clines" style={{ marginTop: 18 }}>
                    <strong>Instagram</strong> · {config.contact.instagram}<br />
                    <strong>Email</strong> · {config.contact.email}<br />
                    <strong>Made by</strong> · {config.contact.maker}<br />
                    <strong>Based in</strong> · {config.contact.location}<br />
                    <strong>Find us</strong> · {config.contact.findus}
                  </div>
                )}
              </div>
              <div><div className="pp-cform"><input className="pp-input" placeholder="Your name" /><input className="pp-input" placeholder="Email" /><textarea className="pp-textarea" placeholder="Custom colors, an initial, a question…" /><button className="pp-btn sage" style={{ justifySelf: "start" }}>Send message</button><p className="pp-note">Form is a preview. The live version delivers straight to the shop inbox.</p></div></div>
            </div>
          </section>

          <footer className="pp-footer">
            <div className="pp-wrap pp-frow">
              <span className="pp-fword" onClick={secretTap}>{config.brand}</span>
              <div className="pp-flinks"><button onClick={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}>Shop</button><button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>About</button><button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}>Contact</button></div>
              <span className="pp-fine">Handmade in {config.contact.location} · © {new Date().getFullYear()} {config.brand}</span>
            </div>
          </footer>
        </>
      )}

      {/* SHOPPING PRODUCT MODAL */}
      {active && !edit && (() => {
        const imgs = (active.images || []).map((k) => images[k]).filter(Boolean);
        const mainImg = imgs[gIdx] || imgs[0] || null;
        return (
          <div className="pp-scrim" onClick={() => setActiveId(null)}>
            <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
              <button className="pp-close" onClick={() => setActiveId(null)} aria-label="Close">×</button>
              <div className="pp-modal-grid">
                <div className="pp-gallery">
                  <div className="pp-gmain">{mainImg ? <img src={mainImg} alt={active.name} className="pp-photo" /> : <StrandArt category={active.category} colors={active.colors} charm={active.charm} size={200} />}</div>
                  {imgs.length > 1 && (<div className="pp-thumbs">{imgs.map((src, i) => (<button key={i} className={`pp-thumb ${gIdx === i ? "on" : ""}`} onClick={() => setGIdx(i)}><img src={src} alt="" /></button>))}</div>)}
                  {imgs.length === 0 && <p className="pp-note" style={{ textAlign: "center", marginTop: 10 }}>Illustrated preview. Real photos load once uploaded.</p>}
                </div>
                <div className="pp-detail">
                  <span className="pp-spec">{active.category}{active.tag ? ` · ${active.tag}` : ""}</span>
                  <div className="pp-cardname">{active.name}</div>
                  <div className="pp-price" style={{ fontSize: 16 }}>{money(active.price)}</div>
                  <p className="pp-desc">{active.desc}</p>
                  {active.material && <div><span className="pp-spec">Made with</span><div className="pp-mat" style={{ marginTop: 4, fontSize: 13 }}>{active.material}</div></div>}
                  <div className="pp-custom"><span className="pp-spec">Make it yours {active.custom ? "" : "(optional)"}</span><input className="pp-input" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder={active.custom ? "Color swaps, initials, team colors, sizing…" : "Any requests? Colors, length, initials…"} /></div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}><div className="pp-qty"><button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">–</button><span>{qty}</span><button onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button></div><button className="pp-btn" onClick={() => { addToCart(active, qty, noteInput); setActiveId(null); setCartOpen(true); }}>Add to cart · {money(active.price * qty)}</button></div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PRODUCT EDITOR (edit mode) */}
      {editing && edit && (
        <div className="pp-scrim" onClick={() => setEditingId(null)}>
          <div className="pp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="pp-close" onClick={() => setEditingId(null)} aria-label="Close">×</button>
            <div className="pp-ed-body">
              <span className="pp-spec">Edit piece</span>
              <div className="pp-ed-field"><span className="pp-ed-lbl">Photos</span>
                <div className="pp-thumbs">
                  {(editing.images || []).map((k) => images[k] ? (<div key={k} className="pp-thumb on"><img src={images[k]} alt="" /><button className="rm" onClick={() => removeImage(editing.id, k)}>×</button></div>) : null)}
                  <label className="pp-thumb" style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 22, color: "var(--sage-deep)" }}>+<input type="file" accept="image/*" multiple hidden onChange={(e) => addImages(editing.id, e.target.files)} /></label>
                </div>
                <p className="pp-note" style={{ marginTop: 6 }}>Upload as many as you like. First photo is the cover. No photo shows the beaded illustration.</p>
              </div>
              <div className="pp-ed-field"><span className="pp-ed-lbl">Name</span><input className="pp-input" value={editing.name} onChange={(e) => patchProduct(editing.id, { name: e.target.value })} /></div>
              <div className="pp-ed-row">
                <div className="pp-ed-field"><span className="pp-ed-lbl">Price ($)</span><input className="pp-input" type="number" min="0" value={editing.price} onChange={(e) => patchProduct(editing.id, { price: Number(e.target.value) })} /></div>
                <div className="pp-ed-field"><span className="pp-ed-lbl">Category</span><select className="pp-select" value={editing.category} onChange={(e) => patchProduct(editing.id, { category: e.target.value })}>{config.categories.map((c) => (<option key={c} value={c}>{c}</option>))}</select></div>
              </div>
              <div className="pp-ed-field"><span className="pp-ed-lbl">Made with</span><input className="pp-input" value={editing.material} onChange={(e) => patchProduct(editing.id, { material: e.target.value })} placeholder="e.g. Glass beads, gold-fill heart" /></div>
              <div className="pp-ed-field"><span className="pp-ed-lbl">Description</span><textarea className="pp-textarea" value={editing.desc} onChange={(e) => patchProduct(editing.id, { desc: e.target.value })} /></div>
              <div className="pp-ed-row">
                <div className="pp-ed-field"><span className="pp-ed-lbl">Badge</span><select className="pp-select" value={editing.tag || ""} onChange={(e) => patchProduct(editing.id, { tag: e.target.value || null })}><option value="">None</option><option value="New">New</option><option value="Bestseller">Bestseller</option><option value="Back in stock">Back in stock</option></select></div>
                <div className="pp-ed-field"><span className="pp-ed-lbl">Illustration charm</span><select className="pp-select" value={editing.charm || ""} onChange={(e) => patchProduct(editing.id, { charm: e.target.value || null })}><option value="heart">Heart</option><option value="star">Star</option><option value="coin">Coin</option><option value="">None</option></select></div>
              </div>
              <label className="pp-check"><input type="checkbox" checked={!!editing.custom} onChange={(e) => patchProduct(editing.id, { custom: e.target.checked })} />Show "make it yours" customization by default</label>
              <div className="pp-ed-foot">
                <button className="pp-btn danger" onClick={() => deleteProduct(editing.id)}>Delete piece</button>
                <button className="pp-btn sage" onClick={() => { doSave(configRef.current); setEditingId(null); }}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SITE SETTINGS */}
      {showSettings && edit && (
        <div className="pp-scrim" onClick={() => setShowSettings(false)}>
          <div className="pp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <button className="pp-close" onClick={() => setShowSettings(false)} aria-label="Close">×</button>
            <div className="pp-ed-body">
              <span className="pp-spec">Site settings</span>
              <div className="pp-ed-field"><span className="pp-ed-lbl">Shop name</span><input className="pp-input" value={config.brand} onChange={(e) => setConfig((c) => ({ ...c, brand: e.target.value }))} /></div>
              <div className="pp-ed-row">
                <div className="pp-ed-field"><span className="pp-ed-lbl">Free shipping over ($)</span><input className="pp-input" type="number" min="0" value={config.freeShipOver} onChange={(e) => setConfig((c) => ({ ...c, freeShipOver: Number(e.target.value) }))} /></div>
                <div className="pp-ed-field"><span className="pp-ed-lbl">Flat shipping ($)</span><input className="pp-input" type="number" min="0" value={config.flatShip} onChange={(e) => setConfig((c) => ({ ...c, flatShip: Number(e.target.value) }))} /></div>
              </div>
              <div className="pp-ed-field">
                <span className="pp-ed-lbl">Categories</span>
                <div className="pp-chips">{config.categories.map((c) => (<span key={c} className="pp-chip">{c}<button onClick={() => removeCategory(c)} title="Remove">×</button></span>))}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}><input className="pp-input" placeholder="Add a category" onKeyDown={(e) => { if (e.key === "Enter") { addCategory(e.target.value); e.target.value = ""; } }} /><button className="pp-btn ghost" style={{ padding: "10px 16px" }} onClick={(e) => { const inp = e.currentTarget.previousSibling; addCategory(inp.value); inp.value = ""; }}>Add</button></div>
              </div>
              <div className="pp-ed-foot">
                <button className="pp-btn danger" onClick={() => { if (window.confirm ? window.confirm("Reset all content to the starting sample?") : true) resetContent(); }}>Reset to sample</button>
                <button className="pp-btn sage" onClick={() => { doSave(configRef.current); setShowSettings(false); }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PASSCODE */}
      {showPass && (
        <div className="pp-scrim" onClick={() => setShowPass(false)}>
          <div className="pp-pass" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Badge s={44} /></div>
            <div className="pp-spec" style={{ marginBottom: 10 }}>Owner sign-in</div>
            <input className="pp-input" type="password" placeholder="Passcode" value={passInput} autoFocus onChange={(e) => { setPassInput(e.target.value); setPassErr(false); }} onKeyDown={(e) => { if (e.key === "Enter") tryPass(); }} />
            {passErr && <p className="pp-hint">That passcode didn't match.</p>}
            <button className="pp-btn sage" style={{ width: "100%", marginTop: 12 }} onClick={tryPass}>Enter edit mode</button>
            <p className="pp-note" style={{ marginTop: 10 }}>Preview passcode for the owner. Real secure login comes with the backend.</p>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="pp-overlay" onClick={() => setCartOpen(false)}>
          <aside className="pp-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="pp-dhead"><span className="pp-dtitle">Your cart{count > 0 ? ` (${count})` : ""}</span><button className="pp-close" style={{ position: "static" }} onClick={() => setCartOpen(false)} aria-label="Close">×</button></div>
            <div className="pp-dbody">
              {cartLines.length === 0 ? (<div className="pp-empty">Your cart is empty.<br />Add a piece to get started.</div>) : (
                cartLines.map((l) => (
                  <div key={l.lineId} className="pp-line">
                    <div className="pp-ph"><ProductVisual p={l} size={42} /></div>
                    <div><div className="pp-lname">{l.name}</div>{l.note && <div className="pp-lnote">{l.note}</div>}<div className="pp-mini"><button onClick={() => setLineQty(l.lineId, l.qty - 1)} aria-label="Decrease">–</button><span>{l.qty}</span><button onClick={() => setLineQty(l.lineId, l.qty + 1)} aria-label="Increase">+</button></div></div>
                    <div style={{ textAlign: "right" }}><div className="pp-price">{money(l.price * l.qty)}</div><button className="pp-remove" onClick={() => setLineQty(l.lineId, 0)}>Remove</button></div>
                  </div>
                ))
              )}
            </div>
            {cartLines.length > 0 && (<div className="pp-dfoot"><div className="pp-row"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="pp-row"><span>Shipping</span><span>{shipCost === 0 ? "Free" : money(shipCost)}</span></div>{subtotal < config.freeShipOver && subtotal > 0 && <p className="pp-note" style={{ marginBottom: 8 }}>Add {money(config.freeShipOver - subtotal)} more for free shipping.</p>}<div className="pp-row total"><span>Total</span><span>{money(total)}</span></div><button className="pp-btn" style={{ width: "100%", marginTop: 12 }} onClick={() => { setCartOpen(false); setCheckout(true); window.scrollTo({ top: 0 }); }}>Checkout</button></div>)}
          </aside>
        </div>
      )}
    </div>
  );
}
