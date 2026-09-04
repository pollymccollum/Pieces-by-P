"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/data";
import { notifyOwnerOfMessage, sendContactAutoReply } from "@/lib/email";
import {
  BUSY_MESSAGE,
  isContactFormBusy,
  isRateLimited,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";

export type SendMessageResult = { ok: true } | { ok: false; error: string };

// Public — anyone can send. RLS allows anon INSERT on messages and nothing
// else, so a caller can leave a message but never read anyone else's.
export async function sendContactMessage(input: {
  name: string;
  email: string;
  body: string;
  // Hidden field. A person never sees it, so anything in it came from
  // a bot filling every input on the page.
  website?: string;
}): Promise<SendMessageResult> {
  // Answered like a success on purpose: telling a bot it was caught
  // just invites a second attempt that works around the trap.
  if ((input.website ?? "").trim()) return { ok: true };

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

  // Site-wide ceiling. The per-email limit above caps one address; this
  // is what stops someone cycling addresses to send mail from her
  // domain to people who never asked for it, and burning the daily
  // Brevo allowance that her real customers depend on.
  if (await isContactFormBusy()) {
    return { ok: false, error: BUSY_MESSAGE };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("messages").insert({ name, email, body });

  if (error) {
    console.error("[contact] insert failed:", error.message);
    return { ok: false, error: "Something went wrong sending that. Please try again." };
  }

  // Saved first, emailed second: the message is safe even if email fails.
  // Both go out together — the owner's alert and the sender's receipt.
  try {
    const settings = await getSiteSettings();
    await Promise.allSettled([
      notifyOwnerOfMessage({ name, email, body, brand: settings.brand }),
      sendContactAutoReply({
        to: email,
        name,
        body,
        brand: settings.brand,
        location: settings.contact.location,
        reply: settings.emails.contactReply,
      }),
    ]);
  } catch (err) {
    console.error("[contact] saved but email failed:", err);
  }

  return { ok: true };
}
