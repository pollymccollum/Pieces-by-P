"use client";

import { useRef, useState, useTransition } from "react";
import type { SiteSettingsData } from "@/lib/types";
import { saveSettings } from "../actions";
import { PLACEHOLDERS, suggestFor, unknownPlaceholders } from "@/lib/email-placeholders";

// The five emails a customer can receive, in the order they'd meet them.
//
// `intro` and `after` describe the parts SHE doesn't write — the sentence the
// email opens with and whatever the template fills in below her message. They
// differ per email, which is exactly why each one needs its own preview
// rather than one generic sample at the bottom of the card.
const EMAIL_FIELDS = [
  {
    key: "confirmation" as const,
    label: "Order confirmation",
    when: "Sent the moment someone places an order.",
    intro: "Your order PBP-K7QM2 is in.",
    after: "The pieces, the total and the shipping address — and for a Venmo order, the amount to send and the reference.",
  },
  {
    key: "paymentReceived" as const,
    label: "Payment received",
    when: "Sent when you tap Mark paid on a Venmo order.",
    intro: "We've got your $75.00 for order PBP-K7QM2.",
    after: null,
  },
  {
    key: "shipped" as const,
    label: "Shipped",
    when: "Sent when you tap Shipped on an order.",
    intro: "Order PBP-K7QM2 has shipped.",
    after: "The address it's going to.",
  },
  {
    key: "venmoReminder" as const,
    label: "Venmo reminder",
    when: "Sent only when you tap Send reminder on an unpaid order.",
    intro: null,
    after: "The amount to send, your Venmo handle, and the order number to put in the note.",
  },
  {
    key: "contactReply" as const,
    label: "Reply to a message",
    when: "Sent automatically to anyone who uses your contact form.",
    intro: null,
    after: "A copy of the message they sent you.",
  },
];

// Lifted out of the site editor unchanged. It still saves through the same
// action and still writes the whole settings row — emails live in that one
// JSON blob alongside everything else, so splitting the page did not split
// the storage. Nothing here behaves differently for having its own tab.
export function EmailEditor({ initial }: { initial: SiteSettingsData }) {
  const [s, setS] = useState<SiteSettingsData>(initial);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const patch = (o: Partial<SiteSettingsData>) => {
    setS((c) => ({ ...c, ...o }));
    setStatus("idle");
  };

  const save = () => {
    setError(null);
    start(async () => {
      const res = await saveSettings(s);
      if (res.ok) setStatus("saved");
      else setError(res.error);
    });
  };

  return (
    <>
      <h1 className="ad-h2">Emails</h1>
      <p className="ad-lead">
        The wording of every email your shop sends, with a preview of each one
        underneath. Change something, then press Save at the bottom.
      </p>

      {/* ---- emails ---- */}
      {/* Only the friendly wording is editable. Order numbers, items, totals,
          the address, and the Venmo instructions stay generated, so nothing
          she types here can leave a customer without the facts. */}
      <div className="ad-card">
        <p className="ad-sec">Every word you send</p>
        <p className="ad-help" style={{ marginBottom: 14 }}>
          Every word of every email you send. The facts around them — order
          number, the pieces, the total, the address, the Venmo instructions —
          are filled in for you and can&apos;t be deleted by accident.
        </p>
        <p className="ad-help" style={{ marginBottom: 16 }}>
          Use the <b>Insert</b> buttons to drop in a customer&apos;s name, the
          order number or your shop name. If one ever gets mistyped, the line
          quietly falls back to the original wording rather than sending
          something broken — and it tells you.
        </p>

        {/* Only the two emails addressed to HER are optional. The three sent
            to customers stay on: someone who gets no confirmation assumes
            their order failed. */}
        <div className="ad-notify">
          <span className="ad-lbl">What gets emailed to you</span>
          <span className="ad-help" style={{ marginTop: 4, marginBottom: 10, display: "block" }}>
            Both of these also show up in your admin whatever you choose here —
            orders on the Orders tab, messages under Special requests. These
            switches only decide whether your inbox hears about them too.
          </span>

          <label className="ad-toggle ad-notifyrow">
            <input
              type="checkbox"
              checked={s.emails.notifyOnOrder}
              onChange={(e) => patch({ emails: { ...s.emails, notifyOnOrder: e.target.checked } })}
            />
            <span>
              <b>When an order comes in</b>
              <span className="ad-help">
                Safe to turn off if the emails are burying the messages you
                actually need to answer — the order is already sitting on your
                board. You just won&apos;t know it arrived until you look.
              </span>
            </span>
          </label>

          <label className="ad-toggle ad-notifyrow">
            <input
              type="checkbox"
              checked={s.emails.notifyOnMessage}
              onChange={(e) => patch({ emails: { ...s.emails, notifyOnMessage: e.target.checked } })}
            />
            <span>
              <b>When someone sends you a message</b>
              <span className="ad-help">
                Worth keeping on. Unlike an order, a message is someone waiting
                for a reply — and if you don&apos;t see it for a week, they
                assume you ignored them.
              </span>
            </span>
          </label>
        </div>

        {/* One block per email she sends. Everything factual around her words
            — order number, pieces, totals, address, the Venmo box — is still
            generated, so she can rewrite the voice without being able to
            leave a customer without the details. */}
        {EMAIL_FIELDS.map(({ key, label, when, intro, after }) => (
          <div className="ad-emailblock" key={key}>
            <div className="ad-emailhead">
              <b>{label}</b>
              <span className="ad-help">{when}</span>
            </div>

            {(["subject", "heading", "message"] as const).map((part) => (
              <CopyField
                key={part}
                part={part}
                value={s.emails[key][part]}
                onChange={(next) =>
                  patch({ emails: { ...s.emails, [key]: { ...s.emails[key], [part]: next } } })
                }
              />
            ))}

            <EmailPreview
              brand={s.brand}
              copy={s.emails[key]}
              signoff={s.emails.signoff}
              intro={intro}
              after={after}
            />
          </div>
        ))}

        <div className="ad-field" style={{ marginTop: 4 }}>
          <span className="ad-lbl">Sign-off — used on all five</span>
          <textarea
            className="pp-textarea"
            style={{ minHeight: 64 }}
            value={s.emails.signoff}
            onChange={(e) => patch({ emails: { ...s.emails, signoff: e.target.value } })}
          />
          <span className="ad-help">
            The last thing every customer reads. Leave it empty to skip it.
          </span>
        </div>
      </div>

      <div className="ad-savebar">
        {error ? (
          <span className="ad-err">{error}</span>
        ) : status === "saved" ? (
          <span className="ad-saved">Saved ✓ — your emails are updated</span>
        ) : (
          <span className="ad-saved" style={{ color: "var(--ink-soft)" }}>
            Unsaved changes
          </span>
        )}
        <button className="pp-btn sage" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </>
  );
}

