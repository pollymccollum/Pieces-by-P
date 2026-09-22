"use client";

import {
  HERO_MOBILE_CROPS,
  type HeroContent,
  type HeroLayout,
  type HeroMobileCrop,
  type PhotoFit,
} from "@/lib/types";
import { fontStyle, type FontChoices } from "@/lib/fonts";
import { StrandArt } from "./visuals";

export function Hero({
  hero,
  heroImageUrl,
  heroImageMobileUrl,
  heroLayout,
  heroFit,
  heroMobileCrop,
  fonts,
}: {
  hero: HeroContent;
  heroImageUrl: string | null;
  heroImageMobileUrl: string | null;
  heroLayout: HeroLayout;
  heroFit: PhotoFit;
  heroMobileCrop: HeroMobileCrop;
  fonts: FontChoices;
}) {
  return (
    <section
      className={`pp-hero layout-${heroLayout}`}
      style={{
        ["--hero-fit" as string]: heroFit,
        // Left unset for "show all of it", which is the point: the CSS
        // falls back to `auto`, and the picture keeps its own shape.
        ...(HERO_MOBILE_CROPS[heroMobileCrop].ratio
          ? { ["--hero-mcrop" as string]: HERO_MOBILE_CROPS[heroMobileCrop].ratio }
          : {}),
      }}
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
          // <picture> rather than a JS width check: the browser picks the
          // source before it fetches anything, so a phone never downloads
          // the desktop collage, and there is no flash of the wrong one.
          //
          // With no phone image the <source> isn't rendered at all and this
          // is exactly the single <img> it has always been.
          <picture>
            {heroImageMobileUrl && (
              <source media="(max-width: 640px)" srcSet={heroImageMobileUrl} />
            )}
            <img src={heroImageUrl} alt="" className="pp-photo" />
          </picture>
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
