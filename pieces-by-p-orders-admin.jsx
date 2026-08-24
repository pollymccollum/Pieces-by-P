import React, { useState, useMemo } from "react";

// ─────────────────────────────────────────────────────────────
// PIECES BY P — Orders admin (layout mockup)
// This is the page Polly sees after logging in. Sample data shown.
// At a glance per order: who, what pieces (with their custom notes),
// total, paid or not, and the ship-to address ready to copy.
// ─────────────────────────────────────────────────────────────

const SAMPLE = [
  { id: "PBP-8K2QX", date: "Aug 6, 2:14 PM", name: "Emma Carter", email: "emma.carter@email.com", phone: "(864) 555-0110", addr1: "123 Maple St", addr2: "Apt 2", city: "Greenville", state: "SC", zip: "29601", pay: "paid", status: "new", ship: 0, items: [{ n: "Sweetheart Strand", q: 1, p: 42, note: "red + pink, initial E" }, { n: "Coastal Stack (set of 5)", q: 1, p: 38, note: "" }] },
  { id: "PBP-7M4RL", date: "Aug 6, 11:02 AM", name: "Ava Thompson", email: "ava.t@email.com", phone: "(864) 555-0148", addr1: "88 Whitner St", addr2: "", city: "Anderson", state: "SC", zip: "29621", pay: "paid", status: "making", ship: 0, items: [{ n: "Game Day Choker", q: 2, p: 28, note: "orange + purple, Clemson colors" }] },
  { id: "PBP-6H9ZC", date: "Aug 5, 6:48 PM", name: "Sofia Nguyen", email: "sofian@email.com", phone: "(843) 555-0192", addr1: "410 King St", addr2: "Unit 5", city: "Charleston", state: "SC", zip: "29403", pay: "pending", status: "new", ship: 5, items: [{ n: "Puffy Heart Necklace", q: 1, p: 34, note: "" }] },
  { id: "PBP-6C1TD", date: "Aug 5, 1:20 PM", name: "Mia Rodriguez", email: "mia.r@email.com", phone: "(864) 555-0175", addr1: "27 Cleveland Ave", addr2: "", city: "Greenville", state: "SC", zip: "29607", pay: "paid", status: "shipped", ship: 0, items: [{ n: "Initial Heart Charm", q: 3, p: 24, note: "initials M, K, and L (set of gifts)" }] },
  { id: "PBP-5X8PU", date: "Aug 4, 9:15 AM", name: "Charlotte Bell", email: "cbell@email.com", phone: "(803) 555-0133", addr1: "915 Gervais St", addr2: "", city: "Columbia", state: "SC", zip: "29201", pay: "paid", status: "making", ship: 0, items: [{ n: "Blush Beaded Necklace", q: 1, p: 40, note: "" }, { n: "Sunny Day Stack (set of 3)", q: 1, p: 30, note: "" }] },
];

const FILTERS = ["All", "New", "Making", "Shipped"];
const STATUSES = ["new", "making", "shipped"];
const money = (n) => `$${n.toFixed(0)}`;

function Badge({ s = 34 }) {
  return <span className="oa-badge" style={{ width: s, height: s }} aria-hidden="true"><span className="oa-badge-p">P</span></span>;
}

