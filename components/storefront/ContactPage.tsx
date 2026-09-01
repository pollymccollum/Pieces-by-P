import type { ContactContent } from "@/lib/types";
import { fontStyle, type FontChoices } from "@/lib/fonts";
import { ContactForm } from "./ContactForm";

// Everything a customer needs to reach her, and the form to do it.
//
// The details are links rather than text: on a phone, tapping an Instagram
// handle should open Instagram and tapping an email should open mail. Typing
// a handle out by hand is how people give up.
export function ContactPage({
  contact,
  fonts,
}: {
  contact: ContactContent;
  fonts: FontChoices;
}) {
  const handle = (contact.instagram ?? "").trim().replace(/^@+/, "");

  return (
    <section className="pp-page pp-contactpage">
      <div className="pp-contactintro">
        <p className="pp-hero-eye">
          <span className="pp-script">Get in touch</span>
        </p>
        <h1 className="pp-h1" style={{ marginTop: 6 }}>
          <span style={fontStyle(fonts, "contactHeading")}>{contact.heading}</span>
        </h1>
      </div>

      <div className="pp-contact-grid">
        <div>
          <dl className="pp-contactlist">
            {handle && (
              <div>
                <dt>Instagram</dt>
                <dd>
                  <a href={`https://instagram.com/${handle}`} target="_blank" rel="noopener noreferrer">
                    @{handle}
                  </a>
                </dd>
              </div>
            )}
            {contact.email && (
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </dd>
              </div>
            )}
            {contact.maker && (
              <div>
                <dt>Made by</dt>
                <dd>{contact.maker}</dd>
              </div>
            )}
            {contact.location && (
              <div>
                <dt>Based in</dt>
                <dd>{contact.location}</dd>
              </div>
            )}
            {contact.findus && (
              <div>
                <dt>Find us</dt>
                <dd>{contact.findus}</dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          <ContactForm fallbackEmail={contact.email} />
        </div>
      </div>
    </section>
  );
}
