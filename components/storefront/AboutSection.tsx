import type { AboutContent } from "@/lib/types";
import { fontStyle, type FontChoices } from "@/lib/fonts";

export function AboutSection({ about, fonts }: { about: AboutContent; fonts: FontChoices }) {
  return (
    <section id="about" className="pp-section">
      <div className="pp-wrap" style={{ maxWidth: 620, textAlign: "center" }}>
        <p className="pp-eyebrow-c">
          <span className="pp-script" style={fontStyle(fonts, "aboutEyebrowScript")}>
            {about.eyebrowScript}
          </span>
        </p>
        <h2 className="pp-h2" style={fontStyle(fonts, "aboutTitle")}>
          {about.title}
        </h2>
        <p className="pp-desc" style={{ marginTop: 14, ...fontStyle(fonts, "aboutBody") }}>
          {about.body}
        </p>
      </div>
    </section>
  );
}
