import { money } from "@/lib/format";
import type { Mail } from "./client";

// Email clients strip <style> blocks and ignore most modern CSS, so
// everything here is inline and deliberately plain. Every message also
// carries a plain-text version — it's what spam filters look for, and what
// some watches and screen readers actually show.

const CREAM = "#FAF6EC";
const SURFACE = "#FFFDF7";
const INK = "#2B2A24";
const INK_SOFT = "#6E6A5C";
const SAGE_DEEP = "#6E7F49";
const HAIR = "#E7E0CD";

export type OrderEmailData = {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  items: { name: string; qty: number; lineTotalCents: number; note: string | null }[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  address: string[]; // pre-formatted lines
  paymentMethod: "card" | "venmo";
  venmoHandle: string;
  brand: string;
};

function shell(brand: string, heading: string, body: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${CREAM};">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px;font-family:Helvetica,Arial,sans-serif;color:${INK};">
    <div style="text-align:center;padding-bottom:18px;">
      <div style="font-size:20px;letter-spacing:0.18em;text-transform:uppercase;color:${INK};">${esc(brand)}</div>
    </div>
    <div style="background:${SURFACE};border:1px solid ${HAIR};border-radius:14px;padding:26px 24px;">
      <h1 style="margin:0 0 14px;font-size:21px;font-weight:normal;color:${INK};">${esc(heading)}</h1>
      ${body}
    </div>
    <p style="text-align:center;font-size:11px;color:${INK_SOFT};margin-top:18px;line-height:1.6;">
      ${esc(brand)} — handmade to order in Anderson, South Carolina
    </p>
  </div>
</body></html>`;
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemsHtml(d: OrderEmailData): string {
  const rows = d.items
    .map(
      (i) => `
      <tr>
        <td style="padding:6px 0;font-size:14px;color:${INK};">
          ${esc(i.name)} <span style="color:${INK_SOFT};">× ${i.qty}</span>
          ${i.note ? `<div style="font-size:12px;color:${SAGE_DEEP};font-style:italic;padding-top:2px;">make it yours: ${esc(i.note)}</div>` : ""}
        </td>
        <td style="padding:6px 0;font-size:14px;text-align:right;white-space:nowrap;color:${INK};">${money(i.lineTotalCents)}</td>
      </tr>`
    )
    .join("");

  return `
    <table role="presentation" width="100%" style="border-collapse:collapse;margin:8px 0 0;">
      ${rows}
      <tr><td colspan="2" style="border-top:1px solid ${HAIR};padding-top:8px;"></td></tr>
      <tr>
        <td style="font-size:13px;color:${INK_SOFT};padding:2px 0;">Subtotal</td>
        <td style="font-size:13px;text-align:right;color:${INK_SOFT};">${money(d.subtotalCents)}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:${INK_SOFT};padding:2px 0;">Shipping</td>
        <td style="font-size:13px;text-align:right;color:${INK_SOFT};">${d.shippingCents === 0 ? "Free" : money(d.shippingCents)}</td>
      </tr>
      <tr>
        <td style="font-size:15px;padding-top:6px;color:${INK};">Total</td>
        <td style="font-size:15px;text-align:right;padding-top:6px;color:${INK};">${money(d.totalCents)}</td>
      </tr>
    </table>`;
}

function itemsText(d: OrderEmailData): string {
  const lines = d.items.map(
    (i) =>
      `  ${i.name} x${i.qty}  ${money(i.lineTotalCents)}` +
      (i.note ? `\n    make it yours: ${i.note}` : "")
  );
  return [
    ...lines,
    `  Subtotal: ${money(d.subtotalCents)}`,
    `  Shipping: ${d.shippingCents === 0 ? "Free" : money(d.shippingCents)}`,
    `  Total: ${money(d.totalCents)}`,
  ].join("\n");
}

// ── 1. Order confirmation (to the customer) ─────────────────
export function orderConfirmation(d: OrderEmailData): Mail {
  const firstName = d.customerName.split(" ")[0] || "there";

  // The whole point of this email for a Venmo order: they still have to pay.
  const venmoBlock =
    d.paymentMethod === "venmo"
      ? `
      <div style="background:#F4E4C6;border:1px solid #E0C68F;border-radius:10px;padding:16px;margin:18px 0;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#A8701E;padding-bottom:8px;">One last step</div>
        <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#6B4A12;">
          Your pieces are reserved. Send <strong>${money(d.totalCents)}</strong> on Venmo${
            d.venmoHandle ? ` to <strong>${esc(d.venmoHandle)}</strong>` : ""
          }, and put your order number in the note so we can match it up.
        </p>
        <div style="background:${SURFACE};border:1px dashed #D8B877;border-radius:8px;padding:10px 14px;font-size:17px;letter-spacing:0.08em;text-align:center;color:${INK};">
          ${esc(d.orderNumber)}
        </div>
        <p style="margin:10px 0 0;font-size:12px;color:#8A6A2E;">
          We start making your order as soon as the payment comes through.
        </p>
      </div>`
      : "";

  const html = shell(
    d.brand,
    `Thank you, ${firstName}!`,
    `
    <p style="margin:0 0 6px;font-size:14px;line-height:1.65;color:${INK_SOFT};">
      Your order <strong style="color:${INK};">${esc(d.orderNumber)}</strong> is in.
      Each piece is handmade to order and ships in about a week.
    </p>
    ${venmoBlock}
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${SAGE_DEEP};padding:16px 0 0;">Your pieces</div>
    ${itemsHtml(d)}
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${SAGE_DEEP};padding:20px 0 6px;">Shipping to</div>
    <p style="margin:0;font-size:14px;line-height:1.65;color:${INK};">${d.address.map(esc).join("<br />")}</p>
  `
  );

  const text = [
    `Thank you, ${firstName}!`,
    ``,
    `Your order ${d.orderNumber} is in. Each piece is handmade to order and ships in about a week.`,
    ...(d.paymentMethod === "venmo"
      ? [
          ``,
          `ONE LAST STEP`,
          `Send ${money(d.totalCents)} on Venmo${d.venmoHandle ? ` to ${d.venmoHandle}` : ""},`,
          `and put ${d.orderNumber} in the note so we can match it up.`,
        ]
      : []),
    ``,
    `YOUR PIECES`,
    itemsText(d),
    ``,
    `SHIPPING TO`,
    ...d.address.map((l) => `  ${l}`),
  ].join("\n");

  return {
    to: d.customerEmail ?? "",
    subject: `Your ${d.brand} order ${d.orderNumber}`,
    html,
    text,
  };
}

// ── 2. New order alert (to Polly) ───────────────────────────
export function ownerNewOrder(d: OrderEmailData, adminUrl: string): Mail {
  const method = d.paymentMethod === "venmo" ? "Venmo — not paid yet" : "Card";

  const html = shell(
    d.brand,
    `New order from ${d.customerName}`,
    `
    <p style="margin:0 0 4px;font-size:14px;color:${INK_SOFT};">
      ${esc(d.orderNumber)} · ${esc(method)}
    </p>
    ${itemsHtml(d)}
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${SAGE_DEEP};padding:20px 0 6px;">Ship to</div>
    <p style="margin:0 0 6px;font-size:14px;line-height:1.65;color:${INK};">${d.address.map(esc).join("<br />")}</p>
    ${
      d.customerEmail
        ? `<p style="margin:0;font-size:13px;color:${INK_SOFT};">${esc(d.customerEmail)}</p>`
        : `<p style="margin:0;font-size:13px;color:#B4472F;">No email address — reach out by phone or Instagram.</p>`
    }
    <p style="margin:22px 0 0;">
      <a href="${esc(adminUrl)}" style="display:inline-block;background:${SAGE_DEEP};color:#ffffff;text-decoration:none;border-radius:22px;padding:11px 22px;font-size:13px;">Open your orders</a>
    </p>
  `
  );

  const text = [
    `New order from ${d.customerName}`,
    `${d.orderNumber} · ${method}`,
    ``,
    itemsText(d),
    ``,
    `SHIP TO`,
    ...d.address.map((l) => `  ${l}`),
    d.customerEmail ? `  ${d.customerEmail}` : `  (no email address given)`,
    ``,
    adminUrl,
  ].join("\n");

  return {
    to: process.env.ADMIN_EMAIL?.trim() ?? "",
    subject: `New order · ${d.customerName} · ${money(d.totalCents)}`,
    html,
    text,
    // So she can reply straight to the customer from her inbox.
    ...(d.customerEmail ? { replyTo: d.customerEmail } : {}),
  };
}

// ── 3. Payment received (to the customer) ───────────────────
export function paymentReceived(args: {
  brand: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
}): Mail {
  const firstName = args.customerName.split(" ")[0] || "there";

  const html = shell(
    args.brand,
    `Payment received, ${firstName}`,
    `
    <p style="margin:0;font-size:14px;line-height:1.65;color:${INK_SOFT};">
      We've got your <strong style="color:${INK};">${money(args.totalCents)}</strong> for order
      <strong style="color:${INK};">${esc(args.orderNumber)}</strong>. Thank you!
    </p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.65;color:${INK_SOFT};">
      Polly is making your pieces now. We'll email again the moment they're on their way.
    </p>
  `
  );

  const text = [
    `Payment received, ${firstName}`,
    ``,
    `We've got your ${money(args.totalCents)} for order ${args.orderNumber}. Thank you!`,
    `Polly is making your pieces now, and we'll email again when they ship.`,
  ].join("\n");

  return {
    to: args.customerEmail,
    subject: `Payment received for ${args.orderNumber}`,
    html,
    text,
  };
}

