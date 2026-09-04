"use client";

import { useState, useTransition } from "react";
import { sendContactMessage } from "@/app/actions/send-message";

export function ContactForm({ fallbackEmail }: { fallbackEmail: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  // Honeypot. Hidden from people, irresistible to form-filling bots.
  const [website, setWebsite] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="pp-cform">
        <p className="pp-eyebrow" style={{ color: "var(--sage-deep)" }}>
          Message sent
        </p>
        <p style={{ margin: 0, lineHeight: 1.7, color: "var(--ink-soft)" }}>
          Thank you — we&apos;ll come back to you at {email} as soon as we can.
        </p>
        <button
          className="pp-btn ghost"
          style={{ justifySelf: "start" }}
          onClick={() => {
            setSent(false);
            setName("");
            setEmail("");
            setBody("");
          }}
        >
          Send another
        </button>
      </div>
    );
  }

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await sendContactMessage({ name, email, body, website });
      if (res.ok) setSent(true);
      else setError(res.error);
    });
  };

  return (
    <div className="pp-cform">
      <input
        className="pp-input"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="pp-input"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <textarea
        className="pp-textarea"
        placeholder="Custom colors, an initial, a question…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {/* Honeypot. Hidden from sighted users, from screen readers, and from
          keyboard tab order — so anything that fills it in is a bot walking
          the DOM. aria-hidden and tabIndex matter as much as the CSS: a
          field that only LOOKS hidden traps real people using assistive
          technology. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />
      <button
        className="pp-btn sage"
        style={{ justifySelf: "start" }}
        disabled={pending}
        onClick={submit}
      >
        {pending ? "Sending…" : "Send message"}
      </button>
      {error && <p className="pp-hint">{error}</p>}
      <p className="pp-note">
        Prefer email? Write to {fallbackEmail} any time.
      </p>
    </div>
  );
}
