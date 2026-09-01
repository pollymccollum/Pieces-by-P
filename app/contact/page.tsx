import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/data";
import { SiteChrome } from "@/components/storefront/SiteChrome";
import { ContactPage } from "@/components/storefront/ContactPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Contact · ${settings.brand}`,
    description: `Get in touch with ${settings.brand} — custom orders, questions, and hellos.`,
  };
}

export default async function Contact() {
  const settings = await getSiteSettings();

  return (
    <SiteChrome settings={settings}>
      <ContactPage contact={settings.contact} fonts={settings.fonts} />
    </SiteChrome>
  );
}
