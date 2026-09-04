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
  // Polly's own wording, from the site editor. See EmailContent.
  note: string;
  signoff: string;
};

// `location` comes from site settings, so the owner moving town is an
// admin edit rather than a code change.
function shell(brand: string, heading: string, body: string, location = ""): string {
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
      ${esc(brand)}${location ? ` — handmade to order in ${esc(location)}` : ""}
    </p>
  </div>
</body></html>`;
}

const NEWLINE = String.fromCharCode(10);

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Single quotes too. Every attribute in these templates uses double
    // quotes today, so this changes nothing — it stops the next template
    // from being one single-quoted attribute away from an injection point.
    .replace(/'/g, "&#39;");
}

// Owner-written wording arrives as plain text from a textarea. Blank lines
// become paragraphs and single newlines become breaks, so what she typed is
// what she gets — escaped first, because it lands inside HTML.
function paragraphs(text: string, color: string): string {
  const blocks = String(text ?? '')
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean);

  return blocks
    .map(
      (b) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:${color};">${esc(b).replace(/\n/g, "<br />")}</p>`
    )
    .join('');
}

// Same text for the plain-text alternate: no escaping, no markup.
function plain(text: string): string {
  return String(text ?? '').trim();
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
    <p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:${INK_SOFT};">
      Your order <strong style="color:${INK};">${esc(d.orderNumber)}</strong> is in.
    </p>
    ${paragraphs(d.note, INK_SOFT)}
    ${venmoBlock}
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${SAGE_DEEP};padding:16px 0 0;">Your pieces</div>
    ${itemsHtml(d)}
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${SAGE_DEEP};padding:20px 0 6px;">Shipping to</div>
    <p style="margin:0;font-size:14px;line-height:1.65;color:${INK};">${d.address.map(esc).join("<br />")}</p>
    ${d.signoff.trim() ? `<div style="border-top:1px solid ${HAIR};margin-top:20px;padding-top:16px;">${paragraphs(d.signoff, INK)}</div>` : ""}
  `
  );

  const text = [
    `Thank you, ${firstName}!`,
    ``,
    `Your order ${d.orderNumber} is in.`,
    ...(plain(d.note) ? [``, plain(d.note)] : []),
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
    ...(plain(d.signoff) ? [``, plain(d.signoff)] : []),
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

// ── 5. New contact message (to Polly) ───────────────────────
export function ownerNewMessage(args: {
  brand: string;
  name: string;
  email: string;
  body: string;
  adminUrl: string;
}): Mail {
  const html = shell(
    args.brand,
    `Message from ${args.name}`,
    `
    <p style="margin:0 0 14px;font-size:13px;color:${INK_SOFT};">
      <a href="mailto:${esc(args.email)}" style="color:${SAGE_DEEP};">${esc(args.email)}</a>
    </p>
    <div style="background:${CREAM};border:1px solid ${HAIR};border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.65;color:${INK};white-space:pre-wrap;">${esc(args.body)}</div>
    <p style="margin:20px 0 0;">
      <a href="${esc(args.adminUrl)}" style="display:inline-block;background:${SAGE_DEEP};color:#ffffff;text-decoration:none;border-radius:22px;padding:11px 22px;font-size:13px;">Open your messages</a>
    </p>
  `
  );

  const text = [
    `Message from ${args.name}`,
    args.email,
    "",
    args.body,
    "",
    args.adminUrl,
  ].join(NEWLINE);

  return {
    to: process.env.ADMIN_EMAIL?.trim() ?? "",
    subject: `Message from ${args.name}`,
    html,
    text,
    replyTo: args.email,
  };
}

// ── 6. Contact form auto-reply (to the customer) ────────────
// Someone asking about a custom piece currently gets an on-screen
// confirmation and then silence. For a shop whose whole pitch is "tell us
// your colours", that first exchange matters — this gives them a receipt.
export function contactReceived(args: {
  brand: string;
  name: string;
  body: string;
  location: string;
  reply: string; // Polly's wording, from the site editor
}): Mail {
  const firstName = args.name.split(" ")[0] || "there";

  const html = shell(
    args.brand,
    `Thanks, ${firstName} — we've got your message`,
    `
    ${paragraphs(args.reply, INK_SOFT)}
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${SAGE_DEEP};padding:6px 0 6px;">What you sent</div>
    <div style="background:${CREAM};border:1px solid ${HAIR};border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.65;color:${INK};white-space:pre-wrap;">${esc(args.body)}</div>
  `,
    args.location
  );

  const text = [
    `Thanks, ${firstName} — we've got your message`,
    ``,
    plain(args.reply),
    ``,
    `WHAT YOU SENT`,
    args.body,
  ].join(NEWLINE);

  return {
    to: "",
    subject: `We got your message — ${args.brand}`,
    html,
    text,
  };
}

// ── 7. Venmo payment reminder (to the customer) ─────────────
// Sent by hand from the orders page, not on a timer. An unpaid Venmo order
// holds its stock and represents a sale not yet collected, but only Polly
// can judge whether a nudge is welcome or premature.
export function venmoReminder(args: {
  brand: string;
  orderNumber: string;
  customerName: string;
  totalCents: number;
  venmoHandle: string;
  location: string;
}): Mail {
  const firstName = args.customerName.split(" ")[0] || "there";

  const html = shell(
    args.brand,
    `A reminder about order ${args.orderNumber}`,
    `
    <p style="margin:0 0 6px;font-size:14px;line-height:1.65;color:${INK_SOFT};">
      Hi ${esc(firstName)} — your pieces are still set aside, and we haven't
      seen the Venmo come through yet.
    </p>
    <div style="background:#F4E4C6;border:1px solid #E0C68F;border-radius:10px;padding:16px;margin:18px 0;">
      <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#6B4A12;">
        Send <strong>${money(args.totalCents)}</strong> on Venmo${
          args.venmoHandle ? ` to <strong>${esc(args.venmoHandle)}</strong>` : ""
        }, with this in the note:
      </p>
      <div style="background:${SURFACE};border:1px dashed #D8B877;border-radius:8px;padding:10px 14px;font-size:17px;letter-spacing:0.08em;text-align:center;color:${INK};">
        ${esc(args.orderNumber)}
      </div>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.65;color:${INK_SOFT};">
      Already sent it? Then it just hasn't been matched up yet — no need to do
      anything, and apologies for the nudge. Changed your mind? Reply to this
      email and we'll release the pieces.
    </p>
  `,
    args.location
  );

  const text = [
    `A reminder about order ${args.orderNumber}`,
    ``,
    `Hi ${firstName} — your pieces are still set aside, and we haven't seen the Venmo yet.`,
    ``,
    `Send ${money(args.totalCents)} on Venmo${args.venmoHandle ? ` to ${args.venmoHandle}` : ""},`,
    `with ${args.orderNumber} in the note.`,
    ``,
    `Already sent it? It just hasn't been matched up yet — nothing to do.`,
    `Changed your mind? Reply and we'll release the pieces.`,
  ].join(NEWLINE);

  return {
    to: "",
    subject: `Reminder: your ${args.brand} order ${args.orderNumber}`,
    html,
    text,
  };
}
