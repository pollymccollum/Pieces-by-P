import type { Metadata } from "next";
import { Fraunces, Poppins, Dancing_Script } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/data";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-poppins",
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-dancing",
});

// Built from site settings rather than hardcoded, so the shop name and town
// shown in search results and link previews follow whatever the owner has in
// her admin. A hardcoded description silently goes stale the moment she edits
// her details — and search engines would keep showing the old town.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const where = settings.contact.location;

  return {
    title: `${settings.brand} | Handmade beaded jewelry`,
    description: `Handmade beaded necklaces, bracelets, chokers, and charms, made to order${
      where ? ` in ${where}` : ""
    }.`,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${poppins.variable} ${dancingScript.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
