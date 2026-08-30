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

type Table = "orders" | "messages";

export async function isRateLimited(table: Table, email: string): Promise<boolean> {
  const address = (email ?? "").trim().toLowerCase();
  if (!address) return false;
  if (!isServiceRoleConfigured()) return false;

  try {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const db = getSupabaseServiceClient();

    const { count, error } = await db
      .from(table)
      .select("id", { count: "exact", head: true })
      .ilike(table === "orders" ? "customer_email" : "email", address)
      .gte("created_at", since);

    if (error) return false; // fail open
    return (count ?? 0) >= MAX_PER_EMAIL;
  } catch {
    return false; // fail open
  }
}

export const RATE_LIMIT_MESSAGE =
  "That's a lot of submissions in a short time. Please wait a few minutes and try again.";