export default function App() {
  const [orders, setOrders] = useState(SAMPLE);
  const [filter, setFilter] = useState("All");
  const [copied, setCopied] = useState(null);

  const setStatus = (id, status) => setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x)));
  const orderTotal = (o) => o.items.reduce((s, i) => s + i.p * i.q, 0) + o.ship;

  const copyAddress = (o) => {
    const txt = `${o.name}\n${o.addr1}${o.addr2 ? ", " + o.addr2 : ""}\n${o.city}, ${o.state} ${o.zip}\n${o.phone}`;
    try { navigator.clipboard?.writeText(txt); } catch (e) {}
    setCopied(o.id); setTimeout(() => setCopied((c) => (c === o.id ? null : c)), 1400);
  };

  const shown = useMemo(() => (filter === "All" ? orders : orders.filter((o) => o.status === filter.toLowerCase())), [orders, filter]);
  const counts = useMemo(() => ({
    new: orders.filter((o) => o.status === "new").length,
    making: orders.filter((o) => o.status === "making").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    sales: orders.filter((o) => o.pay === "paid").reduce((s, o) => s + orderTotal(o), 0),
  }), [orders]);

  return (
    <div className="oa-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Dancing+Script:wght@700&family=Poppins:wght@300;400;500&display=swap');
        :root{--cream:#FAF6EC;--surface:#FFFDF7;--ink:#2B2A24;--ink-soft:#6E6A5C;--sage:#A8BF83;--sage-deep:#6E7F49;--sage-soft:#DEE7C8;--gold:#C79A3E;--amber:#C98A2E;--amber-soft:#F4E4C6;--hair:#E7E0CD;--serif:'Fraunces',Georgia,serif;--script:'Dancing Script',cursive;--sans:'Poppins',system-ui,sans-serif;}
        *{box-sizing:border-box;}
        .oa-root{background:var(--cream);color:var(--ink);font-family:var(--sans);font-weight:300;-webkit-font-smoothing:antialiased;min-height:100vh;padding-bottom:40px;}
        .oa-root button{font-family:inherit;cursor:pointer;}
        .oa-wrap{max-width:820px;margin:0 auto;padding:0 18px;}

        .oa-top{background:rgba(250,246,236,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--hair);position:sticky;top:0;z-index:20;}
        .oa-toprow{display:flex;align-items:center;gap:11px;height:62px;}
        .oa-badge{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--surface);border:1.5px solid var(--sage);flex:none;}
        .oa-badge-p{font-family:var(--script);font-weight:700;color:var(--sage-deep);font-size:19px;line-height:1;margin-top:-1px;}
        .oa-title{font-family:var(--serif);font-size:21px;letter-spacing:.02em;}
        .oa-sub{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--sage-deep);}

        .oa-stats{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0 6px;}
        .oa-stat{background:var(--surface);border:1px solid var(--hair);border-radius:12px;padding:12px 16px;flex:1;min-width:120px;}
        .oa-stat .num{font-family:var(--serif);font-size:26px;line-height:1;}
        .oa-stat .lbl{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-soft);margin-top:5px;}
        .oa-stat.hl{background:var(--sage-soft);border-color:var(--sage);}
        .oa-stat.hl .num{color:var(--sage-deep);}

        .oa-filters{display:flex;gap:6px;margin:18px 0 14px;overflow-x:auto;padding-bottom:2px;}
        .oa-filter{background:none;border:1px solid var(--hair);border-radius:20px;padding:8px 15px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);white-space:nowrap;}
        .oa-filter.on{background:var(--ink);border-color:var(--ink);color:var(--cream);}

        .oa-card{background:var(--surface);border:1px solid var(--hair);border-radius:16px;padding:18px;margin-bottom:14px;}
        .oa-card.new{border-left:4px solid var(--sage);}
        .oa-chead{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}
        .oa-onum{font-size:11px;letter-spacing:.08em;color:var(--ink-soft);}
        .oa-name{font-family:var(--serif);font-size:22px;line-height:1.1;margin-top:2px;}
        .oa-pay{font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:5px 11px;border-radius:20px;white-space:nowrap;}
        .oa-pay.paid{background:var(--sage-soft);color:var(--sage-deep);}
        .oa-pay.pending{background:var(--amber-soft);color:var(--amber);}

        .oa-sec{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--sage-deep);margin:16px 0 8px;}
        .oa-item{display:flex;justify-content:space-between;gap:12px;font-size:14px;padding:3px 0;}
        .oa-item .q{color:var(--ink-soft);}
        .oa-note{font-size:12.5px;color:var(--sage-deep);font-style:italic;margin:1px 0 6px;padding-left:2px;}
        .oa-total{display:flex;justify-content:space-between;border-top:1px solid var(--hair);margin-top:8px;padding-top:8px;font-size:15px;}
        .oa-total b{font-weight:500;}
        .oa-ship-note{font-size:11px;color:var(--ink-soft);}

        .oa-ship{background:var(--cream);border:1px solid var(--hair);border-radius:12px;padding:13px 15px;margin-top:12px;position:relative;}
        .oa-addr{font-size:14px;line-height:1.65;}
        .oa-copy{position:absolute;top:11px;right:11px;background:none;border:1px solid var(--sage);color:var(--sage-deep);border-radius:16px;padding:5px 11px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;}
        .oa-copy:hover{background:var(--sage-soft);}
        .oa-copy.done{background:var(--sage-deep);border-color:var(--sage-deep);color:#fff;}

        .oa-statusrow{display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap;}
        .oa-statuslbl{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft);}
        .oa-seg{display:inline-flex;border:1px solid var(--hair);border-radius:22px;overflow:hidden;}
        .oa-seg button{background:none;border:none;padding:8px 16px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft);border-right:1px solid var(--hair);}
        .oa-seg button:last-child{border-right:none;}
        .oa-seg button.on{background:var(--sage-deep);color:#fff;}

        .oa-foot{text-align:center;font-size:11px;color:var(--ink-soft);margin-top:20px;line-height:1.6;}

        @media(min-width:620px){ .oa-item .name{max-width:none;} }
      `}</style>

      <div className="oa-top">
        <div className="oa-wrap oa-toprow">
          <Badge />
          <div><div className="oa-title">Orders</div><div className="oa-sub">Pieces by P</div></div>
        </div>
      </div>

      <div className="oa-wrap">
        <div className="oa-stats">
          <div className="oa-stat hl"><div className="num">{counts.new}</div><div className="lbl">New to start</div></div>
          <div className="oa-stat"><div className="num">{counts.making}</div><div className="lbl">Making</div></div>
          <div className="oa-stat"><div className="num">{counts.shipped}</div><div className="lbl">Shipped</div></div>
          <div className="oa-stat"><div className="num">{money(counts.sales)}</div><div className="lbl">Paid this week</div></div>
        </div>

        <div className="oa-filters">
          {FILTERS.map((f) => (<button key={f} className={`oa-filter ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f}</button>))}
        </div>

        {shown.map((o) => (
          <div key={o.id} className={`oa-card ${o.status === "new" ? "new" : ""}`}>
            <div className="oa-chead">
              <div>
                <div className="oa-onum">{o.id} · {o.date}</div>
                <div className="oa-name">{o.name}</div>
              </div>
              <span className={`oa-pay ${o.pay}`}>{o.pay === "paid" ? "Paid ✓" : "Unpaid"}</span>
            </div>

            <div className="oa-sec">Pieces</div>
            {o.items.map((it, i) => (
              <div key={i}>
                <div className="oa-item"><span className="name">{it.n} <span className="q">× {it.q}</span></span><span>{money(it.p * it.q)}</span></div>
                {it.note && <div className="oa-note">make it yours: {it.note}</div>}
              </div>
            ))}
            <div className="oa-total"><span className="oa-ship-note">{o.ship === 0 ? "Free shipping" : `Includes ${money(o.ship)} shipping`}</span><b>Total {money(orderTotal(o))}</b></div>

            <div className="oa-ship">
              <div className="oa-sec" style={{ margin: "0 0 6px" }}>Ship to</div>
              <div className="oa-addr">{o.name}<br />{o.addr1}{o.addr2 ? `, ${o.addr2}` : ""}<br />{o.city}, {o.state} {o.zip}<br />{o.phone}</div>
              <button className={`oa-copy ${copied === o.id ? "done" : ""}`} onClick={() => copyAddress(o)}>{copied === o.id ? "Copied" : "Copy"}</button>
            </div>

            <div className="oa-statusrow">
              <span className="oa-statuslbl">Status</span>
              <div className="oa-seg">
                {STATUSES.map((s) => (<button key={s} className={o.status === s ? "on" : ""} onClick={() => setStatus(o.id, s)}>{s === "new" ? "New" : s === "making" ? "Making" : "Shipped"}</button>))}
              </div>
            </div>
          </div>
        ))}

        <div className="oa-foot">Sample orders shown. This is the layout for Polly's live orders page,<br />where real orders land automatically after checkout.</div>
      </div>
    </div>
  );
}
