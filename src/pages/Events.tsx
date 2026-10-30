/**
 * /events — Events listing page (rebuilt).
 *
 * Sections top → bottom:
 *  1. Hero           — bold page title
 *  2. Marquee        — series slogans
 *  3. Series Showcase — CCD × SOCIAL season overview (4 shows)
 *  4. Next Event Hero — CCDXSOCIAL 01 at Indiranagar Social, with RSVP
 *  5. Past Episodes  — recap grid
 *  6. Curated Events — hand-picked third-party events from Bangalore
 *  7. Host CTA       — for venues
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Link } from "@/lib/compat-router";
import { parseEventDate } from "@/lib/parse-date";
import { supabase } from "@/lib/supabase";
import { getEventContent, EVENT_ROWS } from "@/content/events";
import { resolvePoster } from "@/lib/poster";
import type { EventRow } from "@/types/events";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PageHero from "@/components/PageHero";
import Breadcrumbs from "@/components/Breadcrumbs";
import Marquee from "@/components/Marquee";
import EventPosterPlaceholder from "@/components/EventPosterPlaceholder";

// ── static fallback — always present, no DB needed ──────────────────────────
const STATIC_ROWS: EventRow[] = Object.values(EVENT_ROWS).sort(
  (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
);

// ── helpers ─────────────────────────────────────────────────────────────────
const Pad = (n: number) => String(n).padStart(2, "0");

// ── countdown hook (SSR-safe, no hydration mismatch) ────────────────────────
function useCountdown(target: Date | null) {
  const [t, setT] = useState({ days: 0, hours: 0, mins: 0, over: true });
  useEffect(() => {
    const calc = (now: number) => {
      if (!target) return { days: 0, hours: 0, mins: 0, over: true };
      const diff = target.getTime() - now;
      if (diff <= 0) return { days: 0, hours: 0, mins: 0, over: true };
      const secs = Math.floor(diff / 1000);
      return {
        days:  Math.floor(secs / 86400),
        hours: Math.floor((secs % 86400) / 3600),
        mins:  Math.floor((secs % 3600) / 60),
        over:  false,
      };
    };
    setT(calc(Date.now()));
    const id = setInterval(() => setT(calc(Date.now())), 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.getTime()]);
  return t;
}


// Map old Supabase titles to city display names — guards against stale DB data
const TITLE_MAP: Record<string, string> = {
  "ccdxsocial 01": "BANGALORE",
  "ccdxsocial 02": "BOMBAY",
  "ccdxsocial 03": "HYDERABAD",
  "mega":          "DELHI",
};
const displayTitle = (t: string) => TITLE_MAP[t.toLowerCase()] ?? t.toUpperCase();

// ── main component ───────────────────────────────────────────────────────────
type FilterTab = "all" | "upcoming" | "past" | "series";

const Events = () => {
  const [all, setAll] = useState<EventRow[]>(STATIC_ROWS);
  const [filter, setFilter] = useState<FilterTab>("all");

  // Attempt DB hydration — fall back silently to static data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("events")
          .select("*")
          .order("sort_order", { ascending: true });
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          // Prefer the curated local poster path from the static catalogue over
          // whatever is stored in Supabase (which may be null or a stale storage
          // URL). Mirrors the same merge already done in [slug].tsx getStaticProps.
          const merged = (data as unknown as EventRow[]).map((row) => ({
            ...row,
            poster_url: EVENT_ROWS[row.slug]?.poster_url || row.poster_url || null,
          }));
          setAll(merged);
        }
      } catch {
        // stay on static fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const safeAll  = Array.isArray(all) ? all : STATIC_ROWS;
  const upcoming = useMemo(() => safeAll.filter((e) => e.status === "upcoming"), [safeAll]);
  const past     = useMemo(() => safeAll.filter((e) => e.status === "past"),     [safeAll]);

  // Next upcoming = first in sort order
  const nextEvent = upcoming[0] ?? null;

  // Series group for the showcase strip
  const seriesEvents = useMemo(
    () => safeAll.filter((e) => e.series === "ccdxsocial")
         .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [safeAll],
  );

  // Filtered events for the grid section
  const filteredEvents = useMemo(() => {
    switch (filter) {
      case "upcoming": return upcoming;
      case "past": return past;
      case "series": return seriesEvents;
      default: return safeAll;
    }
  }, [filter, safeAll, upcoming, past, seriesEvents]);

  // Countdown target from next event date
  const countdownTarget = useMemo(() => {
    if (!nextEvent) return null;
    return parseEventDate(nextEvent.date);
  }, [nextEvent]);

  const cd = useCountdown(countdownTarget);

  // JSON-LD
  const jsonLd = upcoming.map((e) => ({
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: `Cats Can Dance — ${e.title}`,
    startDate: e.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: e.venue,
      address: { "@type": "PostalAddress", addressLocality: e.city || "Bangalore", addressCountry: "IN" },
    },
    organizer: { "@type": "Organization", name: "Cats Can Dance", url: "https://catscandance.com" },
    url: `https://catscandance.com/events/${e.slug}`,
  }));


  return (
    <>
      <SEO
        title="Events — Cats Can Dance | Underground Dance Music in Bangalore"
        description="CCD × SOCIAL series, our next upcoming event at Indiranagar Social, and the best curated dance music events happening across Bangalore."
        path="/events"
        jsonLd={jsonLd}
      />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />

        {/* ── 1. HERO ── */}
        <PageHero
          eyebrow="EVENTS"
          title="THE EVENTS."
          bg="bg-magenta"
          textColor="text-cream"
          eyebrowColor="text-acid-yellow"
          shadowColor="hsl(var(--ink))"
        >
          <p className="text-cream/90 font-display text-2xl md:text-3xl mb-2">
            UNDERGROUND. CURATED. OURS.
          </p>
          <p className="text-cream/80 font-medium text-lg max-w-xl">
            The best electronic music nights in India — house, disco, garage, jungle, D&amp;B.
            Every event handpicked. Free RSVP. Pets welcome at the CCD × Social series.
          </p>
        </PageHero>

        {/* ── 2. MARQUEE ── */}
        <Marquee
          bg="bg-acid-yellow"
          items={[
            "BANGALORE · 29 JUN",
            "BOMBAY · JULY",
            "HYDERABAD · AUGUST",
            "DELHI · OCTOBER",
            "UNDERGROUND · CURATED",
            "FREE RSVP",
          ]}
        />

        <section className="container py-6 md:py-8">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Events" }]} />
        </section>


        {/* ── 3. SERIES SHOWCASE — CCD × SOCIAL ── */}
        <section className="bg-electric-blue border-y-4 border-ink py-12 md:py-16">
          <div className="container">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <p className="font-display text-acid-yellow text-base md:text-lg mb-2">/ THE SERIES</p>
                <h2 className="font-display text-cream text-4xl md:text-6xl leading-none">
                  CCD × SOCIAL
                </h2>
                <p className="text-cream/80 font-medium text-base md:text-lg mt-3 max-w-xl">
                  Four Sundays across four cities. Easy outdoor afternoons, real underground floors
                  after dark. Pets welcome at every stop.
                </p>
              </div>
              <Link
                to="/ccdxsocial"
                className="shrink-0 bg-acid-yellow text-ink font-display text-sm px-5 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform whitespace-nowrap"
              >
                ABOUT THE SERIES →
              </Link>
            </div>

            {/* Series show cards — 4 up */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {seriesEvents.map((e, i) => {
                const isPast   = e.status === "past";
                const palettes = [
                  "bg-acid-yellow text-ink",
                  "bg-magenta text-cream",
                  "bg-cream text-ink",
                  "bg-ink text-cream",
                ];
                const pal = palettes[i % palettes.length];
                return (
                  <motion.div
                    key={e.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: i * 0.07, type: "spring", stiffness: 180, damping: 20 }}
                  >
                    <Link
                      to={`/events/${e.slug}`}
                      className={`relative block border-4 border-ink chunk-shadow p-5 md:p-6 h-full hover:-translate-y-1 hover:translate-x-1 transition-transform ${pal}`}
                    >
                      <p className={`font-display text-[10px] tracking-widest mb-2 ${isPast ? "text-ink/50" : "text-magenta"}`}>
                        {isPast ? "/ PAST" : "/ UPCOMING"}
                      </p>
                      <h3 className="font-display text-2xl md:text-3xl leading-none mb-2 break-words">
                        {displayTitle(e.title)}
                      </h3>
                      <p className="font-medium text-sm opacity-90 leading-tight mb-3">{e.date}</p>
                      <p className="font-medium text-sm opacity-70 leading-tight">{e.venue}</p>
                      {e.series_tagline && (
                        <p className="mt-4 text-[10px] font-display tracking-widest opacity-50">
                          {e.series_tagline}
                        </p>
                      )}
                      {e.pet_friendly && (
                        <span className="mt-3 inline-block text-sm" aria-label="pet-friendly">🐾</span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>


        {/* ── 4. NEXT UPCOMING EVENT HERO ── */}
        {nextEvent && (() => {
          const poster  = resolvePoster(nextEvent.poster_url);
          const content = getEventContent(nextEvent);
          return (
            <section className="container py-12 md:py-16">
              <p className="font-display text-magenta text-base md:text-lg mb-3">/ NEXT UP</p>
              <h2 className="font-display text-ink text-3xl md:text-5xl leading-tight mb-8">
                THIS IS THE ONE.
              </h2>

              {/* Countdown strip */}
              {!cd.over && (
                <div className="bg-ink text-cream border-4 border-ink mb-6 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-acid-yellow text-xs tracking-widest mb-1">/ DOORS OPEN IN</p>
                    <p className="font-display text-2xl md:text-4xl leading-none">
                      <span>{Pad(cd.days)}</span><span className="opacity-40 text-lg">D</span>
                      <span className="mx-2 opacity-30">·</span>
                      <span>{Pad(cd.hours)}</span><span className="opacity-40 text-lg">H</span>
                      <span className="mx-2 opacity-30">·</span>
                      <span>{Pad(cd.mins)}</span><span className="opacity-40 text-lg">M</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-acid-yellow text-xs tracking-widest mb-1">/ FREE RSVP</p>
                    <p className="font-display text-lg">{nextEvent.date}</p>
                  </div>
                </div>
              )}

              {/* Hero card */}
              <motion.article
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ type: "spring", stiffness: 140, damping: 18 }}
                className="bg-magenta text-cream border-4 border-ink chunk-shadow-lg"
              >
                <div className={`grid ${poster ? "md:grid-cols-[0.85fr_1.15fr]" : ""}`}>
                  {/* Poster */}
                  {poster ? (
                    <div className="relative aspect-[3/4] md:aspect-auto md:min-h-[460px] bg-ink border-b-4 md:border-b-0 md:border-r-4 border-ink overflow-hidden">
                      <Image
                        src={poster}
                        alt={`${nextEvent.title} poster`}
                        fill
                        priority
                        sizes="(max-width: 768px) 100vw, 45vw"
                        className="object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ) : (
                    <div className="border-b-4 md:border-b-0 md:border-r-4 border-ink">
                      <EventPosterPlaceholder
                        title={nextEvent.title}
                        date={nextEvent.date}
                        city={nextEvent.city || "Bangalore"}
                        eyebrow={nextEvent.series_label ?? undefined}
                        lineup={(nextEvent.lineup ?? []).join(" · ")}
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-7 md:p-10 flex flex-col justify-center">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {nextEvent.series_label && (
                        <span className="text-[10px] font-bold px-2 py-1 border-2 border-cream uppercase tracking-widest bg-cream text-ink">
                          {nextEvent.series_label}
                        </span>
                      )}
                      {nextEvent.pet_friendly && (
                        <span className="text-[10px] font-bold px-2 py-1 border-2 border-cream uppercase tracking-widest bg-electric-blue text-cream">
                          🐾 PET-FRIENDLY
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-1 border-2 border-acid-yellow uppercase tracking-widest bg-acid-yellow text-ink">
                        ▶ RSVP OPEN
                      </span>
                    </div>

                    <h3 className="font-display text-5xl md:text-7xl leading-[0.85] mb-5 break-words drop-shadow-[4px_4px_0_hsl(var(--ink))]">
                      {nextEvent.title.toUpperCase()}
                    </h3>

                    <div className="grid grid-cols-3 gap-4 mb-5">
                      {[
                        { label: "DATE",  value: nextEvent.date },
                        { label: "VENUE", value: nextEvent.venue },
                        { label: "CITY",  value: nextEvent.city },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="font-display text-acid-yellow text-xs tracking-widest mb-1">/ {label}</p>
                          <p className="font-display text-lg md:text-xl leading-tight break-words">{value}</p>
                        </div>
                      ))}
                    </div>

                    <p className="text-cream/85 font-medium text-base md:text-lg leading-relaxed mb-6 max-w-xl">
                      {nextEvent.blurb}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/events/${nextEvent.slug}`}
                        className="bg-acid-yellow text-ink font-display text-lg md:text-xl px-7 py-4 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
                      >
                        {content.cta_label ?? "VIEW EVENT & RSVP →"}
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.article>
            </section>
          );
        })()}


        {/* ── 5. FILTER TABS + ALL EVENTS GRID ── */}
        <section className="bg-cream border-y-4 border-ink py-12 md:py-16">
          <div className="container">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <p className="font-display text-magenta text-base md:text-lg mb-3">/ ALL EVENTS</p>
                <h2 className="font-display text-ink text-3xl md:text-5xl leading-tight">
                  BROWSE THE ARCHIVE.
                </h2>
              </div>
              {/* Filter tabs */}
              <div className="flex flex-wrap gap-2">
                {([
                  { key: "all", label: "ALL" },
                  { key: "upcoming", label: "UPCOMING" },
                  { key: "past", label: "PAST" },
                  { key: "series", label: "CCD × SOCIAL" },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`font-display text-xs px-4 py-2 border-4 border-ink transition-all ${
                      filter === key
                        ? "bg-ink text-cream chunk-shadow"
                        : "bg-cream text-ink hover:bg-acid-yellow"
                    }`}
                  >
                    {label}
                    {key !== "all" && (
                      <span className="ml-1.5 opacity-50">
                        ({key === "upcoming" ? upcoming.length : key === "past" ? past.length : seriesEvents.length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Events grid */}
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-display text-ink/40 text-xl">No events found.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEvents.map((e, i) => {
                  const src = resolvePoster(e.poster_url);
                  const isPast = e.status === "past";
                  return (
                    <motion.div
                      key={e.slug}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ delay: Math.min(i * 0.05, 0.3), type: "spring", stiffness: 200, damping: 22 }}
                    >
                      <Link
                        to={`/events/${e.slug}`}
                        className="group block bg-background border-4 border-ink chunk-shadow overflow-hidden hover:-translate-y-1 hover:translate-x-1 transition-transform h-full"
                      >
                        <div className="relative bg-ink border-b-4 border-ink aspect-video overflow-hidden">
                          {src ? (
                            <Image
                              src={src}
                              alt={`${e.title} poster`}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-full h-full grid place-items-center bg-ink text-cream font-display text-2xl p-4 text-center">
                              {e.title}
                            </div>
                          )}
                          {/* Status + series badges */}
                          <div className="absolute top-2 left-2 flex gap-1.5">
                            <span className={`font-display text-[10px] px-2 py-0.5 border-2 border-ink ${
                              isPast ? "bg-ink text-cream" : "bg-acid-yellow text-ink"
                            }`}>
                              {isPast ? "PAST" : "UPCOMING"}
                            </span>
                          </div>
                          {e.series_label && (
                            <div className="absolute bottom-2 right-2">
                              <span className="font-display text-[9px] px-2 py-0.5 bg-electric-blue text-cream border border-cream/30">
                                {e.series_label}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="font-display text-xl md:text-2xl text-ink leading-tight mb-1 break-words group-hover:text-magenta transition-colors">
                            {e.title.toUpperCase()}
                          </h3>
                          <p className="text-ink/60 font-medium text-sm mb-2">
                            {e.date} · {e.city} · {e.venue}
                          </p>
                          {e.pet_friendly && (
                            <span className="inline-block text-xs font-display text-electric-blue">🐾 Pet-friendly</span>
                          )}
                          {e.series_tagline && (
                            <p className="mt-2 text-[10px] font-display text-ink/40 tracking-widest uppercase">
                              {e.series_tagline}
                            </p>
                          )}
                          {!isPast && (
                            <p className="mt-3 font-display text-xs text-magenta uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                              VIEW & RSVP →
                            </p>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── 7. HOST CTA ── */}
        <section className="bg-ink border-t-4 border-ink py-10 md:py-14">
          <div className="container flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="font-display text-acid-yellow text-lg mb-2">/ HOST WITH US</p>
              <h3 className="font-display text-cream text-3xl md:text-5xl leading-[0.95]">
                WANT TO HOST ONE?
              </h3>
            </div>
            <Link
              to="/for-venues"
              className="bg-acid-yellow text-ink font-display text-lg px-6 py-3 border-4 border-cream chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform whitespace-nowrap"
            >
              FOR VENUES →
            </Link>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
};

export default Events;
