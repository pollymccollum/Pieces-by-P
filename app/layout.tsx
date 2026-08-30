import type { Metadata } from "next";
import {
  Fraunces,
  Poppins,
  Dancing_Script,
  Bodoni_Moda,
  Cormorant_Garamond,
  Marcellus,
  Archivo_Black,
  Pinyon_Script,
} from "next/font/google";
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

// The five faces the owner can pick per field in the site editor. Each is
// the closest free stand-in for one of the commercial Canva fonts in her
// design, which cannot be embedded on a website under Canva's licence.
// Weights are minimal — every one of these is downloaded by visitors.
const bodoni = Bodoni_Moda({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-bodoni" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-cormorant" });
const marcellus = Marcellus({ subsets: ["latin"], weight: ["400"], variable: "--font-marcellus" });
const archivo = Archivo_Black({ subsets: ["latin"], weight: ["400"], variable: "--font-archivo" });
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: ["400"], variable: "--font-pinyon" });

const FONT_VARS = [
  bodoni.variable,
  cormorant.variable,
  marcellus.variable,
  archivo.variable,
  pinyon.variable,
].join(" ");

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
      className={`${fraunces.variable} ${poppins.variable} ${dancingScript.variable} ${FONT_VARS}`}
    >
      <body>{children}</body>
    </html>
  );
}
