/**
 * A promoter's night on CCD (/nights/<slug> when events.promoter_id is set). Their colour, logo and name on top,
 * then the same parts our own nights have: tickets (free on CCD, or their ticket link), the free list, going and crews,
 * calendar, directions and share. The CCD frame (nav, footer, type, borders) stays the same.
 */
import { useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Going from "@/components/going/Going";
import RsvpDialog from "@/components/RsvpDialog";
import { accentOf, promoterPath, type Accent } from "@/lib/promoters";
import { directionsUrl, displayTime, todayIST } from "@/lib/nights";
import { shareCard } from "@/lib/share";

export type PromoterNightProps = {
  night: {
    slug: string; title: string; date: string | null; event_date: string | null; start_time: string | null; venue: string | null; city: string | null;
    blurb: string | null; lineup: string[] | null; genres: string[] | null; poster_url: string | null; ticket_url: string | null; rsvp_open: boolean | null; capacity: number | null;
  };
  promoter: { slug: string; name: string; accent: Accent; logo_url: string | null; tagline: string | null; instagram: string | null };
  hasTiers: boolean;
};

const SITE = "https://catscandance.com";

export default function PromoterNight({ night: n, promoter: p, hasTiers }: PromoterNightProps) {
  const a = accentOf(p.accent);
  const [copied, setCopied] = useState(false);
  const [rsvp, setRsvp] = useState(false);
  const past = !!n.event_date && n.event_date < todayIST();
  const time = displayTime(n.start_time);
  const dir = directionsUrl(n.venue, n.city);
  const desc = [n.date, n.venue, n.city].filter(Boolean).join(", ") + `. ${p.name} on Cats Can Dance.`;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "MusicEvent", name: n.title, startDate: n.event_date ?? undefined, eventStatus: "https://schema.org/EventScheduled",
    location: n.venue ? { "@type": "Place", name: n.venue, address: n.city ?? undefined } : undefined,
    organizer: { "@type": "Organization", name: p.name, url: `${SITE}${promoterPath(p.slug)}` },
    performer: (n.lineup ?? []).map((name) => ({ "@type": "MusicGroup", name })),
    image: n.poster_url ?? undefined, url: `${SITE}/nights/${n.slug}`,
    offers: hasTiers ? { "@type": "Offer", price: 0, priceCurrency: "INR", url: `${SITE}/tickets/${n.slug}`, availability: "https://schema.org/InStock" } : undefined,
  };
  const share = async () => {
    const r = await shareCard({ kind: "night", target: n.slug, path: `/nights/${n.slug}`, text: `${n.title}, ${[n.date, n.venue].filter(Boolean).join(", ")}.` });
    if (r === "copied") { setCopied(true); setTimeout(() => setCopied(false), 1600); }
  };

  return (
    <main className="bg-cream text-ink min-h-screen">
      <SEO title={`${n.title} | ${p.name}`} description={desc} path={`/nights/${n.slug}`} image={n.poster_url ?? undefined} jsonLd={[jsonLd]} />
      <Nav />
      <section className={`${a.bg} ${a.on} border-b-4 border-ink pt-28 pb-10`}>
        <div className="container max-w-5xl grid gap-8 md:grid-cols-[1.2fr_1fr] items-start">
          <div>
            <Link href={promoterPath(p.slug)} className="inline-flex items-center gap-3 font-bold hover:underline">
              {p.logo_url && <img src={p.logo_url} alt="" className="w-12 h-12 object-cover border-4 border-ink bg-cream" />}
              <span>{p.name} presents</span>
            </Link>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.92] mt-4 break-words">{n.title}</h1>
            <p className="mt-4 text-xl font-bold">{[n.date, time].filter(Boolean).join(" · ")}</p>
            <p className="text-lg">{[n.venue, n.city].filter(Boolean).join(", ")}</p>
            {!past && (
              <div className="mt-6 flex flex-wrap gap-3">
                {hasTiers && <Link href={`/tickets/${n.slug}`} className="font-display text-xl px-6 py-3 bg-acid-yellow text-ink border-4 border-ink shadow-[6px_6px_0_0_hsl(var(--ink))]">Get tickets · Free</Link>}
                {!hasTiers && n.ticket_url && <a href={n.ticket_url} target="_blank" rel="noopener noreferrer" className="font-display text-xl px-6 py-3 bg-acid-yellow text-ink border-4 border-ink shadow-[6px_6px_0_0_hsl(var(--ink))]">Tickets ↗</a>}
                {n.rsvp_open && <button type="button" onClick={() => setRsvp(true)} className="font-display text-xl px-6 py-3 bg-cream text-ink border-4 border-ink">Put my name down</button>}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
              {!past && <a href={`/api/ics/${n.slug}`} className="px-3 py-2 border-4 border-ink bg-cream text-ink">Add to calendar</a>}
              <button type="button" onClick={share} className="px-3 py-2 border-4 border-ink bg-cream text-ink">{copied ? "Link copied" : "Share"}</button>
              {dir && <a href={dir} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border-4 border-ink bg-cream text-ink">Directions</a>}
            </div>
          </div>
          {n.poster_url && <img src={n.poster_url} alt={`${n.title} poster`} className="w-full border-4 border-ink shadow-[8px_8px_0_0_hsl(var(--ink))] bg-cream" />}
        </div>
      </section>

      <section className="container max-w-5xl py-12 grid gap-10 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-8">
          {n.blurb && (
            <div>
              <h2 className="font-display text-3xl leading-none">The night</h2>
              <p className="mt-3 text-lg whitespace-pre-line">{n.blurb}</p>
            </div>
          )}
          {(n.lineup ?? []).length > 0 && (
            <div>
              <h2 className="font-display text-3xl leading-none">Lineup</h2>
              <ul className="mt-3 flex flex-wrap gap-2">{(n.lineup ?? []).map((x) => <li key={x} className="font-display text-xl px-3 py-1.5 border-4 border-ink bg-white">{x}</li>)}</ul>
            </div>
          )}
          {(n.genres ?? []).length > 0 && <p className="text-sm">{(n.genres ?? []).map((g) => <span key={g} className="inline-block mr-2 mb-2 px-2 py-0.5 border-2 border-ink font-bold">{g}</span>)}</p>}
        </div>
        <aside className="space-y-6">
          {!past && (
            <div className="border-4 border-ink bg-white p-4">
              <h2 className="font-display text-2xl leading-none">Who&apos;s going</h2>
              <p className="text-sm text-ink/70 mt-1">Going solo? Say you&apos;re going and join a crew of 3 to 6 people from your city.</p>
              <div className="mt-3"><Going nightKey={n.slug} title={n.title} variant="card" /></div>
            </div>
          )}
          <div className="border-4 border-ink bg-white p-4">
            <p className="text-sm text-ink/70">This night is run by</p>
            <Link href={promoterPath(p.slug)} className="font-display text-2xl leading-tight hover:underline">{p.name}</Link>
            {p.tagline && <p className="text-sm mt-1">{p.tagline}</p>}
            <p className="text-xs text-ink/60 mt-3">Listed on Cats Can Dance after a check by the CCD team. Questions about the night go to the promoter{p.instagram ? ` (${p.instagram})` : ""}.</p>
          </div>
        </aside>
      </section>
      {rsvp && <RsvpDialog open={rsvp} onOpenChange={setRsvp} eventSlug={n.slug} eventTitle={n.title} />}
      <Footer />
    </main>
  );
}
