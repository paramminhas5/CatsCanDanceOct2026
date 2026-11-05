/** /bengaluru-house-parties: upcoming house and disco nights in Bengaluru from What's on and CCD, rendered on the server. */
import GenreCityHub, { hubProps, type HubConfig, type HubProps } from "@/components/scene/GenreCityHub";

const cfg: HubConfig = {
  path: "/bengaluru-house-parties", city: "Bengaluru", cityMatch: /beng|bangal/i, genre: "House", genreMatch: /house|disco|garage/i, genreSlug: "house",
  title: "House music parties in Bengaluru: upcoming nights | Cats Can Dance",
  h1: "House in Bengaluru",
  description: "Upcoming house, disco and garage nights in Bengaluru (Bangalore): dates, venues and lineups from the Cats Can Dance gig guide. Updated every half hour.",
  intro: "Every upcoming house, disco and garage night in Bengaluru on What's on, our gig guide, plus our own Episodes. We only list nights with a credible artist, act or promoter behind them.",
};
export const getStaticProps = hubProps(cfg);
export default function Page(p: HubProps) { return <GenreCityHub cfg={cfg} {...p} />; }
