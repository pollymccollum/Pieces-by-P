import type { AboutContent } from "@/lib/types";

export function AboutSection({ about }: { about: AboutContent }) {
  return (
    <section id="about" className="pp-section">
      <div className="pp-wrap" style={{ maxWidth: 620, textAlign: "center" }}>
        <p className="pp-eyebrow-c">
          <span className="pp-script">{about.eyebrowScript}</span>
        </p>
        <h2 className="pp-h2">{about.title}</h2>
        <p className="pp-desc" style={{ marginTop: 14 }}>
          {about.body}
        </p>
      </div>
    </section>
  );
}
