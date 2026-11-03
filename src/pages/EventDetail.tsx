/**
 * EventDetail: the page for one CCD night, built around booking.
 *
 *   Hero    poster, title, when and where, buzz, calendar and share
 *   Body    left: about, lineup, run of show, recap, venue, questions
 *           right: TicketBox, sticky on desktop; first thing under the hero on phones
 *   Bar     phones only: price and "Get tickets", shown once the ticket box is off screen
 *
 * Status comes from the real date (nightStatus), never from a stale column.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/lib/compat-router";
import { useRouter } from "next/router";
import Image from "next/image";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import Marquee from "@/components/Marquee";
import RsvpDialog from "@/components/RsvpDialog";
import Going from "@/components/going/Going";
import { type Crowd, loadCrowd } from "@/lib/plans";
import EventLineupCard from "@/components/EventLineupCard";
import EventPosterPlaceholder from "@/components/EventPosterPlaceholder";
import TicketBox from "@/components/tickets/TicketBox";
import { AddToCalendar, DirectionsLink, ShareButton } from "@/components/tickets/NightTools";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { getEventContent, getStaticEventsBySeries } from "@/content/events";
import { resolvePoster } from "@/lib/poster";
import { buzzCount, loadBuzz, type Tier } from "@/lib/booking";
import { directionsUrl, displayDate, displayTime, inr, nightStatus, startDate } from "@/lib/nights";
import type { EventRow, MediaItem } from "@/types/events";

const SITE = "https://catscandance.com";

interface EventDetailProps {
  event: EventRow;
  slug: string;
}

const EventDetail = ({ event, slug }: EventDetailProps) => {
  const router = useRouter();
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  const [posterError, setPosterError] = useState(false);
  const [buzz, setBuzz] = useState(0);
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [boxVisible, setBoxVisible] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);

  const content = useMemo(() => getEventContent(event), [event]);
  const status = nightStatus(event);
  const upcoming = status === "upcoming";
  const time = displayTime(content.doors_time ?? event.start_time);
  const when = [displayDate(event), time].filter(Boolean).join(" · ");
  const pageUrl = `${SITE}/nights/${slug}`;
  const directions = directionsUrl(event.venue, event.city, content.venue_map_url);
  const poster = resolvePoster(event.poster_url);
  const series = useMemo(() => (event.series ? getStaticEventsBySeries(event.series) : []), [event.series]);

  useEffect(() => { if (router.query.rsvp) setRsvpOpen(true); }, [router.query.rsvp]);
  const [crowd, setCrowd] = useState<Crowd | undefined>();
  useEffect(() => { if (upcoming) loadCrowd([slug]).then((c) => setCrowd(c[slug])).catch(() => {}); }, [slug, upcoming]);
  useEffect(() => { if (upcoming) loadBuzz(slug).then((b) => setBuzz(buzzCount(b))).catch(() => {}); }, [slug, upcoming]);

  // Phones: show the bottom bar only when the ticket box is off screen.
  useEffect(() => {
    if (!upcoming || !boxRef.current || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setBoxVisible(e.isIntersecting), { rootMargin: "0px 0px -20% 0px" });
    io.observe(boxRef.current);
    return () => io.disconnect();
  }, [upcoming]);

  const lineup = useMemo(() => (event.lineup ?? []).map((name) => {
    const detail = content?.artist_details?.[name];
    if (detail) return detail;
    const tba = name.trim().toUpperCase() === "TBA";
    return { name, role: tba ? "Special guest" : "DJ", tba, blurb: tba ? "Announced soon." : undefined };
  }), [event, content]);

  const media = (event.media ?? []).filter((m) => m && m.url);

  const priceText = (() => {
    if (tiers && tiers.length) {
      const min = Math.min(...tiers.map((t) => t.price_inr));
      const left = tiers.reduce((a, t) => a + t.remaining, 0);
      const price = tiers.every((t) => t.price_inr === 0) ? "Free" : min === 0 ? "Free and paid" : `From ${inr(min)}`;
      return left > 0 ? `${price} · ${left} left` : "Sold out";
    }
    return content.price_text ?? (event.rsvp_open ? "Free, RSVP" : null);
  })();

  // Questions people actually ask, built only from what we know for this night.
  const faq: { q: string; a: React.ReactNode; text: string }[] = [
    { q: "How do I get in?", text: "Show the QR code on your ticket page or in your email at the door. One code per person.",
      a: <>Show the QR code on your ticket page or in your email at the door. One code per person.</> },
    { q: "I can't find my tickets.", text: "Go to catscandance.com/tickets and enter the email you booked with. We'll send them again.",
      a: <>Go to <Link to="/tickets" className="underline font-bold">catscandance.com/tickets</Link> and enter the email you booked with. We&apos;ll send them again.</> },
    { q: "Can I pass my ticket on?", text: "Yes, at face value, through Pass it on.",
      a: <>Yes, at face value, through <Link to="/whats-on#pass-it-on" className="underline font-bold">Pass it on</Link>.</> },
    ...(time ? [{ q: "What time should I come?", text: `Doors open at ${time}. The room fills up, so earlier is better.`, a: <>Doors open at {time}. The room fills up, so earlier is better.</> }] : []),
    ...(event.pet_friendly ? [{ q: "Can I bring my dog or cat?", text: "Yes. Pets are welcome in the pet zone during the day.", a: <>Yes. Pets are welcome in the pet zone during the day.</> }] : []),
    ...(content.dress_code ? [{ q: "Is there a dress code?", text: content.dress_code, a: <>{content.dress_code}</> }] : []),
    ...(content.house_rules ? [{ q: "House rules", text: content.house_rules, a: <>{content.house_rules}</> }] : []),
  ];

  // ── structured data ──
  const start = startDate(event, content.doors_time ?? event.start_time);
  const eventLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: `Cats Can Dance: ${event.title}`,
    description: event.blurb || content.narrative,
    startDate: start ? start.toISOString() : event.date,
    eventStatus: status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: poster ? (poster.startsWith("http") ? poster : `${SITE}${poster}`) : `${SITE}/og-image.jpg`,
    location: {
      "@type": "Place",
      name: event.venue,
      address: { "@type": "PostalAddress", ...(content.venue_address ? { streetAddress: content.venue_address } : {}), addressLocality: event.city || "Bengaluru", addressRegion: "Karnataka", addressCountry: "IN" },
    },
    performer: (event.lineup ?? []).filter((p) => p.toUpperCase() !== "TBA").map((p) => ({ "@type": "PerformingGroup", name: p })),
    organizer: { "@type": "Organization", name: "Cats Can Dance", url: SITE },
    ...(tiers && tiers.length ? {
      offers: tiers.map((t) => ({
        "@type": "Offer", name: t.name, url: pageUrl, price: String(t.price_inr), priceCurrency: "INR",
        availability: t.sold_out ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      })),
    } : {}),
  };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.text } })) };

  const heroTone = upcoming ? "bg-magenta text-cream" : "bg-cream text-ink";
  const scrollToBox = () => {
    boxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => (boxRef.current?.querySelector("button:not([disabled]), input") as HTMLElement | null)?.focus({ preventScroll: true }), 500);
  };

  return (
    <>
      <SEO
        title={`${event.title}, ${displayDate(event, false)} at ${event.venue} · Cats Can Dance`}
        description={event.blurb || content.narrative || `Cats Can Dance ${event.title} at ${event.venue}, ${event.city}.`}
        path={`/nights/${slug}`}
        type="event"
        image={poster ?? undefined}
        jsonLd={[eventLd, faqLd]}
      />

      <main className="bg-background text-foreground min-h-screen pb-24 lg:pb-0">
        <Nav forceDark={!upcoming} />

        {/* HERO */}
        <section className={`pt-28 md:pt-32 pb-10 md:pb-14 border-b-4 border-ink ${heroTone}`}>
          <div className="container">
            <Breadcrumbs light={upcoming} items={[{ label: "Home", to: "/" }, { label: "Episodes", to: "/nights" }, { label: event.title }]} />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-14 items-end">
              {/* Poster */}
              <div className="order-2 lg:order-1 w-full max-w-sm lg:max-w-none">
                {poster && !posterError ? (
                  <div className="relative aspect-[3/4] border-4 border-ink chunk-shadow-lg overflow-hidden bg-ink">
                    <Image src={poster} alt={`${event.title} poster`} fill priority sizes="(max-width: 1024px) 90vw, 320px" className="object-cover" onError={() => setPosterError(true)} />
                  </div>
                ) : (
                  <EventPosterPlaceholder title={event.title} date={displayDate(event)} city={event.city || "Bengaluru"} eyebrow={event.series_label ?? undefined} lineup={(event.lineup ?? []).join(" · ")} />
                )}
              </div>

              {/* Facts */}
              <div className="order-1 lg:order-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`inline-block text-xs font-bold px-3 py-1 border-2 border-ink ${upcoming ? "bg-acid-yellow text-ink" : "bg-ink text-cream"}`}>
                    {status === "cancelled" ? "Cancelled" : upcoming ? (priceText?.includes("Sold out") ? "Sold out" : "On sale") : "Past Episode"}
                  </span>
                  {event.pet_friendly && <span className="inline-block text-xs font-bold px-3 py-1 border-2 border-ink bg-electric-blue text-cream">Pet-friendly</span>}
                </div>

                <h1 className="font-display text-[3.4rem] sm:text-7xl md:text-8xl xl:text-9xl leading-[0.82] mb-6 break-words"
                  style={{ filter: `drop-shadow(6px 6px 0 hsl(var(--${upcoming ? "ink" : "magenta"})))` }}>
                  {event.title.toUpperCase()}
                </h1>

                <dl className="grid gap-1 text-lg md:text-2xl font-bold leading-snug mb-6">
                  <div><dt className="sr-only">When</dt><dd>{when}</dd></div>
                  <div><dt className="sr-only">Where</dt><dd>{event.venue}{event.city ? `, ${event.city}` : ""}</dd></div>
                  {upcoming && buzz >= 10 && <div><dt className="sr-only">Going</dt><dd className={upcoming ? "text-acid-yellow" : "text-magenta"}>{buzz} people are going</dd></div>}
                </dl>

                <div className="flex flex-wrap items-center gap-3">
                  {upcoming && (
                    <button type="button" onClick={scrollToBox}
                      className="font-display text-lg px-6 py-3 border-4 border-ink bg-acid-yellow text-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform">
                      {tiers && tiers.length > 0 && tiers.every((t) => t.sold_out) ? "Join waiting list" : tiers && tiers.length === 0 && event.rsvp_open ? "RSVP" : priceText && !priceText.startsWith("Sold") ? `Get tickets · ${priceText.split(" · ")[0]}` : "Get tickets"}
                    </button>
                  )}
                  {upcoming && <AddToCalendar night={event} time={content.doors_time ?? event.start_time} url={pageUrl} />}
                  <ShareButton title={`Cats Can Dance: ${event.title}`} text={`${event.title}, ${when} at ${event.venue}`} url={pageUrl} tone={upcoming ? "light" : "dark"} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <Marquee bg="bg-acid-yellow" items={content.marquee_items ?? ["SMALL ROOM", "REAL SOUND", "BRING YOUR PACK", "NO DRESS CODE, JUST MOVE"]} />

        {/* BODY */}
        <div className="container py-10 md:py-16 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14 items-start">
          {/* Ticket box: first on phones, right column on desktop */}
          <aside ref={boxRef} className="lg:order-2 lg:sticky lg:top-28 scroll-mt-28" aria-label="Tickets">
            <TicketBox
              id="tickets"
              slug={slug}
              title={event.title}
              when={when}
              venue={event.venue}
              past={!upcoming}
              rsvpOpen={!!event.rsvp_open}
              onRsvp={() => setRsvpOpen(true)}
              onTiers={setTiers}
            />
            {upcoming && (
              <div className="mt-6"><Going variant="panel" nightKey={slug} title={event.title} crowd={crowd} onChange={() => loadCrowd([slug]).then((c) => setCrowd(c[slug]))} /></div>
            )}
          </aside>

          <div className="lg:order-1 min-w-0 grid gap-14">
            {/* About */}
            <section>
              <h2 className="font-display text-ink text-3xl md:text-5xl leading-[0.9] mb-5">The night</h2>
              <p className="text-ink/85 font-medium text-lg md:text-xl leading-relaxed max-w-[65ch]">
                {content.narrative ?? event.blurb}
              </p>
              {content.vibe_pillars && content.vibe_pillars.length > 0 && (
                <ul className="mt-8 grid sm:grid-cols-3 gap-4">
                  {content.vibe_pillars.slice(0, 3).map((p, i) => (
                    <li key={p.label} className={`border-4 border-ink p-5 ${["bg-magenta text-cream", "bg-electric-blue text-cream", "bg-acid-yellow text-ink"][i % 3]}`}>
                      <p className="text-3xl mb-2" aria-hidden>{p.icon}</p>
                      <h3 className="font-display text-xl leading-none mb-2">{p.label}</h3>
                      <p className="font-medium leading-snug">{p.desc}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recap for past nights */}
            {!upcoming && event.recap && (
              <section>
                <h2 className="font-display text-ink text-3xl md:text-5xl leading-[0.9] mb-5">How it went</h2>
                <p className="text-ink/85 font-medium text-lg leading-relaxed max-w-[65ch] whitespace-pre-line">{event.recap}</p>
              </section>
            )}

            {/* Lineup */}
            <section>
              <h2 className="font-display text-ink text-3xl md:text-5xl leading-[0.9] mb-6">Lineup</h2>
              {lineup.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                  {lineup.map((a, i) => <EventLineupCard key={`${a.name}-${i}`} artist={a} index={i} />)}
                </div>
              ) : (
                <div className="border-4 border-dashed border-ink/40 p-6">
                  <p className="font-display text-xl mb-1">Announced soon.</p>
                  <p className="text-ink/75">Sartdawg and Merman are the residents. Guests drop on Instagram first.</p>
                  <a href="https://instagram.com/catscandance" target="_blank" rel="noopener noreferrer" className="inline-block mt-3 font-bold underline underline-offset-4">Follow @catscandance</a>
                </div>
              )}
            </section>

            {/* Run of show */}
            {content.schedule && content.schedule.length > 0 && (
              <section>
                <h2 className="font-display text-ink text-3xl md:text-5xl leading-[0.9] mb-6">Run of show</h2>
                <ol className="bg-ink text-cream border-4 border-ink p-5 md:p-6 space-y-2">
                  {content.schedule.map((item) => (
                    <li key={item.time + item.what} className={`flex items-baseline gap-4 border-l-4 pl-3 ${item.highlight ? "border-acid-yellow text-acid-yellow" : "border-cream/20"}`}>
                      <span className="font-display tabular shrink-0 w-20">{item.time}</span>
                      <span className="font-medium">{item.what}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Gallery */}
            {media.length > 0 && (
              <section>
                <h2 className="font-display text-ink text-3xl md:text-5xl leading-[0.9] mb-6">Look and feel</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {media.map((item, i) => (
                    <button key={`${item.url}-${i}`} type="button" onClick={() => setLightbox(item)} className="block border-4 border-ink bg-ink">
                      <img src={item.url} alt={item.caption || `${event.title} photo ${i + 1}`} loading="lazy" className="w-full aspect-video object-cover hover:opacity-90 transition-opacity" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Venue */}
            <section>
              <h2 className="font-display text-ink text-3xl md:text-5xl leading-[0.9] mb-6">Venue</h2>
              <div className="border-4 border-ink bg-cream p-5 md:p-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="font-display text-2xl leading-tight">{event.venue}</p>
                  <p className="text-ink/75 mt-1">{content.venue_address ?? event.city}</p>
                  {(content.capacity || event.capacity) && <p className="text-sm mt-2 font-bold">Capacity {content.capacity ?? event.capacity}</p>}
                </div>
                <DirectionsLink href={directions} />
              </div>
              {content.venue_embed_url && (
                <iframe src={content.venue_embed_url} title={`Map of ${event.venue}`} loading="lazy" className="w-full h-72 border-4 border-t-0 border-ink" />
              )}
            </section>

            {/* Questions */}
            <section>
              <h2 className="font-display text-ink text-3xl md:text-5xl leading-[0.9] mb-4">Questions</h2>
              <Accordion type="single" collapsible className="border-t-4 border-ink">
                {faq.map((x, i) => (
                  <AccordionItem key={x.q} value={`q${i}`} className="border-b-4 border-ink">
                    <AccordionTrigger className="font-display text-lg md:text-xl text-left hover:no-underline py-4">{x.q}</AccordionTrigger>
                    <AccordionContent className="text-base md:text-lg text-ink/85 pb-5">{x.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <p className="mt-4 text-ink/75">Something else? <a href="mailto:hello@catscandance.com" className="underline font-bold">hello@catscandance.com</a></p>
            </section>

            {/* Partners */}
            {content.partners && content.partners.length > 0 && (
              <section>
                <h2 className="font-display text-ink text-3xl md:text-5xl leading-[0.9] mb-6">With</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {content.partners.map((p) => (
                    <div key={p.name} className="bg-cream border-4 border-ink p-4 text-center">
                      <p className="font-display text-xl leading-none">{p.name}</p>
                      {p.role && <p className="text-xs font-bold text-magenta mt-1">{p.role}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {series.length > 1 && (
              <section>
                <h2 className="font-display text-ink text-3xl md:text-5xl leading-[0.9] mb-6">More from the series</h2>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {series.filter((s) => s.slug !== slug).map((s) => (
                    <li key={s.slug}><Link to={`/nights/${s.slug}`} className="block border-4 border-ink p-4 hover:bg-acid-yellow font-display">{s.title}</Link></li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <Footer />
      </main>

      {/* Phone bar: price and a way back to the ticket box */}
      {upcoming && (
        <div className={`lg:hidden fixed inset-x-0 bottom-0 z-40 border-t-4 border-ink bg-ink text-cream transition-transform duration-200 ${boxVisible ? "translate-y-full" : "translate-y-0"}`}
          style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }} aria-hidden={boxVisible}>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-base leading-tight truncate">{event.title}</p>
              <p className="text-sm text-cream/80 truncate">{priceText ?? displayDate(event)}</p>
            </div>
            <button type="button" tabIndex={boxVisible ? -1 : 0} onClick={scrollToBox}
              className="bg-acid-yellow text-ink font-display text-base px-5 py-3 border-4 border-cream whitespace-nowrap">
              {tiers && tiers.length > 0 && tiers.every((t) => t.sold_out) ? "Join waiting list" : tiers && tiers.length === 0 && event.rsvp_open ? "RSVP" : "Get tickets"}
            </button>
          </div>
        </div>
      )}

      <RsvpDialog open={rsvpOpen} onOpenChange={setRsvpOpen} eventSlug={slug} eventTitle={`Cats Can Dance ${event.title}`} eventDate={event.date} eventVenue={event.venue} />

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
