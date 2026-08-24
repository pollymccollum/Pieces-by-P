"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseAuthClient } from "@/lib/supabase/admin-client";

export type LoginState = { error: string } | undefined;

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
