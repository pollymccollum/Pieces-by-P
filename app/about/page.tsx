import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/data";
import { SiteChrome } from "@/components/storefront/SiteChrome";
import { AboutPage } from "@/components/storefront/AboutPage";

// Same reasoning as the shop page: her wording and photo come from the
// database, so an edit in /admin shows up immediately rather than at the
// next deploy.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `About · ${settings.brand}`,
    description: settings.about.body.slice(0, 155),
  };
}

export default async function About() {
  const settings = await getSiteSettings();

  return (
    <SiteChrome settings={settings}>
      <AboutPage
        about={settings.about}
        fonts={settings.fonts}
        imageUrl={settings.aboutImageUrl}
      />
    </SiteChrome>
  );
}
