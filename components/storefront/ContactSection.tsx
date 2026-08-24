import type { ContactContent } from "@/lib/types";

export function ContactSection({ contact }: { contact: ContactContent }) {
  return (
    <section id="contact" className="pp-contact">
      <div className="pp-wrap pp-contact-grid">
        <div>
          <p className="pp-eyebrow" style={{ color: "var(--sage-deep)" }}>
            Get in touch
          </p>
          <h2 className="pp-h2" style={{ textAlign: "left", marginTop: 8 }}>
            {contact.heading}
          </h2>
          <div className="pp-clines" style={{ marginTop: 18 }}>
            <strong>Instagram</strong> · {contact.instagram}
            <br />
            <strong>Email</strong> · {contact.email}
            <br />
            <strong>Made by</strong> · {contact.maker}
            <br />
            <strong>Based in</strong> · {contact.location}
            <br />
            <strong>Find us</strong> · {contact.findus}
          </div>
        </div>
        <div>
          <div className="pp-cform">
            <input className="pp-input" placeholder="Your name" disabled />
            <input className="pp-input" placeholder="Email" disabled />
            <textarea className="pp-textarea" placeholder="Custom colors, an initial, a question…" disabled />
            <button className="pp-btn sage" style={{ justifySelf: "start" }} disabled>
              Send message
            </button>
            <p className="pp-note">
              This form isn&apos;t wired up yet — email {contact.email} directly for now.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
