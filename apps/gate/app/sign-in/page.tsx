import type { Metadata } from "next";
import SignIn from "@/components/SignIn";
import { HostApp, Top } from "@/components/app/ui";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/parties";
  return (
    <HostApp dock={false}>
      <Top back="/" right="No password" />
      <div style={{ padding: "4px 20px 0" }}>
        <div className="rise" style={{ borderRadius: 22, background: "var(--pc)", color: "var(--pi)", padding: "22px 18px", position: "relative", overflow: "hidden" }}>
          <img src="/cats/yellow.webp" alt="" style={{ position: "absolute", right: -6, bottom: -10, height: 120, animation: "bob 3.2s ease-in-out infinite" }} />
          <h1 className="d" style={{ fontSize: 36, color: "var(--pi)", maxWidth: 230, margin: 0 }}>One link, every product.</h1>
          <div style={{ fontSize: 14, opacity: 0.75, marginTop: 6, maxWidth: 220 }}>We email you a link. It signs you in on Host, Nights and Artists at once.</div>
        </div>
        {sp.error && <p className="err" role="alert">That link did not work. Ask for a new one.</p>}
        <div style={{ marginTop: 20 }}><SignIn next={next} /></div>
      </div>
    </HostApp>
  );
}
