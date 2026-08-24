import "server-only";
import { Resend } from "resend";

// Email is optional infrastructure. Until RESEND_API_KEY and EMAIL_FROM are
// set (they arrive at launch, with Polly's own Resend account and domain),
// every send quietly no-ops. Nothing in the ordering flow depends on it.
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

let cached: Resend | null = null;

function client(): Resend | null {
  if (!isEmailConfigured()) return null;
  if (!cached) cached = new Resend(process.env.RESEND_API_KEY);
  return cached;
}

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

// Best-effort by design: a failed email must never fail an order. A customer
// whose confirmation bounced still has a real order, and Polly can see it in
// the admin — losing the sale because the mail server hiccuped would be far
// worse than a missing email.
export async function sendMail(mail: Mail): Promise<{ sent: boolean; reason?: string }> {
  const resend = client();
  if (!resend) return { sent: false, reason: "email not configured" };
  if (!mail.to) return { sent: false, reason: "no recipient" };

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    });

    if (error) {
      console.error("[email] send failed:", error.message);
      return { sent: false, reason: error.message };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] send threw:", err);
    return { sent: false, reason: String(err) };
  }
}
