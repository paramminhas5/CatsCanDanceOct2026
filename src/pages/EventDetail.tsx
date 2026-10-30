/**
 * EventDetail — the showcase page for a single event.
 *
 * Sections:
 *   1. Hero          — title, status, date/venue, RSVP CTA, poster
 *   2. Countdown     — live "doors open in" strip (upcoming only)
 *   3. Marquee       — vibe slogans
 *   4. The Night     — vibe pillars + narrative + schedule
 *   5. Lineup        — artist cards
 *   6. Pet zone      — (ccdxsocial / pet_friendly only)
 *   7. Media gallery — past episode photos
 *   8. Venue         — address + map
 *   9. Partners      — sponsor block
 *  10. Series        — sibling shows
 *  11. Sticky CTA    — mobile RSVP bar
 *
 * Props: receives `event` directly from getStaticProps (no client re-fetch needed).
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/compat-router";
import { toast } from "sonner";

import Nav from "@/components/Nav";
import { useRouter } from "next/router";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import Marquee from "@/components/Marquee";
import RsvpDialog from "@/components/RsvpDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import EventCountdown from "@/components/EventCountdown";
import EventVenueCard from "@/components/EventVenueCard";
import EventLineupCard from "@/components/EventLineupCard";
import EventPosterPlaceholder from "@/components/EventPosterPlaceholder";
import SeriesStrip from "@/components/SeriesStrip";
import StickyRsvpBar from "@/components/StickyRsvpBar";

import { imgUrl } from "@/lib/img";
import { parseEventDate } from "@/lib/parse-date";
import Image from "next/image";
import {
  getEventContent,
  getStaticEventsBySeries,
} from "@/content/events";
import { resolvePoster } from "@/lib/poster";
import episode1Poster from "@/assets/episode-1-poster.png";

import type { EventRow, MediaItem } from "@/types/events";

const Field = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: boolean;
}) => (
  <div className="min-w-0">
    <p className={`font-display text-xs md:text-sm tracking-widest mb-1 ${accent ? "text-acid-yellow" : "text-magenta"}`}>
      / {label}
    </p>
    <p className="font-display text-lg md:text-2xl break-words leading-tight">{value}</p>
  </div>
);

// ──────────────────── component ────────────────────

interface EventDetailProps {
  event: EventRow;
  slug: string;
}

const EventDetail = ({ event, slug }: EventDetailProps) => {
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  const [posterError, setPosterError] = useState(false);
  const router = useRouter();

  // Auto-open RSVP dialog when arriving via ?rsvp=1 (e.g. from CcdxSocial page)
  useEffect(() => {
    if (router.query.rsvp) setOpen(true);
  }, [router.query.rsvp]);

  // Rich content from static catalogue (schedule, narrative, vibe pillars, etc.)
  const content = useMemo(() => getEventContent(event), [event]);

  // Build lineup
  const lineup = useMemo(() => {
    if (!event) return [];
    return (event.lineup ?? []).map((name) => {
      const detail = content?.artist_details?.[name];
      if (detail) return detail;
      const isTba = name.trim().toUpperCase() === "TBA";
      return {
        name,
        role: isTba ? "Special Guest" : "DJ",
        tba: isTba,
        blurb: isTba ? "Announcement coming soon." : undefined,
      };
    });
  }, [event, content]);

  // Series siblings (from static content for now — Supabase can override via ISR)
  const series = useMemo(() => {
    if (!event.series) return [];
    return getStaticEventsBySeries(event.series);
  }, [event.series]);

  // ─── guards ───
  if (!event) {
    return (
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <section className="container pt-32 pb-16">
          <h1 className="font-display text-5xl text-ink mb-4">Event not found</h1>
          <Link to="/events" className="font-display text-magenta underline">← All events</Link>
        </section>
        <Footer />
      </main>
    );
  }

  const isUpcoming = event.status === "upcoming";
  const isPet = !!event.pet_friendly;
  const headingShadow = isUpcoming
    ? "drop-shadow-[6px_6px_0_hsl(var(--ink))]"
    : "drop-shadow-[6px_6px_0_hsl(var(--magenta))]";
  const media = (event.media ?? []).filter((m) => m && m.url);
  const seriesEyebrow = (() => {
    if (!event.series_label) return null;
    const idx = series.findIndex((e) => e.slug === event.slug);
    if (idx < 0 || series.length === 0) return event.series_label;
    return `${event.series_label} · SHOW ${String(idx + 1).padStart(2, "0")}`;
  })();
  const ctaLabel = content.cta_label ?? "RSVP NOW →";
  const stickyMeta = `${event.date} · ${content.price_text ?? "Free RSVP"}`;
  const resolvedPoster = resolvePoster(event.poster_url);

  // ─── JSON-LD ───
  // Build an ISO 8601 startDate from the human-readable event.date + doors_time
  // e.g. "Sun, Jun 28, 2026" + "4 PM" → "2026-06-28T16:00:00+05:30"
  const isoStartDate = (() => {
    const d = parseEventDate(event.date);
    if (!d) return event.date;
    const timeMatch = (content.doors_time ?? "").match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1]);
      const m = parseInt(timeMatch[2] ?? "0");
      if (timeMatch[3].toUpperCase() === "PM" && h < 12) h += 12;
      if (timeMatch[3].toUpperCase() === "AM" && h === 12) h = 0;
      d.setHours(h, m, 0, 0);
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+05:30`;
  })();

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: `Cats Can Dance — ${event.title}`,
    description: event.blurb,
    startDate: isoStartDate,
    doorTime: isoStartDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: "https://catscandance.com/og-image.jpg",
    isAccessibleForFree: true,
    typicalAgeRange: "18+",
    location: {
      "@type": "Place",
      name: event.venue,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.city || "Bangalore",
        addressRegion: "Karnataka",
        addressCountry: "IN",
      },
      ...(content.venue_geo ? {
        geo: {
          "@type": "GeoCoordinates",
          latitude: content.venue_geo.lat,
          longitude: content.venue_geo.lng,
        },
      } : {}),
    },
    performer: (event.lineup ?? [])
      .filter((p) => p.toUpperCase() !== "TBA")
      .map((p) => ({ "@type": "PerformingGroup", name: p })),
    organizer: {
      "@type": "Organization",
      name: "Cats Can Dance",
      url: "https://catscandance.com",
      logo: "https://catscandance.com/ccd-logo.png",
    },
    offers: {
      "@type": "Offer",
      url: `https://catscandance.com/events/${slug}`,
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://catscandance.com" },
      { "@type": "ListItem", position: 2, name: "Events", item: "https://catscandance.com/events" },
      { "@type": "ListItem", position: 3, name: event.title, item: `https://catscandance.com/events/${slug}` },
    ],
  };

  // ──────────────────── render ────────────────────

  return (
    <>
      <SEO
        title={`${event.title} — Cats Can Dance${event.series_label ? ` · ${event.series_label}` : ""}`}
        description={event.blurb}
        path={`/events/${slug}`}
        type="event"
        jsonLd={[eventLd, breadcrumbLd]}
      />

      <main className="bg-background text-foreground min-h-screen pb-20 md:pb-0">
        <Nav />

        {/* 1. HERO */}
        <section
          className={`pt-28 md:pt-36 pb-12 md:pb-16 border-b-4 border-ink ${
            isUpcoming ? "bg-magenta text-cream" : "bg-cream text-ink"
          }`}
        >
          <div className="container">
            <Breadcrumbs
              light={isUpcoming}
              items={[
                { label: "Home", to: "/" },
                { label: "Events", to: "/events" },
                { label: event.title },
              ]}
            />

            <div className="mt-6 grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-12 items-end">
              <div>
                {seriesEyebrow && (
                  <p className={`font-display text-sm md:text-base tracking-[0.3em] mb-3 ${
                    isUpcoming ? "text-acid-yellow" : "text-magenta"
                  }`}>
                    / {seriesEyebrow}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`inline-block text-xs font-bold px-3 py-1 border-2 border-ink uppercase tracking-widest ${
                    isUpcoming ? "bg-acid-yellow text-ink" : "bg-ink text-cream"
                  }`}>
                    {isUpcoming ? "UPCOMING · RSVP OPEN" : "PAST EPISODE"}
                  </span>
                  {isPet && (
                    <span className="inline-block text-xs font-bold px-3 py-1 border-2 border-ink uppercase tracking-widest bg-electric-blue text-cream">
                      🐾 PET-FRIENDLY
                    </span>
                  )}
                </div>

                <h1 className={`font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.85] mb-6 break-words ${headingShadow}`}>
                  {event.title.toUpperCase()}
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 max-w-xl mb-6">
                  <Field label="DATE" value={event.date} accent={isUpcoming} />
                  <Field label="VENUE" value={event.venue} accent={isUpcoming} />
                  <Field label="CITY" value={event.city} accent={isUpcoming} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {isUpcoming && (
                    <button
                      type="button"
                      onClick={() => setOpen(true)}
                      className="bg-acid-yellow text-ink font-display text-lg md:text-xl px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
                    >
                      {ctaLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      const url = `${window.location.origin}/events/${slug}`;
                      if (typeof navigator.share === "function") {
                        try { await navigator.share({ title: event.title, url }); return; } catch {}
                      }
                      try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch {}
                    }}
                    className={`inline-flex items-center gap-2 font-display px-4 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform ${
                      isUpcoming ? "bg-cream text-ink" : "bg-ink text-cream"
                    }`}
                  >
                    ↗ SHARE
                  </button>
                </div>
              </div>

              {/* Poster */}
              <div className="lg:max-w-md w-full justify-self-end">
                {resolvedPoster && !posterError ? (
                  <div className="relative aspect-[3/4] border-4 border-ink chunk-shadow-lg overflow-hidden">
                    <Image
                      src={resolvedPoster}
                      alt={`${event.title} poster`}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 400px"
                      className="object-cover"
                      onError={() => setPosterError(true)}
                    />
                  </div>
                ) : (
                  <EventPosterPlaceholder
                    title={event.title}
                    date={event.date}
                    city={event.city || "Bangalore"}
                    eyebrow={seriesEyebrow ?? undefined}
                    lineup={(event.lineup ?? []).join(" · ")}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 2. COUNTDOWN */}
        {isUpcoming && <EventCountdown date={event.date} doorsTime={content.doors_time} />}

        {/* 3. MARQUEE */}
        <Marquee
          bg="bg-acid-yellow"
          items={content.marquee_items ?? ["DOORS OPEN LATE", "BRING YOUR PACK", "NO DRESS CODE — MOVE", "RSVP IS A LOVE LANGUAGE"]}
        />

        {/* 4. THE NIGHT */}
        <section className="container py-12 md:py-20">
          <p className="font-display text-magenta text-base md:text-lg mb-3">/ THE NIGHT</p>
          <h2 className="font-display text-ink text-4xl md:text-6xl leading-[0.9] mb-8 max-w-4xl">
            WHAT TO LOOK FORWARD TO.
          </h2>

          {content.vibe_pillars && content.vibe_pillars.length > 0 && (
            <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-10">
              {content.vibe_pillars.slice(0, 3).map((p, i) => {
                const palettes = ["bg-magenta text-cream", "bg-electric-blue text-cream", "bg-acid-yellow text-ink"];
                return (
                  <div key={p.label} className={`border-4 border-ink chunk-shadow p-5 md:p-6 ${palettes[i % palettes.length]}`}>
                    <p className="text-3xl md:text-4xl mb-3" aria-hidden>{p.icon}</p>
                    <h3 className="font-display text-2xl md:text-3xl leading-none mb-2">{p.label}</h3>
                    <p className="font-medium leading-snug">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid md:grid-cols-[1.3fr_1fr] gap-6 md:gap-10">
            <p className="text-ink/85 font-medium text-lg md:text-xl leading-relaxed">
              {content.narrative ?? event.blurb}
            </p>
            {content.schedule && content.schedule.length > 0 && (
              <div className="bg-ink text-cream border-4 border-ink chunk-shadow p-5 md:p-6">
                <p className="font-display text-acid-yellow text-xs md:text-sm tracking-widest mb-4">/ RUN OF SHOW</p>
                <ul className="space-y-2">
                  {content.schedule.map((item) => (
                    <li key={item.time + item.what} className={`flex items-baseline gap-3 border-l-4 pl-3 ${item.highlight ? "border-acid-yellow text-acid-yellow" : "border-cream/20 text-cream/90"}`}>
                      <span className={`font-display text-sm md:text-base tabular-nums shrink-0 ${item.highlight ? "" : "text-acid-yellow/80"}`}>{item.time}</span>
                      <span className="font-medium leading-snug">{item.what}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* 5. LINEUP */}
        {lineup.length > 0 && (
          <section className="bg-cream border-y-4 border-ink py-12 md:py-20">
            <div className="container">
              <p className="font-display text-magenta text-base md:text-lg mb-3">/ LINEUP</p>
              <h2 className="font-display text-ink text-4xl md:text-6xl leading-[0.9] mb-8">WHO'S ON.</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {lineup.map((a, i) => <EventLineupCard key={`${a.name}-${i}`} artist={a} index={i} />)}
              </div>
              {isUpcoming && (
                <button type="button" onClick={() => setOpen(true)} className="mt-10 bg-magenta text-cream font-display text-lg px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform">
                  {ctaLabel}
                </button>
              )}
            </div>
          </section>
        )}

        {/* 6. PETS WELCOME */}
        {isPet && (
          <section className="bg-electric-blue text-cream border-b-4 border-ink py-12 md:py-16">
            <div className="container">
              <p className="font-display text-acid-yellow text-base mb-3">/ PETS WELCOME</p>
              <h2 className="font-display text-cream text-4xl md:text-5xl leading-[0.9] mb-4">BRING THE WHOLE PACK.</h2>
              <p className="font-medium text-cream/90 text-lg leading-relaxed max-w-2xl">
                Dogs and cats welcome all afternoon. Easy outdoor floor, good people, the right energy.
              </p>
            </div>
          </section>
        )}

        {/* 7. MEDIA GALLERY */}
        {media.length > 0 && (
          <section className="bg-background py-12 md:py-16">
            <div className="container">
              <p className="font-display text-magenta text-base mb-3">/ LOOK & FEEL</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {media.map((item, i) => (
                  <figure key={`${item.url}-${i}`} className="bg-ink border-4 border-ink chunk-shadow">
                    <button type="button" onClick={() => setLightbox(item)} className="block w-full">
                      <img src={item.url} alt={item.caption || ""} loading="lazy" className="w-full aspect-video object-cover hover:opacity-90 transition-opacity" />
                    </button>
                    {item.caption && <figcaption className="bg-cream text-ink px-3 py-2 text-sm font-medium border-t-4 border-ink">{item.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 8. VENUE */}
        <EventVenueCard
          venue={event.venue}
          city={event.city || "Bangalore"}
          address={content.venue_address}
          embedUrl={content.venue_embed_url}
          capacity={content.capacity}
          dressCode={content.dress_code}
          houseRules={content.house_rules}
        />

        {/* 9. PARTNERS */}
        {content.partners && content.partners.length > 0 && (
          <section className="bg-ink text-cream border-y-4 border-ink py-12 md:py-16">
            <div className="container grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="font-display text-acid-yellow text-base mb-3">/ BROUGHT TO YOU BY</p>
                <h2 className="font-display text-cream text-3xl md:text-5xl leading-[0.9] mb-3">PARTNERS, NOT SPONSORS.</h2>
                {event.series === "ccdxsocial" && (
                  <Link to="/ccdxsocial/sponsor" className="inline-block bg-acid-yellow text-ink font-display text-base px-5 py-2 border-4 border-cream chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform mt-4">
                    SPONSORSHIP ↗
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {content.partners.map((p) => (
                  <div key={p.name} className="bg-cream text-ink border-4 border-ink p-4 flex flex-col items-center justify-center text-center min-h-[120px]">
                    <p className="font-display text-2xl text-ink leading-none">{p.name.toUpperCase()}</p>
                    {p.role && <p className="font-display text-[10px] tracking-widest text-magenta mt-1">/ {p.role}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 10. SERIES STRIP */}
        {event.series && series.length > 1 && (
          <SeriesStrip events={series} currentSlug={event.slug} seriesLabel={event.series_label || event.series.toUpperCase()} />
        )}

        <Footer />
      </main>

      {/* STICKY MOBILE CTA */}
      {isUpcoming && <StickyRsvpBar label={ctaLabel} onClick={() => setOpen(true)} meta={stickyMeta} />}

      {/* RSVP DIALOG */}
      <RsvpDialog open={open} onOpenChange={setOpen} eventSlug={slug} eventTitle={`Cats Can Dance ${event.title}`} eventDate={event.date} eventVenue={event.venue} />

      {/* LIGHTBOX */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-5xl bg-ink border-4 border-ink p-2">
          {lightbox && (
            <figure>
              <img src={lightbox.url} alt={lightbox.caption || ""} className="w-full max-h-[80vh] object-contain bg-ink" />
              {lightbox.caption && <figcaption className="text-cream text-center font-medium py-2">{lightbox.caption}</figcaption>}
            </figure>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventDetail;
