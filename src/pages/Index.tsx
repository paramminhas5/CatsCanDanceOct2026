/**
 * Homepage — clean, non-repetitive layout.
 *
 * Sections:
 *   Nav → Hero → Identity strip → About → Early Access →
 *   HomepageEvents (single unified section) →
 *   Videos → Playlist → Drops → Instagram → Contact → Footer
 *
 * Performance: Hero + Nav load eagerly (above-the-fold).
 * Everything below the fold is lazy-loaded to reduce initial JS bundle.
 */
import { lazy, Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLocation } from "@/lib/compat-router";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import SEO from "@/components/SEO";

// Below-the-fold components — loaded after initial paint
const MarqueeBySlot = dynamic(() => import("@/components/MarqueeBySlot"));
const About = dynamic(() => import("@/components/About"));
const HomepageEvents = dynamic(() => import("@/components/HomepageEvents"));
const Contact = dynamic(() => import("@/components/Contact"));
const Footer = dynamic(() => import("@/components/Footer"));
import SectionReveal from "@/components/SectionReveal";
const MoonwalkCat = dynamic(() => import("@/components/MoonwalkCat"), { ssr: false });

const Playlist = lazy(() => import("@/components/Playlist"));
const Drops = lazy(() => import("@/components/Drops"));
const Videos = lazy(() => import("@/components/Videos"));
const EarlyAccess = lazy(() => import("@/components/EarlyAccess"));
const Instagram = dynamic(() => import("@/components/Instagram"), { ssr: false });

const SectionFallback = ({ bg = "bg-cream" }: { bg?: string }) => (
  <div className={`${bg} border-b-4 border-ink min-h-[220px] animate-pulse`} aria-hidden />
);

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash === "#early-access") {
      setTimeout(() => {
        document.getElementById("early-access")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [location.hash]);

  return (
    <>
      <SEO
        title="Cats Can Dance — India's Underground Electronic Music Scene"
        description="Discover India's underground electronic music scene. Events in Bengaluru, Mumbai, Delhi & Goa. Limited apparel drops. Free RSVP events."
        path="/"
        keywords="india electronic music, bangalore underground, cats can dance, ccd events, underground dance music india"
      />
      <main className="bg-background text-foreground">
        <Nav />
        <MoonwalkCat />
        <Hero />

        {/* ── Identity strip ── */}
        <div className="bg-ink border-b-4 border-ink py-3 px-4">
          <p className="container font-display text-cream text-xs md:text-sm uppercase tracking-[0.18em] text-center">
            Bengaluru underground crew · Dance music episodes · Limited streetwear drops
          </p>
        </div>

        <MarqueeBySlot id="above-about" />
        <SectionReveal><About /></SectionReveal>

        {/* ── Events — one unified section, no repetition ── */}
        <SectionReveal><HomepageEvents /></SectionReveal>

        <MarqueeBySlot id="above-videos" />
        <Suspense fallback={<SectionFallback bg="bg-ink" />}>
          <SectionReveal><Videos /></SectionReveal>
        </Suspense>

        <MarqueeBySlot id="above-playlist" />
        <Suspense fallback={<SectionFallback bg="bg-magenta" />}>
          <SectionReveal><Playlist /></SectionReveal>
        </Suspense>

        <MarqueeBySlot id="above-drops" />
        <Suspense fallback={<SectionFallback bg="bg-cream" />}>
          <SectionReveal id="drops"><Drops /></SectionReveal>
        </Suspense>

        <Suspense fallback={<SectionFallback bg="bg-electric-blue" />}>
          <SectionReveal><EarlyAccess /></SectionReveal>
        </Suspense>

        <MarqueeBySlot id="above-instagram" />
        <SectionReveal><Instagram /></SectionReveal>

        <Contact />
        <Footer />
      </main>
    </>
  );
};

export default Index;
