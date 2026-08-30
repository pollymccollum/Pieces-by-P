"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/admin-client";
import { requireOwner } from "@/lib/auth";

export type LoginState = { error: string } | undefined;
export type ForgotState = { error: string } | { sent: true } | undefined;
export type ResetState = { error: string } | undefined;

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  // Only the owner's address may sign in. Checked before hitting Supabase
  // so a wrong account can't establish a session at all.
  const allowed = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowed) {
    return { error: "No owner email is configured yet. Set ADMIN_EMAIL in .env.local." };
  }
  if (email.toLowerCase() !== allowed) {
    return { error: "That email isn't the owner account for this shop." };
  }

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: don't reveal whether the account exists.
    return { error: "That email and password didn't match." };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await getSupabaseAuthClient();
  await supabase.auth.signOut();
  revalidatePath("/admin", "layout");
  redirect("/admin/login");
}

// Emails a reset link. There is exactly one account here, so the only
// address this will ever send to is ADMIN_EMAIL — a stranger who guesses
// the /admin URL can't use this to mail anyone else.
export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim();
  const allowed = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!allowed) {
    return { error: "No owner email is configured yet. Set ADMIN_EMAIL in .env.local." };
  }

  // Answer the same either way. Confirming which address is the owner's
  // would tell someone poking at the page exactly who to target.
  if (!email || email.toLowerCase() !== allowed) {
    return { sent: true };
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const supabase = await getSupabaseAuthClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/admin/auth/callback`,
  });

  if (error) {
    // Usually Supabase's own hourly email rate limit.
    console.error("[auth] reset email failed:", error.message);
    return { error: "Couldn't send that email just now. Wait a minute and try again." };
  }

  return { sent: true };
}

// Sets the new password. The recovery link has already established a
// session by the time this runs; requireOwner re-checks it here rather than
// trusting that the page did.
export async function updatePassword(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  await requireOwner();

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those two passwords don't match." };

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  // Straight to the admin: she's already signed in with the new password.
  revalidatePath("/admin", "layout");
  redirect("/admin");
}
