import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Outfit, JetBrains_Mono } from "next/font/google";
import { SuiteNav, SuiteFooter, SUITE_LINKS } from "@ccd/ui";
import { PRODUCTS } from "@ccd/brand";
import { getMember } from "@/lib/supabase/server";
import SessionKeeper from "@/components/SessionKeeper";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz"], variable: "--font-bricolage", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono", display: "swap" });
const P = PRODUCTS.gate;

export const metadata: Metadata = {
  title: { default: `${P.name}: throw a party, run it from one app`, template: `%s | ${P.name}` },
  description: P.promise,
  applicationName: P.name,
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#0a0a0b", colorScheme: "dark", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { member } = await getMember().catch(() => ({ member: null }));
  return (
    <html lang="en" className={`${bricolage.variable} ${outfit.variable} ${mono.variable}`} style={{ ["--k-pc" as string]: P.colour }}>
      <body className="k-root">
        <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
        <SuiteNav current="gate" account={member ? { href: "/parties", label: member.display_name?.split(" ")[0] || "Your parties" } : { href: "/sign-in", label: "Sign in" }} cta={{ href: "/make", label: "Make a party" }}
          sub={[{ href: "/parties", label: "Your parties" }, { href: "/guests", label: "Guests" }, { href: "/door", label: "The door" }, { href: "/book", label: "Book artists" }, { href: "/gear", label: "Gear" }]} />
        <div id="main" className="min-h-[60vh]">{children}</div>
        <SuiteFooter current="gate" links={SUITE_LINKS} />
        <SessionKeeper />
      </body>
    </html>
  );
}
