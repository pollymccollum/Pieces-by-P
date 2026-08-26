import type { Metadata } from "next";
import {
  Fraunces,
  Poppins,
  Dancing_Script,
  Playfair_Display,
  Lora,
  Montserrat,
  Cormorant_Garamond,
  Caveat,
  Bebas_Neue,
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

// Optional families the owner can pick per field in the site editor.
// Weights are kept to the minimum each face actually needs — every one of
// these is downloaded by visitors, so the list is a page-weight budget.
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-playfair" });
const lora = Lora({ subsets: ["latin"], weight: ["400"], variable: "--font-lora" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-montserrat" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-cormorant" });
const caveat = Caveat({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-caveat" });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--font-bebas" });

const FONT_VARS = [
  playfair.variable,
  lora.variable,
  montserrat.variable,
  cormorant.variable,
  caveat.variable,
  bebas.variable,
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
