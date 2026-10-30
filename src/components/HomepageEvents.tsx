/**
 * HomepageEvents — single unified events section for the homepage.
 *
 * Layout (top → bottom):
 *   1. NEXT EVENT spotlight — poster, title, date/venue, lineup, countdown, CTA
 *   2. Series context strip — "Part of CCD × SOCIAL" with 4 show dots
 *   3. UPCOMING row — other upcoming events as compact cards (excludes featured)
 *   4. PAST EPISODES — compact grid
 *
 * One event shown once. No repetition. All CTAs go to /events/[slug].
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/lib/compat-router";
import { supabase } from "@/lib/supabase";
import { parseEventDate } from "@/lib/parse-date";
import { EVENT_ROWS } from "@/content/events";
import { resolvePoster } from "@/lib/poster";
import type { EventRow } from "@/types/events";

// ── Static fallback ───────────────────────────────────────────────────────────
const STATIC_ROWS: EventRow[] = Object.values(EVENT_ROWS).sort(
  (a, b) => a.sort_order - b.sort_order
);

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(target: Date | null) {
  const [t, setT] = useState({ days: 0, hours: 0, mins: 0, secs: 0, over: true });
  // Extract a primitive number so the effect dependency compares by VALUE,
  // not by object reference. parseEventDate() creates a new Date on every
  // render — using the Date object directly as a dep caused an infinite loop:
  //   render → new Date ref → effect fires → setState → render → new Date ref → …
  const targetMs = target?.getTime() ?? null;
  useEffect(() => {
    if (targetMs == null) return;
    const calc = () => {
      const diff = targetMs - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, over: true };
      const s = Math.floor(diff / 1000);
      return {
        days: Math.floor(s / 86400),
        hours: Math.floor((s % 86400) / 3600),
        mins: Math.floor((s % 3600) / 60),
        secs: s % 60,
        over: false,
      };
    };
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [targetMs]); // number primitive — stable across renders
  return t;
}

const Pad = (n: number) => String(n).padStart(2, "0");

// Map old Supabase titles to city display names — guards against stale DB data
const SERIES_TITLE_MAP: Record<string, string> = {
  "ccdxsocial 01": "BANGALORE",
  "ccdxsocial 02": "BOMBAY",
  "ccdxsocial 03": "HYDERABAD",
  "mega":          "DELHI",
};
const seriesDisplayTitle = (t: string) => SERIES_TITLE_MAP[t.toLowerCase()] ?? t.toUpperCase();

// ── Component ─────────────────────────────────────────────────────────────────
const HomepageEvents = () => {
  const [events, setEvents] = useState<EventRow[]>(STATIC_ROWS);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous request if component re-mounts
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Timeout: if Supabase doesn't respond in 5s, keep static fallback.
    // This prevents the placeholder client from causing an indefinite hang.
    const timeout = setTimeout(() => controller.abort(), 5000);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("sort_order", { ascending: true })
          .abortSignal(controller.signal);
        if (!error && data && data.length > 0 && !controller.signal.aborted) {
          // Prefer the curated local poster path from the static catalogue over
          // whatever is stored in Supabase (which may be null or a stale storage
          // URL). Mirrors the same merge already done in [slug].tsx getStaticProps.
          const merged = (data as unknown as EventRow[]).map((row) => ({
            ...row,
            poster_url: EVENT_ROWS[row.slug]?.poster_url || row.poster_url || null,
          }));
          setEvents(merged);
        }
      } catch {
        // Static fallback stays — this fires on abort or network error
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const upcoming = useMemo(() => events.filter((e) => e.status === "upcoming"), [events]);
  const past = useMemo(() => events.filter((e) => e.status === "past"), [events]);
  const seriesEvents = useMemo(
    () => events.filter((e) => e.series === "ccdxsocial").sort((a, b) => a.sort_order - b.sort_order),
    [events]
  );

  // Featured = first upcoming event
  const featured = upcoming[0] ?? null;
  // Rest of upcoming (excludes the featured one)
  const otherUpcoming = upcoming.slice(1);

  const poster = featured ? resolvePoster(featured.poster_url) : null;
  // Memoize so parseEventDate() isn't called on every render — without this
  // a new Date object is created each render, which (before the targetMs fix)
  // was the direct cause of the useCountdown infinite loop.
  const countdownTarget = useMemo(
    () => (featured ? parseEventDate(featured.date) : null),
    [featured?.date]
  );
  const cd = useCountdown(countdownTarget);

  if (!featured && past.length === 0) return null;

  return (
    <section className="bg-ink border-b-4 border-ink py-14 md:py-20">
      <div className="container">

        {/* ═══════════════════════════════════════════════════════════════════
            1. NEXT EVENT SPOTLIGHT
        ═══════════════════════════════════════════════════════════════════ */}
        {featured && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <p className="font-display text-acid-yellow text-xs uppercase tracking-[0.3em] mb-2">
                ▶ NEXT EVENT
              </p>
              <h2 className="font-display text-cream text-4xl md:text-6xl leading-[0.85]">
                {featured.title.toUpperCase()}
              </h2>
            </motion.div>

            <div className={`grid gap-8 md:gap-12 ${poster ? "md:grid-cols-[1fr_1.2fr]" : ""} items-start`}>
              {/* Poster */}
              {poster && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
                >
                  <Link to={`/events/${featured.slug}`} className="block group">
                    <img
                      src={poster}
                      alt={`${featured.title} poster`}
                      loading="eager"
                      className="w-full max-w-sm aspect-[3/4] object-cover border-4 border-cream/20 group-hover:border-acid-yellow transition-colors duration-300"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </Link>
                </motion.div>
              )}

              {/* Info panel */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="space-y-5"
              >
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {featured.series_label && (
                    <span className="font-display text-[10px] px-2.5 py-1 bg-electric-blue text-cream border-2 border-cream/30 uppercase tracking-widest">
                      {featured.series_label}
                    </span>
                  )}
                  {featured.pet_friendly && (
                    <span className="font-display text-[10px] px-2.5 py-1 bg-magenta text-cream border-2 border-cream/30 uppercase tracking-widest">
                      🐾 PET-FRIENDLY
                    </span>
                  )}
                  <span className="font-display text-[10px] px-2.5 py-1 bg-acid-yellow text-ink border-2 border-ink uppercase tracking-widest">
                    FREE RSVP
                  </span>
                </div>

                {/* Date / Venue / City */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="font-display text-acid-yellow text-[10px] tracking-widest mb-1">/ DATE</p>
                    <p className="font-display text-cream text-sm md:text-base">{featured.date}</p>
                  </div>
                  <div>
                    <p className="font-display text-acid-yellow text-[10px] tracking-widest mb-1">/ VENUE</p>
                    <p className="font-display text-cream text-sm md:text-base">{featured.venue}</p>
                  </div>
                  <div>
                    <p className="font-display text-acid-yellow text-[10px] tracking-widest mb-1">/ CITY</p>
                    <p className="font-display text-cream text-sm md:text-base">{featured.city}</p>
                  </div>
                </div>

                {/* Blurb */}
                <p className="text-cream/70 font-medium text-sm md:text-base leading-relaxed max-w-lg">
                  {featured.blurb}
                </p>

                {/* Lineup */}
                {featured.lineup && featured.lineup.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {featured.lineup.slice(0, 5).map((artist) => (
                      <span
                        key={artist}
                        className={`font-display text-xs px-3 py-1 border-2 ${
                          artist.toUpperCase() === "TBA"
                            ? "border-cream/20 text-cream/40 border-dashed"
                            : "border-cream/40 text-cream"
                        }`}
                      >
                        {artist}
                      </span>
                    ))}
                  </div>
                )}

                {/* Countdown */}
                {!cd.over && (
                  <div className="bg-cream/5 border-2 border-cream/10 px-4 py-3 inline-flex items-center gap-4 flex-wrap">
                    <p className="font-display text-acid-yellow text-[10px] tracking-widest">DOORS IN</p>
                    <div className="flex gap-2 font-display text-cream">
                      {cd.days > 0 && (
                        <>
                          <span className="text-xl tabular-nums">{cd.days}</span>
                          <span className="text-xs opacity-50 self-end mb-0.5">D</span>
                        </>
                      )}
                      <span className="text-xl tabular-nums">{Pad(cd.hours)}</span>
                      <span className="text-xs opacity-50 self-end mb-0.5">H</span>
                      <span className="text-xl tabular-nums">{Pad(cd.mins)}</span>
                      <span className="text-xs opacity-50 self-end mb-0.5">M</span>
                      <span className="text-xl tabular-nums">{Pad(cd.secs)}</span>
                      <span className="text-xs opacity-50 self-end mb-0.5">S</span>
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link
                    to={`/events/${featured.slug}`}
                    className="bg-acid-yellow text-ink font-display text-lg px-7 py-3.5 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
                  >
                    VIEW EVENT & RSVP →
                  </Link>
                </div>
              </motion.div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                2. SERIES CONTEXT STRIP (if event is part of a series)
            ═══════════════════════════════════════════════════════════════ */}
            {featured.series && seriesEvents.length > 1 && (
              <div className="mt-10 pt-8 border-t-2 border-cream/10">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <p className="font-display text-cream/60 text-xs uppercase tracking-widest">
                      Part of
                    </p>
                    <p className="font-display text-cream text-base md:text-lg">
                      {featured.series_label || featured.series}
                    </p>
                  </div>
                  <Link
                    to="/ccdxsocial"
                    className="font-display text-acid-yellow text-xs border-2 border-acid-yellow/30 px-3 py-1.5 hover:border-acid-yellow hover:bg-acid-yellow/10 transition-colors"
                  >
                    ABOUT THE SERIES →
                  </Link>
                </div>

                {/* Series progress dots */}
                <div className="flex gap-2 flex-wrap">
                  {seriesEvents.map((e) => {
                    const isCurrent = e.slug === featured.slug;
                    const isFinale = !!e.is_finale;
                    const isPast = e.status === "past";
                    return (
                      <Link
                        key={e.slug}
                        to={`/events/${e.slug}`}
                        className={`relative flex items-center gap-2 px-3 py-2 border-2 transition-all ${
                          isCurrent
                            ? "border-acid-yellow bg-acid-yellow/10 text-cream"
                            : isPast
                            ? "border-cream/10 text-cream/30 hover:border-cream/30"
                            : "border-cream/20 text-cream/60 hover:border-cream/40"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          isCurrent ? "bg-acid-yellow" : isPast ? "bg-cream/30" : "bg-cream/50"
                        }`} />
                        <span className="font-display text-[10px] uppercase tracking-wider">
                          {e.title === featured.slug ? "← NEXT" : ""}{seriesDisplayTitle(e.title)}
                        </span>
                        {isCurrent && (
                          <span className="font-display text-[9px] text-acid-yellow ml-1">← NEXT</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            3. OTHER UPCOMING EVENTS (excludes the featured one)
        ═══════════════════════════════════════════════════════════════════ */}
        {otherUpcoming.length > 0 && (
          <div className={`${featured ? "mt-12 pt-10 border-t-2 border-cream/10" : ""}`}>
            <p className="font-display text-acid-yellow text-xs uppercase tracking-[0.3em] mb-4">
              / ALSO COMING UP
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherUpcoming.map((e, i) => (
                <motion.div
                  key={e.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                >
                  <Link
                    to={`/events/${e.slug}`}
                    className="block border-4 border-cream/15 hover:border-acid-yellow/50 hover:-translate-y-1 transition-all group overflow-hidden"
                  >
                    {/* Poster thumbnail */}
                    {resolvePoster(e.poster_url) && (
                      <div className="aspect-video bg-ink overflow-hidden border-b-2 border-cream/10">
                        <img
                          src={resolvePoster(e.poster_url)!}
                          alt={`${e.title} poster`}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-display text-cream text-lg leading-tight group-hover:text-acid-yellow transition-colors">
                          {e.title.toUpperCase()}
                        </h4>
                        {e.pet_friendly && <span className="text-sm shrink-0">🐾</span>}
                      </div>
                      <p className="font-display text-cream/50 text-xs mb-1">{e.date}</p>
                      <p className="text-cream/40 text-xs">{e.venue}, {e.city}</p>
                      {e.series_tagline && (
                        <p className="mt-2 font-display text-[9px] text-cream/30 tracking-widest uppercase">
                          {e.series_tagline}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            4. PAST EPISODES (compact)
        ═══════════════════════════════════════════════════════════════════ */}
        {past.length > 0 && (
          <div className="mt-12 pt-10 border-t-2 border-cream/10">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-cream/40 text-xs uppercase tracking-[0.3em]">
                / PAST EPISODES
              </p>
              <Link
                to="/events"
                className="font-display text-cream/40 text-xs hover:text-cream transition-colors"
              >
                See all →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              {past.slice(0, 6).map((e) => (
                <Link
                  key={e.slug}
                  to={`/events/${e.slug}`}
                  className="shrink-0 w-48 border-2 border-cream/10 p-3 hover:border-cream/30 transition-colors group"
                >
                  <h4 className="font-display text-cream/60 text-sm leading-tight group-hover:text-cream transition-colors">
                    {e.title}
                  </h4>
                  <p className="text-cream/30 text-xs mt-1">{e.date}</p>
                  <p className="text-cream/20 text-[10px] mt-0.5">{e.venue}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Bottom link ── */}
        <div className="mt-10 pt-6 border-t-2 border-cream/10 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/events"
            className="font-display text-cream text-sm border-2 border-cream/30 px-5 py-2.5 hover:border-cream hover:bg-cream/10 transition-colors"
          >
            ALL EVENTS →
          </Link>
          <Link
            to="/ccdxsocial/sponsor"
            className="font-display text-acid-yellow text-xs border-2 border-acid-yellow/30 px-4 py-2 hover:border-acid-yellow hover:bg-acid-yellow/10 transition-colors"
          >
            PARTNER WITH US ✦
          </Link>
        </div>

      </div>
    </section>
  );
};

export default HomepageEvents;
