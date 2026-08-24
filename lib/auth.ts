import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseAuthClient } from "@/lib/supabase/admin-client";

export type Owner = { id: string; email: string };

// Is this email allowed into /admin? ADMIN_EMAIL is the single owner
// account (Polly). Compared case-insensitively because email casing is
// not meaningful and she may type it either way at the login form.
function isAllowedEmail(email: string | undefined): boolean {
  const allowed = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowed) return false; // unset = nobody gets in, fail closed
  return Boolean(email && email.trim().toLowerCase() === allowed);
}

// Returns the signed-in owner, or null. Does not redirect — use this
// where you need to branch (e.g. the login page itself).
// Wrapped in React cache so repeated calls in one render hit Supabase once.
export const getOwner = cache(async (): Promise<Owner | null> => {
  const supabase = await getSupabaseAuthClient();

  // getUser() revalidates the token with Supabase rather than trusting
  // the cookie's contents, which is what makes this safe to gate on.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  if (!isAllowedEmail(data.user.email)) return null;

  return { id: data.user.id, email: data.user.email };
});

// The guard. Call this at the top of every admin page AND every server
// action that mutates data — a layout check is not sufficient, because
// layouts don't re-render on navigation and don't stop child routes or
// actions from executing.
export async function requireOwner(): Promise<Owner> {
  const owner = await getOwner();
  if (!owner) redirect("/admin/login");
  return owner;
}
