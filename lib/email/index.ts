import "server-only";
import type { Order } from "@/lib/types";
import { sendMail, isEmailConfigured } from "./client";
import {
  orderConfirmation,
  orderShipped,
  ownerNewMessage,
  ownerNewOrder,
  paymentReceived,
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