// ── 4. Shipped (to the customer) ────────────────────────────
export function orderShipped(args: {
  brand: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  address: string[];
}): Mail {
  const firstName = args.customerName.split(" ")[0] || "there";

  const html = shell(
    args.brand,
    `Your pieces are on the way, ${firstName}`,
    `
    <p style="margin:0;font-size:14px;line-height:1.65;color:${INK_SOFT};">
      Order <strong style="color:${INK};">${esc(args.orderNumber)}</strong> has shipped.
    </p>
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${SAGE_DEEP};padding:18px 0 6px;">On its way to</div>
    <p style="margin:0;font-size:14px;line-height:1.65;color:${INK};">${args.address.map(esc).join("<br />")}</p>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;color:${INK_SOFT};">
      Thank you for supporting handmade. If anything isn't right when it arrives, just reply to this email.
    </p>
  `
  );

  const text = [
    `Your pieces are on the way, ${firstName}`,
    ``,
    `Order ${args.orderNumber} has shipped.`,
    ``,
    `ON ITS WAY TO`,
    ...args.address.map((l) => `  ${l}`),
    ``,
    `Thank you for supporting handmade.`,
  ].join("\n");

  return {
    to: args.customerEmail,
    subject: `${args.orderNumber} has shipped`,
    html,
    text,
  };
}
