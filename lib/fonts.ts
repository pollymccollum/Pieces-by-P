// Fonts the owner can pick from in the site editor.
//
// Deliberately a curated list rather than "any font". Every family here is
// downloaded and self-hosted by next/font at build time, so the list is also
// the page-weight budget — adding fonts costs every visitor. Weights are
// kept minimal for the same reason.
//
// The default for every field is INHERIT: the field keeps whatever the
// design gives it. Nothing changes until she deliberately picks something,
// so the shop can't drift into a mess of mismatched type on its own.

export const FONT_INHERIT = "inherit";

export type FontKey =
  | typeof FONT_INHERIT
  | "aegean"
  | "calgary"
  | "versailles"
  | "sunborn"
  | "newicon";

export type FontOption = {
  key: FontKey;
  label: string;
  // CSS value. Inherit is handled separately (no style applied at all).
  css: string;
  // Grouping in the picker, so she isn't scrolling one flat list.
  group: "Match the design" | "Display serif" | "Elegant caps" | "Bold" | "Script";
};

export const FONTS: FontOption[] = [
  { key: FONT_INHERIT, label: "Match the design", css: "", group: "Match the design" },

  // Stand-ins for the owner's chosen Canva faces. Those are commercial
  // retail typefaces whose Canva licence does not cover embedding on a
  // website, so each is matched to the closest free Google Font. The label
  // names both, honestly: the substitute first, her font in brackets.
  {
    key: "aegean",
    label: "Bodoni Moda (like Tan Aegean)",
    css: "var(--font-bodoni), Didot, Georgia, serif",
    group: "Display serif",
  },
  {
    key: "calgary",
    label: "Cormorant Garamond (like Calgary)",
    css: "var(--font-cormorant), Garamond, serif",
    group: "Elegant caps",
  },
  {
    key: "versailles",
    label: "Marcellus (like Versailles)",
    css: "var(--font-marcellus), Georgia, serif",
    group: "Elegant caps",
  },
  {
    key: "sunborn",
    label: "Archivo Black (like Sunborn)",
    css: "var(--font-archivo), Impact, sans-serif",
    group: "Bold",
  },
  {
    key: "newicon",
    label: "Pinyon Script (like New Icon Script)",
    css: "var(--font-pinyon), cursive",
    group: "Script",
  },
];

const BY_KEY = new Map(FONTS.map((f) => [f.key, f]));

// Every piece of text the owner can restyle. Keys are stored in site
// settings; adding one here plus a picker in the editor is all it takes.
export const FONT_SLOTS = [
  "brand",
  "announce",
  "heroEyebrow",
  "heroEyebrowScript",
  "heroTitle",
  "heroTitleScript",
  "heroLede",
  "heroCta",
  "aboutEyebrowScript",
  "aboutTitle",
  "aboutBody",
  "contactHeading",
] as const;

export type FontSlot = (typeof FONT_SLOTS)[number];

export type FontChoices = Partial<Record<FontSlot, FontKey>>;

// Returns a style object for a slot, or undefined when the field should keep
// the design's own font. Undefined rather than an empty object so React adds
// no style attribute at all.
export function fontStyle(
  choices: FontChoices | undefined,
  slot: FontSlot
): React.CSSProperties | undefined {
  const key = choices?.[slot];
  if (!key || key === FONT_INHERIT) return undefined;
  const css = BY_KEY.get(key)?.css;
  return css ? { fontFamily: css } : undefined;
}

// Merges a slot's font with styles the component already sets.
export function withFont(
  choices: FontChoices | undefined,
  slot: FontSlot,
  base?: React.CSSProperties
): React.CSSProperties | undefined {
  const f = fontStyle(choices, slot);
  if (!f) return base;
  return { ...base, ...f };
}

// What the design itself uses for each field. Lets the editor preview
// "Match the design" accurately instead of guessing, so she can compare a
// candidate against what's actually on the page right now.
const DESIGN_FONT: Record<FontSlot, string> = {
  brand: "var(--font-fraunces), Georgia, serif",
  announce: "var(--font-poppins), system-ui, sans-serif",
  heroEyebrow: "var(--font-poppins), system-ui, sans-serif",
  heroEyebrowScript: "var(--font-dancing), cursive",
  heroTitle: "var(--font-fraunces), Georgia, serif",
  heroTitleScript: "var(--font-dancing), cursive",
  heroLede: "var(--font-poppins), system-ui, sans-serif",
  heroCta: "var(--font-poppins), system-ui, sans-serif",
  aboutEyebrowScript: "var(--font-dancing), cursive",
  aboutTitle: "var(--font-fraunces), Georgia, serif",
  aboutBody: "var(--font-poppins), system-ui, sans-serif",
  contactHeading: "var(--font-fraunces), Georgia, serif",
};


// Font CSS for one option, for rendering the dropdown entries in their own face.
export function fontCssFor(key: FontKey, slot: FontSlot): string {
  if (key === FONT_INHERIT) return DESIGN_FONT[slot];
  return BY_KEY.get(key)?.css ?? DESIGN_FONT[slot];
}
