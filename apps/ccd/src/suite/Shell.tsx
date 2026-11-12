/**
 * The suite shell for Nights pages that are on the new look (DESIGN.md): fonts, the shared nav and
 * footer, the dark base and the Nights blue. Pages still on the live look keep their own Nav.
 */
import type { ReactNode } from "react";
import Head from "next/head";
import { Bricolage_Grotesque, Outfit, JetBrains_Mono } from "next/font/google";
import { SuiteNav, SuiteFooter, SUITE_LINKS } from "@ccd/ui";
import { PRODUCTS } from "@ccd/brand";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz"], variable: "--font-bricolage", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono", display: "swap" });

export default function Shell({ title, description, children, nav }: { title: string; description: string; children: ReactNode; nav?: ReactNode }) {
  return (
    <div className={`k-root ${bricolage.variable} ${outfit.variable} ${mono.variable}`} style={{ ["--k-pc" as string]: PRODUCTS.ccd.colour, minHeight: "100vh", fontFamily: "var(--k-ui)" }}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="theme-color" content="#0a0a0b" />
      </Head>
      {nav ?? <SuiteNav current="ccd" account={{ href: "/me", label: "Your account" }} cta={{ href: "/whats-on", label: "See this week" }}
        sub={[{ href: "/whats-on", label: "What's on" }, { href: "/nights", label: "Our Episodes" }, { href: "/me", label: "Your account" }]} />}
      <main id="main">{children}</main>
      <SuiteFooter current="ccd" links={SUITE_LINKS} />
    </div>
  );
}
