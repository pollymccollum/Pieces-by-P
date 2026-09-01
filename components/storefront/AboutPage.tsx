import Link from "next/link";
import type { AboutContent } from "@/lib/types";
import { fontStyle, type FontChoices } from "@/lib/fonts";
import { StrandArt } from "./visuals";

// Her story, laid out like the hero: words on the left, her photo on the
// right. Two columns on desktop, stacked on a phone with the photo first —
// a face is a better opening than a wall of text on a small screen.
export function AboutPage({
  about,
  fonts,
  imageUrl,
  maker,
}: {
  about: AboutContent;
  fonts: FontChoices;
  imageUrl: string | null;
  maker: string;
}) {
  // Blank lines become paragraphs, so she writes her story in one box and
  // controls the shape of it herself. Same rule as the emails.
  const paragraphs = (about.body ?? "")
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean);

  // Signs the story off in her own hand. Taken from the "Made by" field
  // she already fills in, so it needs no new setting and can never be
  // some other person's name.
  const firstName = (maker ?? "").trim().split(" ")[0];

  return (
    <>
      <section className="pp-page pp-aboutpage">
        <div className="pp-aboutcopy">
          <p className="pp-hero-eye">
            <span className="pp-script" style={fontStyle(fonts, "aboutEyebrowScript")}>
              {about.eyebrowScript}
            </span>
          </p>
          <h1 className="pp-h1" style={{ marginTop: 6 }}>
            <span style={fontStyle(fonts, "aboutTitle")}>{about.title}</span>
          </h1>

          <div className="pp-aboutbody" style={fontStyle(fonts, "aboutBody")}>
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {firstName && (
            <p className="pp-aboutsign" aria-hidden="true">
              — {firstName}
            </p>
          )}

          <Link href="/contact" className="pp-btn sage pp-aboutcta">
            Get in touch
          </Link>
        </div>

        <div className="pp-aboutart">
          {/* The photo is its own fixed-height box inside a column that grows
              with the story, and it sticks as you scroll. Without the wrapper
              the column height was driving the layout, so a long story ran on
              underneath the photo instead of pushing the page taller. */}
          <div className="pp-aboutart-inner">
            {imageUrl ? (
              // Her own photo, uploaded in the admin. A plain <img> for the
              // same reason as the product photos: owner-controlled paths.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={about.title} className="pp-photo" />
            ) : (
              // Until she uploads one, the shop's own illustration rather than
              // an empty grey rectangle.
              <div className="pp-aboutplaceholder">
                <StrandArt category="Necklaces" colors={[]} charm="heart" size={180} />
                <span className="pp-tag-note">Add a photo of yourself in Site content → About</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
