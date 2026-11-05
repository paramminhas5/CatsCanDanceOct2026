/** /bengaluru-techno-events: upcoming techno nights in Bengaluru from What's on and CCD, rendered on the server. */
import GenreCityHub, { hubProps, type HubConfig, type HubProps } from "@/components/scene/GenreCityHub";

const cfg: HubConfig = {
  path: "/bengaluru-techno-events", city: "Bengaluru", cityMatch: /beng|bangal/i, genre: "Techno", genreMatch: /techno/i, genreSlug: "techno",
  title: "Techno events in Bengaluru: upcoming nights | Cats Can Dance",
  h1: "Techno in Bengaluru",
  description: "Upcoming techno nights in Bengaluru (Bangalore): dates, venues and lineups from the Cats Can Dance gig guide. Updated every half hour.",
  intro: "Every upcoming techno night in Bengaluru on What's on, our gig guide. We only list nights with a credible artist, act or promoter behind them.",
};
export const getStaticProps = hubProps(cfg);
export default function Page(p: HubProps) { return <GenreCityHub cfg={cfg} {...p} />; }
