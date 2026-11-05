/**
 * /promote: run your night on CCD. What a promoter gets, the application, and the promoters you already run.
 * Free for now. Later: 10% of paid ticket sales only (Param, 5 Nov 2026).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import SignInGate from "@/components/SignInGate";
import { useMember } from "@/lib/member";
import { accentOf, apply, myPromoters, type MyPromoter } from "@/lib/promoters";

const WHAT = [
  ["Your night page", "On catscandance.com, in your colour, with your logo, lineup, poster and venue."],
  ["Free tickets and a free list", "Guests get a QR ticket. Paid nights use your own ticket link for now."],
  ["Going and crews", "People say they are going, and solo goers get matched into crews of 3 to 6."],
  ["The door", "Scan QR tickets, search names, add walk-ins, pass-outs, a live count for the venue."],
  ["The report", "Turnout, no-shows, busiest 15 minutes and who came back, after every night."],
  ["On What's on", "Approved nights show in the gig guide next to everything else we rate."],
];

const inp = "w-full border-4 border-ink bg-white p-3";

function Apply({ onDone }: { onDone: (slug: string) => void }) {
  const [f, setF] = useState({ name: "", city: "", instagram: "", website: "", blurb: "", genres: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-3 border-4 border-ink bg-cream p-5 chunk-shadow" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr("");
      const r = await apply({ ...f, genres: f.genres.split(",").map((s) => s.trim()).filter(Boolean) });
      setBusy(false);
      if (r.ok) onDone((r.data as any).slug); else setErr(r.error ?? "Could not send.");
    }}>
      <h2 className="font-display text-3xl leading-none">Apply</h2>
      <p className="text-ink/75 text-sm">We look at your past nights and get back to you, usually within a couple of days.</p>
      <input className={inp} required placeholder="Promoter or crew name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} />
      <input className={inp} required placeholder="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
      <input className={inp} placeholder="Instagram, e.g. @yourcrew" value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} autoCapitalize="none" />
      <input className={inp} placeholder="Website (optional)" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} autoCapitalize="none" />
      <input className={inp} placeholder="Sounds, comma separated, e.g. house, disco" value={f.genres} onChange={(e) => setF({ ...f, genres: e.target.value })} />
      <textarea className={inp} rows={4} placeholder="Who you are and what nights you throw" value={f.blurb} onChange={(e) => setF({ ...f, blurb: e.target.value })} maxLength={600} />
      {err && <p className="font-bold text-magenta">{err}</p>}
      <button disabled={busy} className="font-display text-xl px-6 py-3 bg-acid-yellow border-4 border-ink disabled:opacity-60">{busy ? "Sending…" : "Send application"}</button>
    </form>
  );
}

function Mine() {
  const router = useRouter();
  const [rows, setRows] = useState<MyPromoter[] | null>(null);
  useEffect(() => { myPromoters().then(setRows); }, []);
  if (!rows) return <p className="text-ink/70">Loading…</p>;
  return (
    <div className="space-y-6">
      {rows.length > 0 && (
        <div>
          <h2 className="font-display text-3xl leading-none">Yours</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {rows.map((p) => {
              const a = accentOf(p.accent);
              return (
                <li key={p.slug}>
                  <Link href={`/promote/${p.slug}`} className={`block border-4 border-ink ${a.bg} ${a.on} p-4 chunk-shadow hover:-translate-y-0.5 transition-transform`}>
                    <p className="text-xs font-bold uppercase tracking-wide">{p.status === "approved" ? "Approved" : p.status === "pending" ? "Waiting for CCD" : "Not approved"}</p>
                    <p className="font-display text-2xl leading-tight mt-1">{p.name}</p>
                    <p className="text-sm mt-1">{p.city} · {p.nights} night{p.nights === 1 ? "" : "s"}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <Apply onDone={(slug) => router.push(`/promote/${slug}`)} />
    </div>
  );
}

export default function PromotePage() {
  const { signedIn } = useMember();
  return (
    <main className="bg-cream text-ink min-h-screen">
      <SEO title="Run your night on CCD | Cats Can Dance" description="Promoters can run their nights on Cats Can Dance: a night page in their own look, free tickets, going and crews, the door and a report. Free for now." path="/promote" />
      <Nav />
      <section className="bg-ink text-cream border-b-4 border-ink pt-28 pb-12">
        <div className="container max-w-5xl">
          <p className="font-display text-acid-yellow text-lg">FOR PROMOTERS</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.9] mt-2">Run your night on CCD.</h1>
          <p className="mt-4 text-lg md:text-xl text-cream/85 max-w-2xl">The same tools we use for our own Episodes: a night page, tickets, going and crews, and the door. Free for now. Anyone can apply; we check every promoter and every night before it goes up.</p>
        </div>
      </section>
      <section className="container max-w-5xl py-12 grid gap-10 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="font-display text-3xl leading-none">What you get</h2>
          <ul className="mt-4 space-y-3">
            {WHAT.map(([t, d]) => (
              <li key={t} className="border-4 border-ink bg-white p-4">
                <p className="font-display text-lg leading-tight">{t}</p>
                <p className="text-ink/75 text-sm mt-1">{d}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-4 border-ink bg-acid-yellow p-4">
            <p className="font-display text-lg leading-tight">What it costs</p>
            <p className="text-sm mt-1">Nothing. When paid tickets come to CCD, we will take 10% of paid ticket sales. Free tickets, the free list and the door stay free. We will tell you before anything changes.</p>
          </div>
          <p className="mt-6 text-sm text-ink/70">How it works: apply, we approve you, you build a night, we approve the night, it goes live. Your team and your door staff sign in with their own email.</p>
        </div>
        <div>
          <SignInGate next="/promote" title="Sign in to apply" line="Use the email you want to run your promoter account with. We'll send a link.">
            <Mine />
          </SignInGate>
          {!signedIn && <p className="mt-4 text-sm text-ink/70">Already applied? Sign in and your promoters show up here.</p>}
        </div>
      </section>
      <Footer />
    </main>
  );
}
