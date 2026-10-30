import type { GetStaticProps } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEO from "@/components/SEO";
import { getSceneEvents, type SceneBoardEvent } from "@/lib/ccd-db";

type Props = { events: SceneBoardEvent[]; updated: string };

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { events: await getSceneEvents(), updated: new Date().toISOString().slice(0, 10) },
  revalidate: 1800,
});

const fmt = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "Date to be announced";

function byCity(events: SceneBoardEvent[]) {
  const m = new Map<string, SceneBoardEvent[]>();
  for (const e of events) m.set(e.city ?? "Other", [...(m.get(e.city ?? "Other") ?? []), e]);
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
}

export default function WhatsOn({ events, updated }: Props) {
  const cities = byCity(events);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Electronic and underground music events in India",
      dateModified: updated,
      itemListElement: events.map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "MusicEvent",
          name: e.title,
          startDate: e.event_date ? `${e.event_date}${e.event_time ? `T${e.event_time}:00+05:30` : ""}` : undefined,
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: { "@type": "Place", name: e.venue ?? e.city ?? "India", address: { "@type": "PostalAddress", addressLocality: e.city ?? undefined, addressCountry: "IN" } },
          performer: (e.lineup ?? []).slice(0, 10).map((n) => ({ "@type": "PerformingGroup", name: n })),
          url: e.ticket_url ?? e.url,
        },
      })),
    },
  ];
  const summary = events.length
    ? `${events.length} hand checked electronic and underground events across ${cities.length} Indian cities, next one on ${fmt(events[0]?.event_date ?? null)}.`
    : "Hand checked electronic and underground events in India. New listings are added weekly.";

  return (
    <>
      <SEO
        title="What's on: electronic and underground events in India | Cats Can Dance"
        description={summary}
        path="/whats-on"
        jsonLd={jsonLd}
      />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <PageHero eyebrow="FIND · WHAT'S ON" title="WHAT'S ON IN INDIA." bg="bg-acid-yellow" textColor="text-ink" eyebrowColor="text-ink">
          <p className="text-ink font-medium text-lg max-w-xl">{summary}</p>
        </PageHero>
        <section className="container py-10">
          <p className="text-ink/70 max-w-2xl">
            Cats Can Dance checks each listing by hand before it goes up. Dates, venues and lineups come from public sources and ticket sellers, and are shown as listed. Last updated {fmt(updated)}.
          </p>
        </section>
        {cities.map(([city, list]) => (
          <section key={city} className="container pb-12">
            <h2 className="font-display text-3xl uppercase border-b-4 border-ink pb-3 mb-6">{city}</h2>
            <ul className="grid gap-5 md:grid-cols-2">
              {list.map((e) => (
                <li key={e.id} className="border-4 border-ink bg-cream p-5 chunk-shadow">
                  <p className="font-display text-xs uppercase tracking-widest text-ink/60">
                    {fmt(e.event_date)}{e.event_time ? ` at ${e.event_time}` : ""} · {e.kind === "club" ? "Club night" : e.kind === "festival" ? "Festival" : "Concert"}
                  </p>
                  <h3 className="font-display text-xl uppercase mt-1">{e.title}</h3>
                  <p className="text-sm text-ink/70 mt-1">{[e.venue, e.city].filter(Boolean).join(", ")}</p>
                  {e.lineup && e.lineup.length > 0 && <p className="text-sm mt-2">Lineup: {e.lineup.slice(0, 8).join(", ")}</p>}
                  <a href={e.ticket_url ?? e.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 font-display text-sm uppercase underline">
                    {e.ticket_url ? "Tickets" : "Details"}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {events.length === 0 && <section className="container pb-16"><p className="font-display uppercase">Nothing listed yet. <Link href="/submit-event" className="underline">Submit an event</Link>.</p></section>}
        <Footer />
      </main>
    </>
  );
}
