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
  | "serif"
  | "sans"
  | "script"
  | "playfair"
  | "lora"
  | "montserrat"
  | "cormorant"
  | "caveat"
  | "bebas";

export type FontOption = {
  key: FontKey;
  label: string;
  // CSS value. Inherit is handled separately (no style applied at all).
  css: string;
  // Grouping in the picker, so she isn't scrolling one flat list.
  group: "Match the design" | "Serif" | "Sans serif" | "Handwritten" | "Display";
};

export const FONTS: FontOption[] = [
  { key: FONT_INHERIT, label: "Match the design", css: "", group: "Match the design" },

  { key: "serif", label: "Fraunces (the shop's headings)", css: "var(--font-fraunces), Georgia, serif", group: "Serif" },
  { key: "playfair", label: "Playfair Display", css: "var(--font-playfair), Georgia, serif", group: "Serif" },
  { key: "lora", label: "Lora", css: "var(--font-lora), Georgia, serif", group: "Serif" },
  { key: "cormorant", label: "Cormorant Garamond", css: "var(--font-cormorant), Garamond, serif", group: "Serif" },

  { key: "sans", label: "Poppins (the shop's body text)", css: "var(--font-poppins), system-ui, sans-serif", group: "Sans serif" },
  { key: "montserrat", label: "Montserrat", css: "var(--font-montserrat), system-ui, sans-serif", group: "Sans serif" },

  { key: "script", label: "Dancing Script (the shop's handwriting)", css: "var(--font-dancing), cursive", group: "Handwritten" },
  { key: "caveat", label: "Caveat", css: "var(--font-caveat), cursive", group: "Handwritten" },

  { key: "bebas", label: "Bebas Neue", css: "var(--font-bebas), Impact, sans-serif", group: "Display" },
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
