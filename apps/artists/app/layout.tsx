import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import { CcdBanner } from "@ccd/banner";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import OpenFromRef from "@/components/OpenFromRef";
import { getMember, firstName } from "@/lib/auth";
import { NAME, PRODUCT, siteUrl } from "@/lib/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700", "800"], axes: ["opsz"], variable: "--font-bricolage", display: "swap" });
const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${NAME}: artist pages, booking and tour dates`, template: `%s | ${NAME}` },
  description: `${PRODUCT.promise} Sourced pages for South Asian electronic artists, with real previews, upcoming dates and booking in two messages.`,
  applicationName: NAME,
  openGraph: { siteName: NAME, type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const member = await getMember();
  return (
    <html lang="en" className={`${bricolage.variable} ${geist.variable}`}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <CcdBanner current="artists" account={{ signedIn: !!member, href: member ? "/bookings" : "/sign-in", name: firstName(member) }} />
        <Nav member={member} />
        <div className="min-h-[60vh]">{children}</div>
        <Footer />
        <OpenFromRef />
        <script defer src="/_vercel/insights/script.js" />
      </body>
    </html>
  );
}
