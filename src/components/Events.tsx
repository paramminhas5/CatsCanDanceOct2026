/**
 * Events — homepage section showing featured next event + past episodes.
 *
 * All RSVP/detail CTAs link to /events/[slug] (the detail page where the
 * full context + RSVP dialog lives). No more opening RSVP from the homepage
 * without seeing the event first.
 */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/lib/compat-router";
import { supabase } from "@/lib/supabase";
import type { EventRow } from "@/types/events";
import { getStaticEventRow } from "@/content/events";
import { resolvePoster } from "@/lib/poster";

// Static fallback — shown while DB loads or when Supabase is empty/unreachable
const STATIC_FALLBACK: EventRow[] = [
  getStaticEventRow("ccdxsocial-01")!,
  getStaticEventRow("ccdxsocial-02")!,
  getStaticEventRow("ccdxsocial-03")!,
  getStaticEventRow("ccdxsocial-mega")!,
].filter(Boolean);

const Events = () => {
  const [events, setEvents] = useState<EventRow[]>(STATIC_FALLBACK);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("events")
          .select("*")
          .order("sort_order", { ascending: true });
        if (data && (data as unknown as EventRow[]).length > 0) {
          setEvents(data as unknown as EventRow[]);
        }
      } catch {
        // Network error — static fallback stays in place
      }
    })();
  }, []);

  const upcoming = events.filter((e) => e.status === "upcoming");
  const past = events.filter((e) => e.status === "past");
  // Featured = the very next upcoming event regardless of series
  const nextUp = upcoming[0] ?? events[0];

  return (
    <section id="events" className="relative bg-lime py-12 md:py-20 border-b-4 border-ink overflow-hidden">
      <div className="container relative z-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="font-display text-magenta text-lg md:text-xl mb-2">/ EVENTS</p>
            <h2 className="font-display text-ink text-4xl md:text-6xl leading-[0.85]">
              CATCH<br />US LIVE
            </h2>
          </div>
          <Link
            to="/events"
            className="font-display text-ink text-base underline decoration-4 decoration-magenta underline-offset-4 hover:text-magenta transition"
          >
            All events →
          </Link>
        </div>

        {/* ── Featured next upcoming ── */}
        {nextUp && (() => {
          const featuredPoster = resolvePoster(nextUp.poster_url);
          return (
            <motion.article
              initial={{ opacity: 0, y: 60, rotate: -1 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ type: "spring", stiffness: 140, damping: 18 }}
              className="bg-magenta text-cream border-4 border-ink chunk-shadow-lg p-6 md:p-10 mb-12"
            >
              <div className={`flex flex-col ${featuredPoster ? "md:flex-row" : ""} gap-6 md:gap-10`}>
                {featuredPoster && (
                  <div className="md:w-[40%] shrink-0">
                    <Link to={`/events/${nextUp.slug}`} className="block group">
                      <div className="relative aspect-[3/4] bg-ink border-4 border-ink overflow-hidden chunk-shadow group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-transform">
                        <Image
                          src={featuredPoster}
                          alt={`${nextUp.title} poster`}
                          fill
                          priority
                          sizes="(max-width: 768px) 100vw, 40vw"
                          className="object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    </Link>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-acid-yellow text-ink text-xs font-bold px-3 py-1 border-2 border-ink uppercase">
                      ▶ NEXT UP
                    </span>
                    {nextUp.series_label && (
                      <span className="bg-cream/20 text-cream text-xs font-bold px-3 py-1 border-2 border-cream/30 uppercase">
                        {nextUp.series_label}
                      </span>
                    )}
                    {nextUp.pet_friendly && (
                      <span className="bg-electric-blue text-cream text-xs font-bold px-3 py-1 border-2 border-cream/30 uppercase">
                        🐾 PETS WELCOME
                      </span>
                    )}
                  </div>
                  <Link to={`/events/${nextUp.slug}`}>
                    <h3 className="font-display text-4xl md:text-6xl mb-4 leading-[0.9] hover:text-acid-yellow transition-colors">
                      {nextUp.title.toUpperCase()}
                    </h3>
                  </Link>
                  <div className="grid sm:grid-cols-3 gap-4 my-4">
                    <div>
                      <p className="font-display text-acid-yellow text-sm mb-1">/ DATE</p>
                      <p className="font-display text-xl">{nextUp.date}</p>
                    </div>
                    <div>
                      <p className="font-display text-acid-yellow text-sm mb-1">/ CITY</p>
                      <p className="font-display text-xl">{nextUp.city}</p>
                    </div>
                    <div>
                      <p className="font-display text-acid-yellow text-sm mb-1">/ VENUE</p>
                      <p className="font-display text-xl">{nextUp.venue}</p>
                    </div>
                  </div>
                  <p className="text-cream/90 text-base md:text-lg max-w-2xl mb-6 font-medium">
                    {nextUp.blurb}
                  </p>

                  {/* Lineup chips */}
                  {nextUp.lineup && nextUp.lineup.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {nextUp.lineup.slice(0, 5).map((artist) => (
                        <span
                          key={artist}
                          className={`font-display text-xs px-3 py-1 border-2 ${
                            artist.toUpperCase() === "TBA"
                              ? "border-cream/20 text-cream/50 border-dashed"
                              : "border-cream/40 text-cream"
                          }`}
                        >
                          {artist}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      to={`/events/${nextUp.slug}`}
                      className="bg-acid-yellow text-ink font-display text-xl px-8 py-4 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform text-center"
                    >
                      VIEW EVENT & RSVP →
                    </Link>
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })()}

        {/* ── Upcoming events grid (if more than 1) ── */}
        {upcoming.length > 1 && (
          <div className="mb-10">
            <p className="font-display text-ink text-xl mb-4">/ COMING UP</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.slice(1).map((e) => (
                <EventCard key={e.slug} event={e} />
              ))}
            </div>
          </div>
        )}

        {/* ── Past episodes ── */}
        {past.length > 0 && (
          <div className="mt-6">
            <p className="font-display text-ink text-xl mb-4">/ PAST EPISODES</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {past.map((e) => (
                <EventCard key={e.slug} event={e} isPast />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// ── Reusable Event Card ───────────────────────────────────────────────────────
function EventCard({ event, isPast = false }: { event: EventRow; isPast?: boolean }) {
  const src = resolvePoster(event.poster_url);
  return (
    <Link
      to={`/events/${event.slug}`}
      className="bg-cream border-4 border-ink chunk-shadow overflow-hidden hover:-translate-y-1 hover:translate-x-1 transition-transform block group"
    >
      <div className="relative aspect-video bg-ink border-b-4 border-ink overflow-hidden">
        {src ? (
          <Image
            src={src}
            alt={`${event.title} poster`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full grid place-items-center bg-lime text-ink font-display text-2xl p-4 text-center">
            {event.title}
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={`font-display text-[10px] px-2 py-0.5 border-2 border-ink ${
            isPast ? "bg-ink text-cream" : "bg-acid-yellow text-ink"
          }`}>
            {isPast ? "PAST" : "UPCOMING"}
          </span>
        </div>
        {/* Series ribbon */}
        {event.series_label && (
          <div className="absolute bottom-2 right-2">
            <span className="font-display text-[9px] px-2 py-0.5 bg-electric-blue text-cream border border-cream/30">
              {event.series_label}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-xl text-ink leading-tight mb-1 group-hover:text-magenta transition-colors">
          {event.title.toUpperCase()}
        </h3>
        <p className="text-ink/60 font-medium text-sm">
          {event.venue} · {event.date}
        </p>
        {event.pet_friendly && (
          <span className="inline-block mt-2 text-xs font-display text-electric-blue">🐾 Pet-friendly</span>
        )}
        {!isPast && (
          <p className="mt-3 font-display text-xs text-magenta uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            VIEW & RSVP →
          </p>
        )}
      </div>
    </Link>
  );
}

export default Events;
