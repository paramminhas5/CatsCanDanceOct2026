/**
 * Homepage (v3).
 *
 *   Hero → Tonight ticker → What we are building →
 *   01 Nights: the demo, This week, then our Episodes (next one plus every past one) →
 *   02 Artists (featured, playable), then the artist story (one real page updating itself) → 03 School (the real app, a beat that builds itself) →
 *   Your account → Work with us → Footer
 *
 * Every demo plays itself and can be clicked. Sections with nothing to show do not render.
 * Data comes in through getStaticProps (pages/index.tsx, src/lib/home.ts).
 */
import { useEffect } from "react";
import dynamic from "next/dynamic";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import SEO from "@/components/SEO";
import TonightTicker from "@/components/home/TonightTicker";
import Overview from "@/components/home/Overview";
import NightsDemo from "@/components/home/NightsDemo";
import ArtistsCarousel from "@/components/home/ArtistsCarousel";
import SchoolDemo from "@/components/home/SchoolDemo";
import EpisodeSpotlight from "@/components/home/EpisodeSpotlight";
import WeekRow from "@/components/home/WeekRow";
import AccountBlock from "@/components/home/AccountBlock";
import WorkWithUs from "@/components/home/WorkWithUs";
import ArtistStory from "@/components/home/ArtistStory";
import type { HomeData } from "@/lib/home";

const Footer = dynamic(() => import("@/components/Footer"));
const MoonwalkCat = dynamic(() => import("@/components/MoonwalkCat"), { ssr: false });

/** Cats wiggle faster while the page is scrolling. */
function useScrollingClass() {
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const on = () => {
      document.body.classList.add("is-scrolling");
      clearTimeout(t);
      t = setTimeout(() => document.body.classList.remove("is-scrolling"), 180);
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); clearTimeout(t); document.body.classList.remove("is-scrolling"); };
  }, []);
}

const Index = (data: HomeData) => {
  useScrollingClass();
  const next = data.next;

  return (
    <>
      <SEO
        title="Cats Can Dance: nights, artists and a school for electronic music in India"
        description="Find a night and a crew to go with. Look up South Asian electronic artists and book them. Learn to produce and DJ on a real instrument. Our own Episodes in Bengaluru."
        path="/"
        keywords="india electronic music, bangalore underground, cats can dance, gig guide india, book a dj india, learn music production india"
      />
      <main className="bg-background text-foreground">
        <Nav />
        <MoonwalkCat />
        <Hero
          next={next ? { slug: next.slug, title: next.title, venue: next.venue, event_date: next.event_date } : null}
          hasTickets={data.nextHasTickets}
        />
        <TonightTicker tonight={data.tonight} week={data.week} today={data.today} />
        <Overview weekCount={data.weekCount} artistCount={data.artistCount} />
        <NightsDemo week={data.week} next={next} hasTickets={data.nextHasTickets} today={data.today} />
        <WeekRow week={data.week} count={data.weekCount} cities={data.weekCities} today={data.today} />
        <EpisodeSpotlight next={next} past={data.past} hasTickets={data.nextHasTickets} lineup={data.nextLineup} />
        <ArtistsCarousel artists={data.featured} count={data.artistCount} />
        <ArtistStory story={data.story} />
        <SchoolDemo />
        <AccountBlock />
        <WorkWithUs />
        <Footer />
      </main>
    </>
  );
};

export default Index;
