/**
 * Homepage.
 *
 *   Nav → Hero (kept as is) → Tonight ticker → Three products → Next Episode →
 *   This week (What's on + crews) → The roster (Artists + tour) → Learn →
 *   Instagram → Join → Contact → Footer
 *
 * Sections with nothing to show do not render. Data comes in through getStaticProps
 * (pages/index.tsx) so the first HTML already has the nights and artists.
 */
import { lazy, Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLocation } from "@/lib/compat-router";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import SEO from "@/components/SEO";
import TonightTicker from "@/components/home/TonightTicker";
import ProductTrio from "@/components/home/ProductTrio";
import NextEpisode from "@/components/home/NextEpisode";
import ThisWeek from "@/components/home/ThisWeek";
import Roster from "@/components/home/Roster";
import LearnBand from "@/components/home/LearnBand";
import SectionReveal from "@/components/SectionReveal";
import type { HomeData } from "@/lib/home";

const Contact = dynamic(() => import("@/components/Contact"));
const Footer = dynamic(() => import("@/components/Footer"));
const MoonwalkCat = dynamic(() => import("@/components/MoonwalkCat"), { ssr: false });
const Instagram = dynamic(() => import("@/components/Instagram"), { ssr: false });
const EarlyAccess = lazy(() => import("@/components/EarlyAccess"));

const SectionFallback = ({ bg = "bg-cream" }: { bg?: string }) => (
  <div className={`${bg} border-b-4 border-ink min-h-[220px] animate-pulse`} aria-hidden />
);

const daysUntil = (iso: string | null | undefined, today: string) => {
  if (!iso) return null;
  const a = new Date(`${today}T00:00:00Z`).getTime();
  const b = new Date(`${iso}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
};

const Index = (data: HomeData) => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash === "#early-access") {
      setTimeout(() => {
        document.getElementById("early-access")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [location.hash]);

  const next = data.next;
  const days = next ? daysUntil(next.event_date, data.today) : null;
  const nightsStat = next
    ? days === 0
      ? { n: "Tonight", label: next.episode_no ? `Episode ${next.episode_no}` : next.title }
      : { n: days ?? "Soon", label: days === 1 ? "day to the next Episode" : "days to the next Episode" }
    : { n: data.past.length, label: "Episodes so far" };

  return (
    <>
      <SEO
        title="Cats Can Dance: nights, the gig guide and the roster for India's underground"
        description="Our own nights, every night worth going to this week with a crew to go with, and the roster of South Asian electronic artists. Bengaluru, Mumbai, Delhi, Goa."
        path="/"
        keywords="india electronic music, bangalore underground, cats can dance, ccd events, gig guide india, book a dj india"
      />
      <main className="bg-background text-foreground">
        <Nav />
        <MoonwalkCat />
        <Hero
          next={next ? { slug: next.slug, title: next.title, venue: next.venue, event_date: next.event_date } : null}
          hasTickets={data.nextHasTickets}
        />
        <TonightTicker tonight={data.tonight} week={data.week} today={data.today} />

        <SectionReveal>
          <ProductTrio
            nights={nightsStat}
            whatsOn={{ n: data.weekCount, label: data.weekCount === 1 ? "night this week" : "nights this week" }}
            artists={{ n: data.artistCount, label: "artists on the roster" }}
          />
        </SectionReveal>

        <SectionReveal><NextEpisode next={next} past={data.past} hasTickets={data.nextHasTickets} lineup={data.nextLineup} /></SectionReveal>
        <SectionReveal><ThisWeek week={data.week} count={data.weekCount} cities={data.weekCities} today={data.today} /></SectionReveal>
        <SectionReveal><Roster roster={data.roster} count={data.artistCount} tour={data.tour} /></SectionReveal>
        <LearnBand />

        <SectionReveal><Instagram /></SectionReveal>

        <Suspense fallback={<SectionFallback bg="bg-electric-blue" />}>
          <SectionReveal><EarlyAccess /></SectionReveal>
        </Suspense>

        <Contact />
        <Footer />
      </main>
    </>
  );
};

export default Index;
