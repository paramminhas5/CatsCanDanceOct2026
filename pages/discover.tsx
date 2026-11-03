import type { GetStaticProps } from "next";
import DiscoverPage, { type FindProps } from "@/pages/Discover";
import { getSceneEvents, select } from "@/lib/ccd-db";
import { matchArtists, type FindArtist } from "@/lib/find";
import { isListed, todayIST } from "@/lib/nights";

export default DiscoverPage;

// Find (Prowl) is served at /prowl through a rewrite. The list is built here so it ships in the HTML.
export const getStaticProps: GetStaticProps<FindProps> = async () => {
  const today = todayIST();
  const [scene, artists, ours] = await Promise.all([
    getSceneEvents(),
    select<FindArtist>("artists?status=eq.approved&select=name,slug", 1800),
    select<any>(`events?published=eq.true&event_date=gte.${today}&order=event_date.asc&limit=5`, 300),
  ]);
  const next = ours.find((e) => isListed(e)) ?? null;
  return {
    props: {
      events: scene.map((e) => ({ ...e, artists: matchArtists(e, artists) })),
      ours: next ? { slug: next.slug, title: next.title, event_date: next.event_date, date: next.date, venue: next.venue, city: next.city, start_time: next.start_time } : null,
      updated: today,
    },
    revalidate: 600,
  };
};
