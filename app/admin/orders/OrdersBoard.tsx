"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  FULFILLMENT_STATUSES,
  isManuallyPaid,
  type FulfillmentStatus,
  type Order,
} from "@/lib/types";
import { money } from "@/lib/format";
import { setOrderStatus, setPaymentStatus } from "../actions";

const FILTERS = ["All", "New", "Making", "Shipped"] as const;
type Filter = (typeof FILTERS)[number];

const METHODS = [
  { key: "all", label: "All payments" },
  { key: "card", label: "Card" },
  { key: "venmo", label: "Venmo" },
] as const;
type MethodKey = (typeof METHODS)[number]["key"];

const STATUS_LABELS: Record<FulfillmentStatus, string> = {
  new: "New",
  making: "Making",
  shipped: "Shipped",
};

export function OrdersBoard({
  orders,
  stats,
  venmoHandle,
}: {
  orders: Order[];
  stats: {
    newCount: number;
    makingCount: number;
    shippedCount: number;
    paidThisWeekCents: number;
    awaitingPaymentCount: number;
  };
  venmoHandle: string;
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const [method, setMethod] = useState<MethodKey>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const shown = useMemo(() => {
    let list = orders;
    if (method !== "all") list = list.filter((o) => o.payment_method === method);
    if (filter !== "All")
      list = list.filter((o) => o.fulfillment_status === filter.toLowerCase());
    return list;
  }, [orders, filter, method]);

  // Venmo money only lands when Polly confirms it, so surface how much is
  // still outstanding while she's looking at the Venmo view.
  const venmoOwed = useMemo(
    () =>
      orders
        .filter((o) => o.payment_method === "venmo" && o.payment_status === "pending")
        .reduce((sum, o) => sum + o.total_cents, 0),
    [orders]
  );

  const copyAddress = async (o: Order) => {
    const text = [
      o.customer_name,
      o.address2 ? `${o.address1}, ${o.address2}` : o.address1,
      `${o.city}, ${o.state} ${o.zip}`,
      o.country,
      o.customer_phone,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(o.id);
      setTimeout(() => setCopied((c) => (c === o.id ? null : c)), 1400);
    } catch {
      setError("Couldn't copy — your browser blocked it. Select the address and copy manually.");
    }
  };

  const changeStatus = (o: Order, status: FulfillmentStatus) => {
    if (o.fulfillment_status === status) return;
    setError(null);
    setBusyId(o.id);
    start(async () => {
      const res = await setOrderStatus(o.id, status);
      if (!res.ok) setError(res.error);
      setBusyId(null);
    });
  };

  const changePayment = (o: Order, paid: boolean) => {
    setError(null);
    setBusyId(o.id);
    start(async () => {
      const res = await setPaymentStatus(o.id, paid ? "paid" : "pending");
      if (!res.ok) setError(res.error);
      setBusyId(null);
    });
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="ad-h2">Orders</h1>
          <p className="ad-lead" style={{ marginBottom: 8 }}>
            Newest first. Tap a status to move an order along as you make it.
          </p>
        </div>
        <Link href="/admin/orders/new" className="pp-btn sage" style={{ textDecoration: "none", padding: "11px 18px" }}>
          + Add an order
        </Link>
      </div>

      <div className="oa-stats">
        <div className="oa-stat hl">
          <div className="num">{stats.newCount}</div>
          <div className="lbl">New to start</div>
        </div>
        <div className="oa-stat">
          <div className="num">{stats.makingCount}</div>
          <div className="lbl">Making</div>
        </div>
        <div className="oa-stat">
          <div className="num">{stats.shippedCount}</div>
          <div className="lbl">Shipped</div>
        </div>
        <div className="oa-stat">
          <div className="num">{money(stats.paidThisWeekCents)}</div>
          <div className="lbl">Paid this week</div>
        </div>
        {stats.awaitingPaymentCount > 0 && (
          <div className="oa-stat warn">
            <div className="num">{stats.awaitingPaymentCount}</div>
            <div className="lbl">Awaiting payment</div>
          </div>
        )}
      </div>

      {/* Payment method comes first: card and Venmo are different jobs.
          Card is automatic; Venmo needs her to confirm the money arrived. */}
      <div className="oa-filters" style={{ marginBottom: 0 }}>
        {METHODS.map((m) => (
          <button
            key={m.key}
            className={`oa-filter ${method === m.key ? "on" : ""}`}
            onClick={() => setMethod(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="oa-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`oa-filter ${filter === f ? "on" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {method === "venmo" && (
        <div className="oa-venmobar">
          <strong>Venmo orders.</strong> These aren&apos;t confirmed automatically — check
          {venmoHandle ? (
            <> your Venmo account (<b>{venmoHandle}</b>)</>
          ) : (
            <> your Venmo account</>
          )}{" "}
          and press <em>Mark paid</em> once the money is in.
          {venmoOwed > 0 && (
            <div style={{ marginTop: 6 }}>
              Still waiting on <b>{money(venmoOwed)}</b>.
            </div>
          )}
          {!venmoHandle && (
            <div style={{ marginTop: 6 }}>
              Add your Venmo handle under <b>Site content → Shipping &amp; payment</b>.
            </div>
          )}
        </div>
      )}

      {error && <p className="pp-hint">{error}</p>}

      {shown.length === 0 ? (
        <div className="ad-card">
          <div className="ad-empty">
            {orders.length === 0 ? (
              <>
                No orders yet.
                <br />
                They&apos;ll appear here automatically as soon as someone checks out.
              </>
            ) : method === "venmo" ? (
              <>No Venmo orders{filter !== "All" ? ` in ${filter.toLowerCase()}` : ""} right now.</>
            ) : method === "card" ? (
              <>No card orders{filter !== "All" ? ` in ${filter.toLowerCase()}` : ""} right now.</>
            ) : (
              <>Nothing in {filter.toLowerCase()} right now.</>
            )}
          </div>
        </div>
      ) : (
        shown.map((o) => (
          <div key={o.id} className={`oa-card ${o.fulfillment_status === "new" ? "new" : ""}`}>
            <div className="oa-chead">
              <div>
                <div className="oa-onum">
                  {o.order_number} · {o.dateLabel}
                </div>
                <div className="oa-name">{o.customer_name}</div>
                {/* Every one is tappable: on her phone these become a call,
                    an email, or a DM without retyping anything. */}
                <div className="oa-contact">
                  <a href={`mailto:${o.customer_email}`}>{o.customer_email}</a>
                  {o.customer_phone && (
                    <>
                      {" · "}
                      <a href={`tel:${o.customer_phone.replace(/[^\d+]/g, "")}`}>
                        {o.customer_phone}
                      </a>
                    </>
                  )}
                  {o.customer_instagram && (
                    <>
                      {" · "}
                      <a
                        href={`https://instagram.com/${o.customer_instagram}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        @{o.customer_instagram}
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span className={`oa-pay ${o.payment_status}`}>
                  {o.payment_status === "paid"
                    ? "Paid ✓"
                    : o.payment_status === "refunded"
                      ? "Refunded"
                      : "Unpaid"}
                </span>
                <span className="oa-method">
                  {o.payment_method === "venmo" ? "Venmo" : "Card"}
                </span>
              </div>
            </div>

            <div className="oa-sec">Pieces</div>
            {o.items.map((it) => (
              <div key={it.id}>
                <div className="oa-item">
                  <span className="name">
                    {it.product_name} <span className="q">× {it.quantity}</span>
                  </span>
                  <span>{money(it.line_total_cents)}</span>
                </div>
                {it.customization && (
                  <div className="oa-note">make it yours: {it.customization}</div>
                )}
              </div>
            ))}

            <div className="oa-total">
              <span className="oa-ship-note">
                {o.shipping_cents === 0
                  ? "Free shipping"
                  : `Includes ${money(o.shipping_cents)} shipping`}
              </span>
              <b>Total {money(o.total_cents)}</b>
            </div>

            {o.notes && <div className="oa-custnote">Note from customer: {o.notes}</div>}

            <div className="oa-ship">
              <div className="oa-sec" style={{ margin: "0 0 6px" }}>
                Ship to
              </div>
              <div className="oa-addr">
                {o.customer_name}
                <br />
                {o.address1}
                {o.address2 ? `, ${o.address2}` : ""}
                <br />
                {o.city}, {o.state} {o.zip}
                {o.customer_phone && (
                  <>
                    <br />
                    {o.customer_phone}
                  </>
                )}
              </div>
              <button
                className={`oa-copy ${copied === o.id ? "done" : ""}`}
                onClick={() => copyAddress(o)}
              >
                {copied === o.id ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Manual payment control, only for methods settled off-site.
                Card orders are Stripe's to decide, so no button is offered
                (and the server refuses one even if it were). */}
            {isManuallyPaid(o.payment_method) && o.payment_status !== "refunded" && (
              <div className="oa-statusrow">
                <span className="oa-statuslbl">Payment</span>
                {o.payment_status === "paid" ? (
                  <>
                    <span className="oa-paidnote">Marked paid</span>
                    <button
                      className="oa-undo"
                      disabled={busyId === o.id}
                      onClick={() => changePayment(o, false)}
                    >
                      Undo
                    </button>
                  </>
                ) : (
                  <button
                    className="oa-markpaid"
                    disabled={busyId === o.id}
                    onClick={() => changePayment(o, true)}
                  >
                    {busyId === o.id ? "Saving…" : `Mark paid · ${money(o.total_cents)}`}
                  </button>
                )}
              </div>
            )}

            <div className="oa-statusrow">
              <span className="oa-statuslbl">Status</span>
              <div className="oa-seg">
                {FULFILLMENT_STATUSES.map((s) => (
                  <button
                    key={s}
                    className={o.fulfillment_status === s ? "on" : ""}
                    disabled={busyId === o.id}
                    onClick={() => changeStatus(o, s)}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}
