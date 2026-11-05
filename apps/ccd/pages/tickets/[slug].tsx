/**
 * /tickets/[slug]: a focused booking page for links shared on Instagram and in emails.
 * The night on the left, the same TicketBox as the event page on the right.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import TicketBox from "@/components/tickets/TicketBox";
import RsvpDialog from "@/components/RsvpDialog";
import { supabase } from "@/lib/supabase";
import { resolvePoster } from "@/lib/poster";
import { getEventContent, getStaticEventRow } from "@/content/events";
import { displayDate, displayTime, nightStatus } from "@/lib/nights";
import type { EventRow } from "@/types/events";

export default function Tickets() {
  const router = useRouter();
  const slug = String(router.query.slug ?? "");
  const [ev, setEv] = useState<EventRow | null | undefined>(undefined);
  const [rsvp, setRsvp] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase.from("events").select("*").eq("slug", slug).maybeSingle().then(({ data }) => {
      const row = (data as EventRow | null) ?? getStaticEventRow(slug);
      setEv(row && row.published !== false ? row : null);
    });
  }, [slug]);

  const content = ev ? getEventContent(ev) : null;
  const time = ev ? displayTime(content?.doors_time ?? ev.start_time) : null;
  const when = ev ? [displayDate(ev), time].filter(Boolean).join(" · ") : "";
  const poster = ev ? resolvePoster(ev.poster_url) : null;
  const past = ev ? nightStatus(ev) !== "upcoming" : false;

  return (
    <>
      <SEO title={ev ? `Tickets: ${ev.title}, ${displayDate(ev, false)} · Cats Can Dance` : "Tickets · Cats Can Dance"}
        description={ev ? `Book tickets for Cats Can Dance ${ev.title} at ${ev.venue}, ${ev.city}.` : "Book tickets for a Cats Can Dance night."}
        path={`/tickets/${slug}`} />
      <main className="bg-electric-blue min-h-screen">
        <Nav />
        <section className="container pt-28 md:pt-36 pb-16 md:pb-24">
          {ev === null ? (
            <div className="max-w-xl bg-cream border-4 border-ink chunk-shadow p-6 md:p-8">
              <h1 className="font-display text-4xl leading-none mb-3">We can&apos;t find that night.</h1>
              <p className="text-ink/80 mb-5">The link may be old, or the night is not on sale yet.</p>
              <a href="/nights" className="inline-block font-display text-lg px-5 py-3 border-4 border-ink bg-acid-yellow">See all Episodes</a>
            </div>
          ) : (
            <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14 items-start">
              <div className="text-cream min-w-0">
                <div className="flex gap-5 items-end">
                  {poster && (
                    <div className="relative w-28 sm:w-36 aspect-[3/4] shrink-0 border-4 border-ink chunk-shadow overflow-hidden bg-ink hidden sm:block">
                      <Image src={poster} alt="" fill sizes="144px" className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-acid-yellow mb-2">Cats Can Dance</p>
                    <h1 className="font-display text-5xl sm:text-7xl leading-[0.85] break-words" style={{ filter: "drop-shadow(5px 5px 0 hsl(var(--ink)))" }}>
                      {ev ? ev.title.toUpperCase() : " "}
                    </h1>
                  </div>
                </div>
                {ev && (
                  <dl className="mt-8 grid gap-1 text-lg md:text-2xl font-bold">
                    <div><dt className="sr-only">When</dt><dd>{when}</dd></div>
                    <div><dt className="sr-only">Where</dt><dd>{ev.venue}{ev.city ? `, ${ev.city}` : ""}</dd></div>
                  </dl>
                )}
                {ev && (
                  <a href={`/nights/${slug}`} className="inline-block mt-6 font-bold underline underline-offset-4 decoration-2 hover:text-acid-yellow">
                    Lineup, venue and questions
                  </a>
                )}
              </div>
              <div>
                {ev ? (
                  <TicketBox slug={slug} title={ev.title} when={when} venue={ev.venue} past={past}
                    rsvpOpen={!!ev.rsvp_open} onRsvp={() => setRsvp(true)} perfBg="hsl(var(--electric-blue))" />
                ) : (
                  <div className="h-80 border-4 border-ink bg-cream/70 chunk-shadow" aria-busy="true" aria-label="Loading tickets" />
                )}
              </div>
            </div>
          )}
        </section>
        <Footer />
      </main>
      {ev && <RsvpDialog open={rsvp} onOpenChange={setRsvp} eventSlug={slug} eventTitle={`Cats Can Dance ${ev.title}`} eventDate={ev.date} eventVenue={ev.venue} />}
    </>
  );
}
