import {
  ACCENTS,
  GRID_SIZES,
  HERO_SIZES,
  PHOTO_SHAPES,
  type SiteSettingsData,
} from "@/lib/types";

// The owner's appearance settings as CSS custom properties for the storefront
// root. globals.css reads these with the original design as fallbacks, so an
// unsaved or partial settings row still renders correctly.
//
// Lives here rather than inside the homepage component because About and
// Contact are their own routes now and have to look like the same shop.
export function storefrontStyle(settings: SiteSettingsData): React.CSSProperties {
  const grid = GRID_SIZES[settings.gridSize] ?? GRID_SIZES.medium;
  const hero = HERO_SIZES[settings.heroSize] ?? HERO_SIZES.medium;
  const shape = PHOTO_SHAPES[settings.photoShape] ?? PHOTO_SHAPES.square;
  const accent = ACCENTS[settings.accent] ?? ACCENTS.coral;

  return {
    "--coral": accent.hex,
    "--tile-ratio": shape.ratio,
    "--photo-fit": settings.photoFit === "contain" ? "contain" : "cover",
    "--cols-sm": grid.cols[0],
    "--cols-md": grid.cols[1],
    "--cols-lg": grid.cols[2],
    "--hero-h-sm": hero.heights[0],
    "--hero-h-lg": hero.heights[1],
  } as React.CSSProperties;
}
