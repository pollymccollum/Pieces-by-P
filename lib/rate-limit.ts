import "server-only";
import { getSupabaseServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service";

// Light abuse protection for the two things any visitor can create: orders
// and contact messages. Both are unauthenticated by necessity.
//
// Deliberately generous. No real customer places six orders in ten minutes,
// but a launch-day rush must never be turned away, so the limits sit well
// above plausible human behaviour.
//
// FAILS OPEN. If the check itself errors — database blip, missing key — the
// request is allowed through. Losing a real sale is far worse than letting
// spam past, and this is a nuisance guard, not a security control.

const WINDOW_MINUTES = 10;
const MAX_PER_EMAIL = 5;

// The per-email limit above caps one address. It caps nothing in aggregate,
// because whoever is abusing the form simply types a different address each
// time — and each of those sends real mail, from her verified domain, to
// somebody who never asked for it. Two things follow from that:
//
//   Messages can be capped outright. Nobody loses anything real if the
//   contact form turns someone away for an hour.
//
//   Orders cannot. Refusing an order to protect an email quota would trade a
//   sale for a nuisance, which is the wrong way round. So the order is always
//   saved and Polly is always told; it is the customer-facing confirmation
//   that gets skipped once the hour looks abusive, and add-email-status.sql
//   records that it was skipped so it isn't lost silently.
const HOUR_MINUTES = 60;
const MAX_MESSAGES_PER_HOUR = 30;
const MAX_ORDER_EMAILS_PER_HOUR = 60;

type Table = "orders" | "messages";

async function countSince(table: Table, minutes: number, email?: string): Promise<number | null> {
  if (!isServiceRoleConfigured()) return null;
  try {
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const db = getSupabaseServiceClient();

    let q = db
      .from(table)
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);

    if (email) q = q.ilike(table === "orders" ? "customer_email" : "email", email);

    const { count, error } = await q;
    if (error) return null; // fail open
    return count ?? 0;
  } catch {
    return null; // fail open
  }
}

export async function isRateLimited(table: Table, email: string): Promise<boolean> {
  const address = (email ?? "").trim().toLowerCase();
  if (!address) return false;

  const count = await countSince(table, WINDOW_MINUTES, address);
  if (count === null) return false;
  return count >= MAX_PER_EMAIL;
}

// Site-wide ceiling for the contact form. Thirty messages an hour is roughly
// one every two minutes, sustained — far past anything a handmade shop sees
// and comfortably inside Brevo's 300-a-day free tier.
export async function isContactFormBusy(): Promise<boolean> {
  const count = await countSince("messages", HOUR_MINUTES);
  if (count === null) return false;
  return count >= MAX_MESSAGES_PER_HOUR;
}

// Whether a customer-facing order confirmation should still be sent.
//
// Never blocks the order itself — only the email, and only once the hour has
// gone far past what a real shop produces. A genuine launch-day rush of sixty
// orders in an hour would be extraordinary, and even then the orders are all
// saved and visible; only the automatic receipts pause.
export async function orderEmailBudgetSpent(): Promise<boolean> {
  const count = await countSince("orders", HOUR_MINUTES);
  if (count === null) return false;
  return count > MAX_ORDER_EMAILS_PER_HOUR;
}

export const RATE_LIMIT_MESSAGE =
  "That's a lot of submissions in a short time. Please wait a few minutes and try again.";

export const BUSY_MESSAGE =
  "We're getting an unusual number of messages right now. Please try again in a little while, or reach out on Instagram.";
