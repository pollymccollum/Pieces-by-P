import "server-only";

// Transactional email via Brevo.
//
// Brevo rather than Resend because the domain is registered at Wix, whose
// DNS cannot create an MX record on a subdomain — which is what Resend
// requires to verify a domain. Brevo verifies with TXT/CNAME records only,
// so it works with the DNS we have and needs no nameserver change.
// Its free tier is 300 emails/day with no expiry, far above this shop's
// volume. (SendGrid would also work on Wix but is now $19.95/month.)
//
// Called over plain fetch rather than the SDK: one endpoint, one shape, and
// no dependency to keep patched.

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

// EMAIL_FROM is written the usual way: `Pieces by P <orders@piecesbyp.com>`.
// Brevo wants the name and address as separate fields.
function parseSender(raw: string): { name: string; email: string } | null {
  const withName = /^\s*(.+?)\s*<\s*([^>]+)\s*>\s*$/.exec(raw);
  if (withName) return { name: withName[1].replace(/^"|"$/g, ""), email: withName[2] };
  const bare = raw.trim();
  return bare.includes("@") ? { name: bare, email: bare } : null;
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
// the admin — losing the sale because the mail provider hiccuped would be far
// worse than a missing email.
export async function sendMail(mail: Mail): Promise<{ sent: boolean; reason?: string }> {
  if (!isEmailConfigured()) return { sent: false, reason: "email not configured" };
  if (!mail.to) return { sent: false, reason: "no recipient" };

  const sender = parseSender(process.env.EMAIL_FROM!);
  if (!sender) {
    console.error("[email] EMAIL_FROM is not a valid address:", process.env.EMAIL_FROM);
    return { sent: false, reason: "bad sender" };
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY!,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: mail.to }],
        subject: mail.subject,
        htmlContent: mail.html,
        textContent: mail.text,
        ...(mail.replyTo ? { replyTo: { email: mail.replyTo } } : {}),
      }),
      // Never let a hanging mail API hold up a checkout response.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[email] Brevo returned ${res.status}: ${detail.slice(0, 300)}`);
      return { sent: false, reason: `brevo ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { sent: false, reason: String(err) };
  }
}
