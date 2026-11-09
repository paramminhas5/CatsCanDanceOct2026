/**
 * The artist side of the app (boards F38-A-Today, Shows, Bookings, Contract, Fans, Page), one phone-width
 * app with the five-tab dock. Signed-out visitors get one clear way in.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getMember, firstName } from "@/lib/auth";
import ArtistApp from "@/components/app/ArtistApp";

export const metadata: Metadata = { title: "Your page", robots: { index: false, follow: false } };

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const member = await getMember();
  if (!member) {
    return (
      <ArtistApp dock={false}>
        <div className="rise" style={{ marginTop: 6, borderRadius: 22, background: "var(--pc)", color: "var(--pi)", padding: "24px 18px", position: "relative", overflow: "hidden" }}>
          <img src="/cats/lime.webp" alt="" style={{ position: "absolute", right: -6, bottom: -10, height: 130, animation: "bob 3.2s ease-in-out infinite" }} />
          <h1 className="d" style={{ fontSize: 36, color: "var(--pi)", maxWidth: 250, margin: 0 }}>Run your career from here.</h1>
          <div style={{ fontSize: 14, opacity: 0.75, marginTop: 8, maxWidth: 230 }}>Sign in with the email on your page to answer bookings, post a tour and see your fans.</div>
          <div className="row" style={{ gap: 8, marginTop: 16 }}>
            <Link href="/sign-in?next=/me" className="pill lg" style={{ background: "#0A0A0A", color: "var(--pc)", boxShadow: "none" }}>Sign in</Link>
            <Link href="/claim" className="pill lg" style={{ background: "rgba(0,0,0,.12)", color: "#0A0A0A", boxShadow: "none" }}>Claim your page</Link>
          </div>
        </div>
      </ArtistApp>
    );
  }
  return <ArtistApp initial={(firstName(member) ?? "?").charAt(0).toUpperCase()}>{children}</ArtistApp>;
}
