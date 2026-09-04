import "server-only";
import type { Order } from "@/lib/types";
import { sendMail, isEmailConfigured } from "./client";
import { orderEmailBudgetSpent } from "@/lib/rate-limit";
import {
  contactReceived,
  orderConfirmation,
  orderShipped,
  ownerNewMessage,
  ownerNewOrder,
  paymentReceived,
  venmoReminder,
  type OrderEmailData,
} from "./templates";

export { isEmailConfigured };

export function formatAddress(a: {
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
}): string[] {
  return [
    a.name,
    a.address2 ? `${a.address1}, ${a.address2}` : a.address1,
    `${a.city}, ${a.state} ${a.zip}`,
  ];
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

// Sends the customer confirmation and the owner alert for a brand new order.
// Never throws: emails are best-effort, and the order already exists.
// What happened to the customer's copy, so the caller can record it on
// the order. Polly is already looking at that screen; Netlify's function
// logs are the one place nobody is watching.
export type ConfirmationOutcome = "sent" | "failed" | "skipped" | null;

export async function sendNewOrderEmails(
  data: OrderEmailData & { notifyOwner?: boolean }
): Promise<ConfirmationOutcome> {
  // null, not 'failed': email being switched off is a configuration
  // choice, not a fault, and shouldn't raise a flag on every order.
  if (!isEmailConfigured()) return null;

  // The owner's alert always goes — it's one email, and it's how she
  // finds out she has an order at all.
  const jobs = [];
  if (data.notifyOwner !== false) {
    jobs.push(sendMail(ownerNewOrder(data, `${siteUrl()}/admin/orders`)));
  }

  // customerEmail is required at checkout, but stays nullable in the type
  // so older orders (and any created before that rule) can't crash this.
  let outcome: ConfirmationOutcome = null;
  if (data.customerEmail) {
    if (await orderEmailBudgetSpent()) {
      // Far past a real trading hour. The order is already saved and
      // Polly is still told; only the automatic receipt pauses, and it
      // says so on the order rather than vanishing.
      console.warn(`[email] order confirmation skipped — hourly budget spent (${data.orderNumber})`);
      outcome = "skipped";
    } else {
      const res = await sendMail(orderConfirmation(data));
      outcome = res.sent ? "sent" : "failed";
    }
  }

  await Promise.allSettled(jobs);
  return outcome;
}

export async function sendShippedEmail(order: Order, brand: string): Promise<void> {
  if (!isEmailConfigured() || !order.customer_email) return;

  await sendMail(
    orderShipped({
      brand,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      address: formatAddress({
        name: order.customer_name,
        address1: order.address1,
        address2: order.address2,
        city: order.city,
        state: order.state,
        zip: order.zip,
      }),
    })
  );
}

export async function sendPaymentReceivedEmail(order: Order, brand: string): Promise<void> {
  if (!isEmailConfigured() || !order.customer_email) return;

  await sendMail(
    paymentReceived({
      brand,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      totalCents: order.total_cents,
    })
  );
}

// Tells Polly a contact-form message arrived. The message is already saved
// to the database by this point, so a failure here loses nothing.
export async function notifyOwnerOfMessage(args: {
  name: string;
  email: string;
  body: string;
  brand: string;
}): Promise<void> {
  if (!isEmailConfigured()) return;
  await sendMail(ownerNewMessage({ ...args, adminUrl: `${siteUrl()}/admin/messages` }));
}

// Auto-reply to whoever used the contact form. Sent after the message is
// already saved, so a mail failure loses nothing.
export async function sendContactAutoReply(args: {
  to: string;
  name: string;
  body: string;
  brand: string;
  location: string;
  reply: string;
}): Promise<void> {
  if (!isEmailConfigured() || !args.to) return;
  const mail = contactReceived({
    brand: args.brand,
    name: args.name,
    body: args.body,
    location: args.location,
    reply: args.reply,
  });
  await sendMail({ ...mail, to: args.to });
}

// Nudges a customer whose Venmo hasn't arrived. Triggered by hand from the
// orders page — see setPaymentStatus's neighbours in app/admin/actions.ts.
export async function sendVenmoReminderEmail(
  order: Order,
  brand: string,
  venmoHandle: string,
  location: string
): Promise<{ sent: boolean; reason?: string }> {
  if (!isEmailConfigured()) return { sent: false, reason: "email not configured" };
  if (!order.customer_email) return { sent: false, reason: "no email address" };

  const mail = venmoReminder({
    brand,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    totalCents: order.total_cents,
    venmoHandle,
    location,
  });
  return sendMail({ ...mail, to: order.customer_email });
}
