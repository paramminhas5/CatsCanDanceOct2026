/**
 * CCD × SOCIAL — Public-facing 4-city tour landing page (/ccdxsocial).
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import SEO from "@/components/SEO";
import catDancer from "@/assets/cat-dancer.png";
import catHandstand from "@/assets/cat-handstand.png";
import catHeadphones from "@/assets/cat-headphones-dance.png";
import catRaver from "@/assets/cat-raver.png";
import catDjHero from "@/assets/cat-dj-hero.png";
import { imgUrl } from "@/lib/img";

// ── Asset URLs ────────────────────────────────────────────────────────────────
// BLR poster: served from local public/posters/ (committed, always available)
// MUM / HYD:  no local file yet — CDN URL tried first, then "POSTER COMING SOON"
const BLR_POSTER      = "/posters/ccdxsocial-blr.jpg";
const BLR_POSTER_CDN  = "https://catscandance.com/__l5e/assets-v1/4ec50939-9498-4ff9-b642-2a095db54775/ccdxsocial-blr-poster.jpg";
const MUM_POSTER_CDN  = "https://catscandance.com/__l5e/assets-v1/c77b5b48-b34f-4add-a877-c1fd3caad34f/ccdxsocial-mum-poster.jpg";
const HYD_POSTER_CDN  = "https://catscandance.com/__l5e/assets-v1/02bd78b3-7f87-43df-a548-c2148faf8a02/ccdxsocial-hyd-poster.jpg";


// ── Countdown ─────────────────────────────────────────────────────────────────
const NEXT_SHOW_DATE = new Date("2026-06-28T10:30:00Z"); // 4 PM IST

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
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
  const [t, setT] = useState<ReturnType<typeof calc> | null>(null);
  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

const Pad = (n: number) => String(n).padStart(2, "0");

// Reusable scroll-reveal wrapper
const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    className={className}
  >
    {children}
  </motion.div>
);


// ── Artists ───────────────────────────────────────────────────────────────────
const ARTISTS = ["AGENT BUGS", "GROOVIER", "SARTDAWG", "SHANTAM", "TBC BOMBAY", "TBC HYDERABAD", "TBC DELHI", "+ MORE"];

// ── Tour stops ────────────────────────────────────────────────────────────────
const STOPS = [
  {
    num: "01", slug: "ccdxsocial-01", city: "BANGALORE", venue: "Social, Indiranagar",
    date: "Sun, 28 Jun 2026 · 4 PM till late", tagline: "The first show · where it all begins",
    desc: "Home crowd, first floor. Outdoor afternoon from 4 PM with a vendor market and the pack together for the first time. Dogs and cats welcome. Music from 4:30 through to close.",
    lineup: "Agent Bugs · Groovier · Sartdawg · Shantam", bg: "bg-electric-blue", text: "text-cream", accent: "text-acid-yellow",
    badge: "next" as const, poster: BLR_POSTER, posterFallback: BLR_POSTER_CDN,
  },
  {
    num: "02", slug: "ccdxsocial-02", city: "BOMBAY", venue: "Social, Bombay (TBC)",
    date: "July 2026", tagline: "The second show · Bombay energy",
    desc: "Bombay brings its own thing. Same easy format — outdoor afternoon, dogs and cats welcome, the floor opens after dark.",
    lineup: "Lineup TBA", bg: "bg-magenta", text: "text-cream", accent: "text-acid-yellow",
    badge: null, poster: null, posterFallback: MUM_POSTER_CDN,
  },
  {
    num: "03", slug: "ccdxsocial-03", city: "HYDERABAD", venue: "Social, Hyderabad (TBC)",
    date: "August 2026", tagline: "The third show · Hyderabad",
    desc: "The series hits Hyderabad. Outdoor afternoon, pets welcome, real music. The underground takes the late slot.",
    lineup: "Lineup TBA", bg: "bg-ink", text: "text-cream", accent: "text-acid-yellow",
    badge: null, poster: null, posterFallback: HYD_POSTER_CDN,
  },
  {
    num: "04", slug: "ccdxsocial-mega", city: "DELHI", venue: "Venue TBA",
    date: "October 2026", tagline: "The fourth show · large format",
    desc: "The biggest one yet. Delhi, large format, full lineup. Dogs and cats welcome. Date and venue to be announced.",
    lineup: "Full lineup TBA", bg: "bg-acid-yellow", text: "text-ink", accent: "text-magenta",
    badge: null, poster: null,
  },
];


// ── What to expect ────────────────────────────────────────────────────────────
const EXPECT = [
  { eyebrow: "4 PM ONWARDS", title: "THE AFTERNOON", body: "Outdoor floor, vendor market, easy Sunday energy. Dogs and cats welcome all afternoon — bring the whole pack or just yourself.", bg: "bg-electric-blue", text: "text-cream", emoji: "🐾" },
  { eyebrow: "AFTER DARK", title: "THE FLOOR", body: "Dance floor opens. Residents and rotating guests from each city, late till close.", bg: "bg-magenta", text: "text-cream", emoji: "🎧" },
  { eyebrow: "THE VIBE", title: "EASY SUNDAY", body: "No dress code, no posture. Free water all day. Come for the pets, stay for the music — or the other way round.", bg: "bg-acid-yellow", text: "text-ink", emoji: "☀️" },
  { eyebrow: "WHO IT'S FOR", title: "THE PACK", body: "Pet parents, music heads, friends of both, and anyone who wants a different kind of Sunday. Free entry on RSVP. Dogs and cats welcome at every stop.", bg: "bg-cream", text: "text-ink", emoji: "💛" },
];

// ── JSON-LD ───────────────────────────────────────────────────────────────────
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EventSeries",
  name: "CCD × SOCIAL",
  description: "Cats Can Dance × Social — four Sundays across four cities. Underground dance music, easy outdoor afternoons, pets welcome. Free entry, RSVP only.",
  url: "https://catscandance.com/ccdxsocial",
  organizer: { "@type": "Organization", name: "Cats Can Dance", url: "https://catscandance.com" },
  subEvent: [
    { "@type": "Event", name: "CCD × SOCIAL — Bangalore", startDate: "2026-06-28", location: { "@type": "Place", name: "Social, Indiranagar", address: "Bengaluru, IN" } },
    { "@type": "Event", name: "CCD × SOCIAL — Mumbai", startDate: "2026-07-26", location: { "@type": "Place", name: "Antisocial, Khar", address: "Mumbai, IN" } },
    { "@type": "Event", name: "CCD × SOCIAL — Hyderabad", startDate: "2026-08-30", location: { "@type": "Place", name: "Social, Hyderabad", address: "Hyderabad, IN" } },
    { "@type": "Event", name: "CCD × SOCIAL — Delhi NCR (Finale)", startDate: "2026-10-01", location: { "@type": "Place", name: "TBA", address: "Delhi NCR, IN" } },
  ],
};


// Poster image: tries primary src, falls back to fallbackSrc, then shows placeholder
function PosterImg({ src, fallbackSrc, city }: { src: string | null; fallbackSrc?: string; city: string }) {
  const initial = src || fallbackSrc || null;
  const [current, setCurrent] = useState<string | null>(initial);
  const [failed, setFailed] = useState(!initial);

  const handleError = () => {
    // If we just failed on the primary, try the CDN fallback
    if (current === src && fallbackSrc && fallbackSrc !== src) {
      setCurrent(fallbackSrc);
    } else {
      setFailed(true);
    }
  };

  if (failed || !current) {
    return (
      <div className="border-4 border-dashed border-cream/60 aspect-[3/4] grid place-items-center text-center p-3">
        <div><p className="font-display text-4xl">★</p><p className="font-display text-[10px] mt-2 opacity-80">POSTER COMING SOON</p></div>
      </div>
    );
  }
  return (
    <div className="border-4 border-cream chunk-shadow overflow-hidden aspect-[3/4]">
      <img
        src={current}
        alt={`CCD × Social ${city} poster`}
        className="w-full h-full object-cover block"
        loading="lazy"
        onError={handleError}
      />
    </div>
  );
}
function ScrollCats() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 3000], [0, -400]);
  const y2 = useTransform(scrollY, [0, 3000], [0, -700]);
  const y3 = useTransform(scrollY, [0, 3000], [0, -550]);
  const y4 = useTransform(scrollY, [0, 3000], [0, -900]);
  const rot1 = useTransform(scrollY, [0, 3000], [-8, 18]);
  const rot2 = useTransform(scrollY, [0, 3000], [10, -22]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[5] hidden md:block overflow-hidden">
      <motion.img src={imgUrl(catDancer)} style={{ y: y1, rotate: rot1 }} className="absolute top-[120vh] -left-4 w-16 opacity-60" alt="" />
      <motion.img src={imgUrl(catHandstand)} style={{ y: y2, rotate: rot2 }} className="absolute top-[180vh] right-2 w-16 opacity-60" alt="" />
      <motion.img src={imgUrl(catHeadphones)} style={{ y: y3, rotate: rot1 }} className="absolute top-[260vh] left-4 w-20 opacity-60" alt="" />
      <motion.img src={imgUrl(catRaver)} style={{ y: y4, rotate: rot2 }} className="absolute top-[340vh] right-6 w-20 opacity-60" alt="" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CcdxSocialSeries() {
  const cd = useCountdown(NEXT_SHOW_DATE);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroArtY = useTransform(heroProgress, [0, 1], [0, 80]);
  const heroArtScale = useTransform(heroProgress, [0, 1], [1, 1.08]);

  return (
    <>
      <SEO
        title="CCD × SOCIAL — A 4-City Sunday Tour for Pets & Music"
        description="Cats Can Dance × Social: Bangalore, Bombay, Hyderabad, Delhi. Four Sundays, four cities. Underground dance music, easy outdoor afternoons, pets welcome. Free entry, RSVP only."
        path="/ccdxsocial"
        jsonLd={jsonLd}
      />
      <Nav forceDark />
      <ScrollCats />

      <main className="bg-cream text-ink relative">


        {/* ── HERO ── */}
        <section ref={heroRef} className="relative bg-cream text-ink pt-20 md:pt-24 pb-8 md:pb-10 border-b-4 border-ink overflow-hidden md:min-h-[72vh] md:max-h-[80vh]">
          <motion.div style={{ y: heroArtY, scale: heroArtScale }} className="absolute inset-0 md:left-[40%] z-0">
            <img src={imgUrl(catDjHero)} alt="" aria-hidden className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-r from-cream via-cream/85 md:via-cream/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-cream to-transparent" />
          </motion.div>

          <div className="container relative z-10">
            <Reveal>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="font-display text-[10px] px-2 py-1 bg-magenta text-cream border-2 border-ink chunk-shadow">National Tour</span>
                <span className="font-display text-[10px] px-2 py-1 bg-acid-yellow text-ink border-2 border-ink chunk-shadow">4 Cities · Jun–Oct 2026</span>
                <span className="font-display text-[10px] px-2 py-1 bg-electric-blue text-cream border-2 border-ink chunk-shadow">Free Entry · RSVP</span>
              </div>
            </Reveal>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="font-display leading-[0.85] tracking-tight text-5xl sm:text-6xl md:text-7xl lg:text-8xl max-w-2xl"
            >
              <span className="block">CATS CAN</span>
              <span className="block">DANCE</span>
              <span className="block text-magenta">× SOCIAL</span>
            </motion.h1>

            <Reveal delay={0.15}>
              <p className="mt-5 max-w-lg text-base md:text-lg text-ink/85 leading-relaxed">
                A travelling Sunday party for pet parents and music lovers — four cities, one easy format.
              </p>
            </Reveal>

            <Reveal delay={0.25}>
              <div className="mt-6 flex flex-wrap items-end gap-3">
                {cd && !cd.over && (
                  <div className="bg-ink text-cream border-4 border-ink chunk-shadow px-4 py-3">
                    <div className="font-display text-[10px] text-acid-yellow mb-2">▶ STOP 01 · BANGALORE IN</div>
                    <div className="flex gap-3">
                      {[{ val: cd.days, label: "DAYS" }, { val: cd.hours, label: "HRS" }, { val: cd.mins, label: "MIN" }, { val: cd.secs, label: "SEC" }].map(({ val, label }) => (
                        <div key={label} className="text-center">
                          <div className="font-display text-2xl md:text-3xl leading-none">{Pad(val)}</div>
                          <div className="font-display text-[9px] mt-1 text-cream/60">{label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="font-display text-[10px] mt-2 text-cream/70">SUN 28 JUN · SOCIAL INDIRANAGAR · 4 PM</div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link href="/events/ccdxsocial-01?rsvp=1" className="inline-block bg-acid-yellow text-ink font-display text-base px-5 py-3 border-4 border-ink chunk-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform">
                    RSVP →
                  </Link>
                  <a href="#tour" className="inline-block bg-magenta text-cream font-display text-base px-5 py-3 border-4 border-ink chunk-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform">
                    SEE THE TOUR ↓
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>


        {/* ── MARQUEE ── */}
        <Marquee bg="bg-acid-yellow" items={["CCD × SOCIAL", "BANGALORE 28 JUN", "BOMBAY JULY", "HYDERABAD AUGUST", "DELHI OCTOBER", "FREE ENTRY · RSVP"]} />

        {/* ── HOW IT WORKS ── */}
        <section className="bg-cream py-12 md:py-16 border-b-4 border-ink relative overflow-hidden">
          <div className="container relative">
            <Reveal>
              <p className="font-display text-xs text-magenta">/ HOW IT WORKS</p>
              <h2 className="font-display text-4xl md:text-5xl leading-[0.9] mt-2">ONE SUNDAY. TWO HALVES.</h2>
              <p className="mt-3 max-w-2xl text-base text-ink/80">Every stop runs the same shape. Afternoon for pets, evening for the floor.</p>
            </Reveal>
            <div className="mt-10 grid md:grid-cols-4 gap-4 relative">
              <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-1 bg-ink/20 z-0" />
              {EXPECT.map((e, i) => (
                <motion.div key={e.title}
                  initial={{ opacity: 0, y: 30, rotate: i % 2 === 0 ? -2 : 2 }}
                  whileInView={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -1.5 : 1.5 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
                  whileHover={{ rotate: 0, y: -3, transition: { duration: 0.2 } }}
                  className={`${e.bg} ${e.text} border-4 border-ink chunk-shadow p-5 relative z-10`}
                >
                  <div className="text-4xl mb-2" aria-hidden>{e.emoji}</div>
                  <p className="font-display text-[10px] opacity-80">{e.eyebrow}</p>
                  <h3 className="font-display text-xl md:text-2xl mt-1">{e.title}</h3>
                  <p className="mt-2 text-sm opacity-90">{e.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>


        {/* ── THE MUSIC ── */}
        <section className="bg-ink text-cream py-10 md:py-14 border-b-4 border-ink overflow-hidden">
          <div className="container">
            <Reveal>
              <p className="font-display text-xs text-acid-yellow">/ THE MUSIC</p>
              <h2 className="font-display text-4xl md:text-5xl leading-[0.9] mt-2">WHAT YOU&apos;LL <span className="text-magenta">HEAR</span>.</h2>
              <p className="mt-3 max-w-xl text-base text-cream/80">Easy in the day, proper after dark. Come for the pets, stay for the floor.</p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "OPEN DECK", sub: "Contest winner", bg: "bg-acid-yellow", text: "text-ink" },
                  { label: "CCD RESIDENT", sub: "One of our own", bg: "bg-magenta", text: "text-cream" },
                  { label: "LOCAL SELECTA", sub: "From the city", bg: "bg-electric-blue", text: "text-cream" },
                  { label: "THE LEGEND", sub: "Closing the night", bg: "bg-cream", text: "text-ink" },
                ].map((slot) => (
                  <div key={slot.label} className={`${slot.bg} ${slot.text} border-4 border-cream chunk-shadow p-4`}>
                    <p className="font-display text-base md:text-lg leading-tight">{slot.label}</p>
                    <p className="text-xs mt-1 opacity-80">{slot.sub}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          {/* Artist marquee */}
          <div className="mt-8">
            <div className="container mb-3"><p className="font-display text-xs text-cream/60">/ ARTISTS WE LOVE</p></div>
            <div className="relative overflow-hidden">
              <motion.div className="flex gap-3 whitespace-nowrap" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 28, ease: "linear", repeat: Infinity }}>
                {[...ARTISTS, ...ARTISTS].map((a, i) => (
                  <span key={`${a}-${i}`} className={`font-display text-xl md:text-3xl px-4 py-2 border-4 border-cream chunk-shadow shrink-0 ${i % 3 === 0 ? "bg-acid-yellow text-ink" : i % 3 === 1 ? "bg-magenta text-cream" : "bg-electric-blue text-cream"}`}>
                    {a}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
          <div className="container mt-8">
            <div className="flex flex-wrap gap-2">
              {["House", "Disco", "Breaks", "UKG", "DnB", "Groove"].map((g) => (
                <span key={g} className="font-display text-xs px-3 py-1 border-2 border-cream/60 text-cream/85">{g}</span>
              ))}
            </div>
          </div>
        </section>


        {/* ── THE TOUR · vertical city timeline ── */}
        <section id="tour" className="bg-electric-blue text-cream py-12 md:py-16 border-b-4 border-ink">
          <div className="container">
            <Reveal>
              <p className="font-display text-xs text-acid-yellow">/ THE TOUR</p>
              <h2 className="font-display text-4xl md:text-5xl leading-[0.9] mt-2">FOUR CITIES. ONE SUNDAY EACH.</h2>
              <p className="text-base md:text-lg mt-3 max-w-2xl text-cream/85">Same format, different rooms. Bangalore → Bombay → Hyderabad → Delhi.</p>
            </Reveal>

            <div className="relative mt-10 md:pl-12">
              <div className="absolute left-5 md:left-6 top-2 bottom-2 w-1 bg-cream/30" aria-hidden />
              <div className="space-y-10 md:space-y-14">
                {STOPS.map((stop, i) => (
                  <motion.article key={stop.slug}
                    initial={{ opacity: 0, x: -20, y: 20 }}
                    whileInView={{ opacity: 1, x: 0, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.55, delay: i * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
                    className="relative pl-14 md:pl-16"
                  >
                    <div className={`absolute left-0 top-0 w-11 h-11 md:w-12 md:h-12 grid place-items-center border-4 border-cream chunk-shadow font-display text-base z-10 ${stop.badge === "next" ? "bg-acid-yellow text-ink" : "bg-ink text-cream"}`}>
                      {stop.num}
                    </div>

                    <div className={`relative ${stop.bg} ${stop.text} border-4 border-cream chunk-shadow p-5 md:p-6`}>
                      {stop.badge === "next" && <span className="absolute -top-3 left-4 bg-acid-yellow text-ink font-display text-[10px] px-2 py-1 border-2 border-ink chunk-shadow">▶ NEXT UP</span>}

                      <div className="grid md:grid-cols-[1fr_auto] gap-5 md:gap-6 items-start">
                        <div>
                          <h3 className="font-display text-2xl md:text-4xl leading-tight">{stop.city}</h3>
                          <p className={`font-display text-xs mt-1 ${stop.accent}`}>{stop.tagline}</p>
                          <p className="mt-3 text-sm md:text-base opacity-90">{stop.desc}</p>
                          <div className="mt-4 border-t-2 border-cream/30 pt-3">
                            <p className="font-display text-[10px] opacity-80">LINEUP</p>
                            <p className="mt-1 text-sm opacity-95">{stop.lineup}</p>
                          </div>
                          <div className="mt-4 flex items-end justify-between gap-3 flex-wrap">
                            <div>
                              <p className="font-display text-xs md:text-sm">{stop.date}</p>
                              <p className="text-[11px] opacity-80">{stop.venue}</p>
                            </div>
                            <Link href={stop.badge === "next" ? "/events/ccdxsocial-01?rsvp=1" : `/events/${stop.slug}`} className="inline-block bg-cream text-ink font-display text-xs px-3 py-2 border-4 border-ink chunk-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform">
                              RSVP →
                            </Link>
                          </div>
                        </div>
                        <div className="w-full md:w-44 lg:w-52 shrink-0">
                          <PosterImg src={stop.poster ?? null} fallbackSrc={stop.posterFallback} city={stop.city} />
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* ── JUST PULL UP ── */}
        <section className="bg-acid-yellow text-ink py-12 md:py-16 border-b-4 border-ink relative overflow-hidden">
          <div className="container relative">
            <Reveal>
              <p className="font-display text-xs text-magenta">/ HOW TO JOIN</p>
              <h2 className="font-display text-4xl md:text-6xl leading-[0.9] mt-2 max-w-3xl">NO STEPS. NO LISTS. <span className="text-magenta">JUST PULL UP.</span></h2>
              <p className="mt-4 max-w-2xl text-base md:text-lg">RSVP, show up Sunday, stay for the floor. Dogs and cats welcome — no dress code, no cover.</p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/events/ccdxsocial-01?rsvp=1" className="inline-block bg-ink text-cream font-display text-base md:text-lg px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform">RSVP →</Link>
                <a href="https://wa.me/?text=Come%20to%20CCD%20%C3%97%20Social%20with%20me%20%E2%80%94%20https%3A%2F%2Fcatscandance.com%2Fccdxsocial" target="_blank" rel="noopener" className="inline-block bg-cream text-ink font-display text-base md:text-lg px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform">BRING THE PACK →</a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FOR BRANDS ── */}
        <section className="bg-ink text-cream py-12 md:py-16 border-b-4 border-ink">
          <div className="container grid lg:grid-cols-2 gap-8 items-center">
            <Reveal>
              <p className="font-display text-xs text-acid-yellow">/ FOR BRANDS</p>
              <h2 className="font-display text-4xl md:text-5xl leading-[0.9] mt-2">4 CITIES. 4 SUNDAYS. <span className="text-magenta">ONE AUDIENCE</span> THAT SHOWS UP.</h2>
              <p className="mt-4 text-base md:text-lg max-w-xl text-cream/85">Put your brand in the room — not on a banner outside it. We curate 2–3 partners per show.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/ccdxsocial/sponsor" className="inline-block bg-acid-yellow text-ink font-display text-base md:text-lg px-6 py-3 border-4 border-cream chunk-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform">BECOME A PARTNER →</Link>
                <a href="mailto:hello@catscandance.com?subject=CCD×SOCIAL Sponsorship" className="inline-block bg-transparent text-cream font-display text-base md:text-lg px-6 py-3 border-4 border-cream hover:bg-cream hover:text-ink transition-colors">EMAIL US</a>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="grid gap-3">
                {[
                  { label: "Tour Partner", desc: "All four cities — headline presence everywhere", bg: "bg-magenta" },
                  { label: "City Sponsor", desc: "Own a single city end to end", bg: "bg-electric-blue" },
                  { label: "Community Supporter", desc: "Light touch across the tour", bg: "bg-acid-yellow text-ink" },
                ].map((t) => (
                  <Link key={t.label} href="/ccdxsocial/sponsor" className={`flex items-center justify-between gap-3 ${t.bg} border-4 border-cream chunk-shadow p-4 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform`}>
                    <div><p className="font-display text-lg md:text-xl">{t.label}</p><p className="text-xs opacity-80 mt-1">{t.desc}</p></div>
                    <span className="font-display text-xs">ENQUIRE →</span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
