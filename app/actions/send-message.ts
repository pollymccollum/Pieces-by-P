"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/data";
import { notifyOwnerOfMessage } from "@/lib/email";
import { isRateLimited, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export type SendMessageResult = { ok: true } | { ok: false; error: string };

// Public — anyone can send. RLS allows anon INSERT on messages and nothing
// else, so a caller can leave a message but never read anyone else's.
export async function sendContactMessage(input: {
  name: string;
  email: string;
  body: string;
}): Promise<SendMessageResult> {
  const name = (input.name ?? "").trim().slice(0, 200);
  const email = (input.email ?? "").trim().slice(0, 200);
  const body = (input.body ?? "").trim().slice(0, 4000);

  if (!name) return { ok: false, error: "Please add your name." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please add a valid email address." };
  }
  if (!body) return { ok: false, error: "Please write a message." };

  if (await isRateLimited("messages", email)) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("messages").insert({ name, email, body });

  if (error) {
    console.error("[contact] insert failed:", error.message);
    return { ok: false, error: "Something went wrong sending that. Please try again." };
  }

  // Saved first, notified second: the message is safe even if email fails.
  try {
    const settings = await getSiteSettings();
    await notifyOwnerOfMessage({ name, email, body, brand: settings.brand });
  } catch (err) {
    console.error("[contact] saved but notification failed:", err);
  }

  return { ok: true };
}
