/**
 * A genre-in-a-city page built from real listings: "Techno in Bengaluru", "House in Bengaluru".
 * Upcoming nights come from What's on (published scene nights) and promoter nights on CCD, rendered on the server
 * with MusicEvent structured data, so the page has something true to rank for. Replaces the old hand-written SceneHub copy.
 */
import type { GetStaticProps } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getSceneEvents, select, type SceneBoardEvent } from "@/lib/ccd-db";
import { todayIST } from "@/lib/nights";
import { tidyTitle } from "@/lib/find";

/** "Sat 14 Nov". A fixed date, not "tonight", because the page is cached for half an hour. */
const day = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "Date TBA");

const SITE = "https://catscandance.com";

export type HubConfig = {
  path: string; city: string; cityMatch: RegExp; genre: string; genreMatch: RegExp; genreSlug: string;
  title: string; h1: string; description: string; intro: string;
};
type Night = { id: string; title: string; href: string; external: boolean; venue: string | null; city: string | null; event_date: string | null; time: string | null; lineup: string[]; by: string | null };
export type HubProps = { nights: Night[]; more: Night[]; updated: string };

const fromScene = (e: SceneBoardEvent): Night => ({
  id: e.id, title: tidyTitle(e.title), href: e.ticket_url || e.url, external: true, venue: e.venue, city: e.city,
  event_date: e.event_date, time: e.event_time, lineup: (e.lineup ?? []).slice(0, 6), by: null,
});

export function hubProps(cfg: HubConfig): GetStaticProps<HubProps> {
  return async () => {
    const today = todayIST();
    const [scene, pn] = await Promise.all([
      getSceneEvents(),
      select<any>(`events?published=is.true&event_date=gte.${today}&select=slug,title,venue,city,event_date,start_time,genres,lineup,promoter_id&order=event_date.asc&limit=60`, 600).catch(() => []),
    ]);
    const inCity = (c: string | null) => cfg.cityMatch.test(c ?? "");
    const isGenre = (genres: string[] | null, title: string, lineup?: string[] | null) =>
      (genres ?? []).some((g) => cfg.genreMatch.test(g)) || cfg.genreMatch.test(title);
    const ours: Night[] = pn.filter((e: any) => inCity(e.city) && !/^test-/.test(e.slug)).map((e: any) => ({
      id: e.slug, title: e.title, href: `/nights/${e.slug}`, external: false, venue: e.venue, city: e.city, event_date: e.event_date,
      time: e.start_time, lineup: (e.lineup ?? []).slice(0, 6), by: e.promoter_id ? null : "Cats Can Dance", genres: e.genres ?? [],
    }));
    const local = scene.filter((e) => inCity(e.city) && (e.event_date ?? "") >= today);
    const nights = [
      ...ours.filter((n: any) => isGenre(n.genres, n.title)),
      ...local.filter((e) => isGenre(e.genres, e.title, e.lineup)).map(fromScene),
    ].sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
    const ids = new Set(nights.map((n) => n.id));
    const more = [...ours, ...local.map(fromScene)].filter((n) => !ids.has(n.id))
      .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? "")).slice(0, 8);
    return { props: { nights: nights.map(({ genres, ...n }: any) => n), more: more.map(({ genres, ...n }: any) => n), updated: today }, revalidate: 1800 };
  };
}

