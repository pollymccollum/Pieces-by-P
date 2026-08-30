"use client";

import type { HeroContent, HeroLayout, PhotoFit } from "@/lib/types";
import { fontStyle, type FontChoices } from "@/lib/fonts";
import { StrandArt } from "./visuals";

export function Hero({
  hero,
  heroImageUrl,
  heroLayout,
  heroFit,
  fonts,
}: {
  hero: HeroContent;
  heroImageUrl: string | null;
  heroLayout: HeroLayout;
  heroFit: PhotoFit;
  fonts: FontChoices;
}) {
  return (
    <section
      className={`pp-hero layout-${heroLayout}`}
      style={{ ["--hero-fit" as string]: heroFit }}
    >
      {heroLayout === "image" ? (
        /* Image-only: no visible hero text. The headline stays in the DOM,
           visually hidden — a page with no h1 reads as untitled to search
           engines and announces nothing to a screen reader. */
        <h1 className="pp-visually-hidden">
          {hero.title} {hero.titleScript}
        </h1>
      ) : (
      <div className="pp-hero-copy">
        <span className="pp-hero-eye">
          <span style={fontStyle(fonts, "heroEyebrow")}>{hero.eyebrow}</span>{" "}
          <span className="pp-script" style={fontStyle(fonts, "heroEyebrowScript")}>
            {hero.eyebrowScript}
          </span>
        </span>
        <h1 className="pp-h1">
          <span style={fontStyle(fonts, "heroTitle")}>{hero.title}</span>
          <span className="pp-script" style={fontStyle(fonts, "heroTitleScript")}>
            {hero.titleScript}
          </span>
        </h1>
        <p className="pp-lede" style={fontStyle(fonts, "heroLede")}>{hero.lede}</p>
        <div>
          <button className="pp-btn" style={fontStyle(fonts, "heroCta")} onClick={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}>
            {hero.cta}
          </button>
        </div>
      </div>
      )}
      <div className={`pp-hero-art ${heroImageUrl ? "haspic" : ""}`}>
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImageUrl} alt="" className="pp-photo" />
        ) : (
          <StrandArt
            category="Necklaces"
            colors={["#E4573B", "#E7789A", "#3E9DB0", "#E9C85A", "#8FB98F", "#EBA9BE"]}
            charm="heart"
            size={230}
          />
        )}
        {!heroImageUrl && <span className="pp-tag-note">Your photo or collage goes here</span>}
      </div>
    </section>
  );
}
