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
    select<any>(`events?published=eq.true&promoter_id=is.null&event_date=gte.${today}&order=event_date.asc&limit=5`, 300),
  ]);
  const next = ours.find((e) => isListed(e)) ?? null;
  // Promoter nights on CCD (migration 056): approved promoters, published nights. They sit in the list like any other night.
  const pn = await select<any>(`events?promoter_id=not.is.null&published=is.true&event_date=gte.${today}&select=slug,title,venue,city,event_date,start_time,genres,lineup,promoter_id&order=event_date.asc&limit=60`, 300).catch(() => []);
  const pids = Array.from(new Set(pn.map((e: any) => e.promoter_id)));
  const pros = pids.length ? await select<any>(`promoters?status=eq.approved&id=in.(${pids.join(",")})&select=id,name`, 300).catch(() => []) : [];
  const pname = new Map(pros.map((p: any) => [p.id, p.name]));
  const promoterNights = pn.filter((e: any) => pname.has(e.promoter_id)).map((e: any) => ({
    id: e.slug, night_key: e.slug, presenter: pname.get(e.promoter_id) as string, title: e.title, url: `/nights/${e.slug}`, ticket_url: null, source: "ccd",
    city: e.city, venue: e.venue, event_date: e.event_date, event_time: e.start_time, genres: e.genres ?? [], lineup: e.lineup ?? [], kind: "club" as const, featured: false,
  }));
  return {
    props: {
      events: [...promoterNights, ...scene]
        .map((e) => ({ ...e, artists: matchArtists(e as any, artists) }))
        .sort((x, y) => (x.event_date ?? "9999").localeCompare(y.event_date ?? "9999") || Number(y.featured) - Number(x.featured)),
      ours: next ? { slug: next.slug, title: next.title, event_date: next.event_date, date: next.date, venue: next.venue, city: next.city, start_time: next.start_time } : null,
      updated: today,
    },
    revalidate: 600,
  };
};