function Row({ n }: { n: Night }) {
  const inner = (
    <>
      <span className="font-bold tabular-nums w-28 shrink-0">{day(n.event_date)}</span>
      <span className="flex-1 min-w-[200px]">
        <span className="font-display text-lg leading-tight block">{n.title}</span>
        {n.lineup.length > 0 && <span className="text-sm text-ink/70 block">{n.lineup.join(", ")}</span>}
      </span>
      <span className="text-sm text-ink/70">{[n.venue, n.time].filter(Boolean).join(" · ")}</span>
    </>
  );
  const cls = "flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 hover:text-electric-blue";
  return (
    <li className="border-b-2 border-ink/20">
      {n.external ? <a href={n.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a> : <Link href={n.href} className={cls}>{inner}</Link>}
    </li>
  );
}

export default function GenreCityHub({ cfg, nights, more, updated }: HubProps & { cfg: HubConfig }) {
  const ld = [
    {
      "@context": "https://schema.org", "@type": "ItemList", name: cfg.title, url: `${SITE}${cfg.path}`,
      itemListElement: nights.slice(0, 20).map((n, i) => ({
        "@type": "ListItem", position: i + 1,
        item: {
          "@type": "MusicEvent", name: n.title, startDate: n.event_date ?? undefined, eventStatus: "https://schema.org/EventScheduled",
          location: n.venue ? { "@type": "Place", name: n.venue, address: { "@type": "PostalAddress", addressLocality: n.city ?? cfg.city, addressCountry: "IN" } } : undefined,
          performer: n.lineup.map((name) => ({ "@type": "MusicGroup", name })),
          url: n.external ? n.href : `${SITE}${n.href}`,
        },
      })),
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [
        { "@type": "Question", name: `Where can I find ${cfg.genre.toLowerCase()} events in ${cfg.city}?`, acceptedAnswer: { "@type": "Answer", text: `This page lists the upcoming ${cfg.genre.toLowerCase()} nights in ${cfg.city} that are on What's on, the Cats Can Dance gig guide. Every night on it has a credible artist, act or promoter behind it. It updates every half hour.` } },
        { "@type": "Question", name: `How do I get into ${cfg.genre.toLowerCase()} nights in ${cfg.city}?`, acceptedAnswer: { "@type": "Answer", text: "Each listing links to the ticket or RSVP page. On Cats Can Dance you can also say you are going and, if you are going alone, join a small crew from your city." } },
      ],
    },
  ];
  return (
    <main className="bg-cream text-ink min-h-screen">
      <SEO title={cfg.title} description={cfg.description} path={cfg.path} jsonLd={ld} />
      <Nav />
      <section className="bg-ink text-cream border-b-4 border-ink pt-28 pb-10">
        <div className="container max-w-5xl">
          <p className="font-display text-acid-yellow text-lg">{cfg.city.toUpperCase()} · {cfg.genre.toUpperCase()}</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.9] mt-2">{cfg.h1}</h1>
          <p className="mt-4 text-lg text-cream/85 max-w-2xl">{cfg.intro}</p>
        </div>
      </section>
      <section className="container max-w-5xl pt-6"><Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "What's on", to: "/whats-on" }, { label: cfg.h1 }]} /></section>
      <section className="container max-w-5xl py-8 space-y-10">
        <div>
          <h2 className="font-display text-3xl leading-none">Coming up</h2>
          <p className="text-sm text-ink/70 mt-1">Updated {day(updated)}. {nights.length} {nights.length === 1 ? "night" : "nights"}.</p>
          {nights.length ? <ul className="mt-4 border-t-4 border-ink">{nights.map((n) => <Row key={n.id} n={n} />)}</ul>
            : <p className="mt-3">Nothing listed right now. New nights go up every week; see everything on <Link href="/whats-on" className="underline font-bold">What&apos;s on</Link>.</p>}
        </div>
        {more.length > 0 && (
          <div>
            <h2 className="font-display text-2xl leading-none">Other nights in {cfg.city}</h2>
            <ul className="mt-4 border-t-4 border-ink">{more.map((n) => <Row key={n.id} n={n} />)}</ul>
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-sm font-bold">
          <Link href="/whats-on" className="px-3 py-2 border-4 border-ink bg-white">Everything on What&apos;s on</Link>
          <Link href={`/scene/${cfg.city.toLowerCase()}`} className="px-3 py-2 border-4 border-ink bg-white">{cfg.city} guide</Link>
          <Link href={`/genres/${cfg.genreSlug}`} className="px-3 py-2 border-4 border-ink bg-white">About {cfg.genre.toLowerCase()}</Link>
          <Link href="/promoters" className="px-3 py-2 border-4 border-ink bg-white">Promoters</Link>
          <Link href="/nights" className="px-3 py-2 border-4 border-ink bg-white">Our Episodes</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
