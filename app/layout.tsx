import type { Metadata } from "next";
import { Fraunces, Poppins, Dancing_Script } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Pieces by P | Handmade beaded jewelry",
  description:
    "Handmade beaded necklaces, bracelets, chokers, and charms, made to order in Anderson, South Carolina.",
};

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
