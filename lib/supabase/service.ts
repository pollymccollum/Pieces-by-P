import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS entirely.
//
// Used ONLY where a trusted server context must write something the public
// role deliberately cannot — currently just the Stripe webhook, which marks
// an order paid. RLS gives anon INSERT on orders and nothing else, so there
// is no way to do this with the publishable key, and there shouldn't be:
// "mark this order paid" must never be callable from a browser.
//
// The webhook is safe to trust because Stripe signs every request and we
// verify that signature before this client is ever constructed.
//
// NEVER import this into a Client Component or any browser-reachable code.
// The "server-only" import above turns that mistake into a build error.
export function getSupabaseServiceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for the Stripe webhook."
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
