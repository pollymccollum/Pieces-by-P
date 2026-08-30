import "server-only";
import type { Order } from "@/lib/types";
import { sendMail, isEmailConfigured } from "./client";
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
export async function sendNewOrderEmails(
  data: OrderEmailData & { notifyOwner?: boolean }
): Promise<void> {
  if (!isEmailConfigured()) return;

  const jobs = [];
  // customerEmail is required at checkout, but stays nullable in the type so
  // older orders (and any created before that rule) can't crash this.
  if (data.customerEmail) jobs.push(sendMail(orderConfirmation(data)));
  if (data.notifyOwner !== false) {
    jobs.push(sendMail(ownerNewOrder(data, `${siteUrl()}/admin/orders`)));
  }

  await Promise.allSettled(jobs);
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
