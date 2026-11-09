import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Outfit, JetBrains_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import OpenFromRef from "@/components/OpenFromRef";
import { getMember } from "@/lib/auth";
import { NAME, PRODUCT, siteUrl } from "@/lib/site";
import "./globals.css";

// The suite type: Bricolage for display, Outfit for UI, JetBrains Mono for data labels only.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz"], variable: "--font-bricolage", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${NAME}: every artist, and everything they put out`, template: `%s | ${NAME}` },
  description: `${PRODUCT.promise} South Asian electronic artists: their music, merch, next shows and booking.`,
  applicationName: NAME,
  openGraph: { siteName: NAME, type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#0a0a0b", colorScheme: "dark", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const member = await getMember();
  return (
    <html lang="en" className={`${bricolage.variable} ${outfit.variable} ${mono.variable}`} style={{ ["--k-pc" as string]: PRODUCT.colour }}>
      <body className="k-root min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
        <Nav member={member} />
        <div id="main" className="min-h-[60vh]">{children}</div>
        <Footer />
        <OpenFromRef />
        <script defer src="/_vercel/insights/script.js" />
      </body>
    </html>
  );
}