// Shows Polly her words sitting inside the parts she doesn't control, so
// "what does the customer actually get?" is answered on the page rather than
// by placing a test order.
const PART_LABELS = {
  subject: "Subject line",
  heading: "Heading",
  message: "Message",
} as const;

// One editable part of an email, with the placeholders as buttons rather than
// something to type.
//
// Typing `{name}` by hand is the only way to get it wrong, so the buttons are
// the real fix — she clicks, it lands at the cursor. The warning below is for
// when she edits around one and breaks it anyway, and it names the mistake
// rather than just flagging that one exists.
function CopyField({
  part,
  value,
  onChange,
}: {
  part: "subject" | "heading" | "message";
  value: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const bad = unknownPlaceholders(value);

  const insert = (token: string) => {
    const el = ref.current;
    const chip = `{${token}}`;
    if (!el) {
      onChange(value + chip);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const endPos = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + chip + value.slice(endPos));
    // Put the cursor after what was just inserted, so she can keep typing.
    requestAnimationFrame(() => {
      el.focus();
      const at = start + chip.length;
      el.setSelectionRange(at, at);
    });
  };

  return (
    <div className="ad-field" style={{ marginTop: part === "subject" ? 0 : 10 }}>
      <span className="ad-lbl">{PART_LABELS[part]}</span>

      {part === "message" ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          className="pp-textarea"
          style={{ minHeight: 84 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          className="pp-input"
          maxLength={120}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      <div className="ad-chiprow">
        <span className="ad-chiplabel">Insert</span>
        {PLACEHOLDERS.map((ph) => (
          <button
            key={ph.token}
            type="button"
            className="ad-chip"
            title={ph.label}
            onClick={() => insert(ph.token)}
          >
            {ph.label}
          </button>
        ))}
      </div>

      {bad.length > 0 && (
        <p className="ad-chipwarn">
          <b>{bad.map((t) => `{${t}}`).join(", ")}</b>{" "}
          {bad.length === 1 ? "isn't something" : "aren't things"} I can fill in.
          {(() => {
            const guess = suggestFor(bad[0]);
            return guess ? ` Did you mean {${guess}}?` : "";
          })()}{" "}
          Until it&apos;s fixed, this line falls back to the original wording so
          customers never see it — use the Insert buttons above.
        </p>
      )}
    </div>
  );
}

// What the customer actually receives, assembled from her three fields and
// the parts the template fills in. Sage is hers, grey is generated — so the
// boundary between "what I can change" and "what is always there" is visible
// rather than something she has to infer.
function EmailPreview({
  brand,
  copy,
  signoff,
  intro,
  after,
}: {
  brand: string;
  copy: { subject: string; heading: string; message: string };
  signoff: string;
  intro: string | null;
  after: string | null;
}) {
  // The same substitution the email itself does, so the preview can't promise
  // something the send won't produce.
  const fill = (t: string) =>
    (t ?? "")
      .replace(/\{name\}/gi, "Sarah")
      .replace(/\{order\}/gi, "PBP-K7QM2")
      .replace(/\{brand\}/gi, brand || "Pieces by P");

  const blocks = (text: string) =>
    fill(text)
      .trim()
      .split(/\n\s*\n/)
      .filter(Boolean);

  return (
    <div className="ad-mailprev">
      <div className="ad-mailprev-subject">
        <span>Subject</span>
        {fill(copy.subject) || "(no subject)"}
      </div>
      <div className="ad-mailprev-brand">{brand || "Pieces by P"}</div>
      <div className="ad-mailprev-sheet">
        <div className="ad-mailprev-h">{fill(copy.heading) || "\u00a0"}</div>
        {intro && <p className="ad-mailprev-fixed">{intro}</p>}
        {blocks(copy.message).map((b, i) => (
          <p className="ad-mailprev-yours" key={i}>
            {b}
          </p>
        ))}
        {after && <div className="ad-mailprev-rest">{after}</div>}
        {blocks(signoff).map((b, i) => (
          <p className="ad-mailprev-yours" key={i} style={{ marginTop: 10 }}>
            {b}
          </p>
        ))}
      </div>
      <div className="ad-mailprev-note">Sage is yours · grey is filled in for you</div>
    </div>
  );
}
