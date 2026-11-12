/**
 * Everything the homepage needs, fetched once in getStaticProps so the first HTML
 * already carries the next Episode, this week's nights and the featured artists.
 * Nothing here calls AI or needs the service key. Falls back to empty lists when
 * the database is unreachable so the page still builds.
 *
 * The artist side (the carousel and the artist story) is in src/lib/home-artists.ts; it reads the
 * artist tables directly, so the home does not depend on the Artists product being up.
 */
import { getCcdEvents, getSceneEvents, select, rpc, type CcdEvent, type SceneBoardEvent } from "@/lib/ccd-db";
import { matchArtists, type FindArtist } from "@/lib/find";
import { isListed, nightStatus, todayIST } from "@/lib/nights";
import { getFeatured, getStory, type ArtistStory, type FeaturedArtist } from "@/lib/home-artists";

export type { ArtistStory, FeaturedArtist } from "@/lib/home-artists";
export { getStory } from "@/lib/home-artists";

export type HomeNight = SceneBoardEvent & { artists: FindArtist[] };

export type HomeData = {
  next: CcdEvent | null;
  past: CcdEvent[];
  nextLineup: { name: string; slug: string | null }[];
  nextHasTickets: boolean;
  /** Scene nights tonight, for the ticker. */
  tonight: HomeNight[];
  /** Up to 12 scene nights in the next 7 days, spread across days. */
  week: HomeNight[];
  weekCount: number;
  weekCities: string[];
  featured: FeaturedArtist[];
  artistCount: number;
  story: ArtistStory | null;
  /** Record covers for the Artists hero wall (Deezer album art), mixed across artists. */
  covers: { title: string; artist: string; slug: string; img: string; track: string | null }[];
  today: string;
};

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function getHomeData(): Promise<HomeData> {
  const today = todayIST();
  const weekEnd = addDays(today, 7);

  const [ours, scene, artistNames, featured, story, discs] = await Promise.all([
    getCcdEvents(),
    getSceneEvents(),
    select<FindArtist>("artists?status=eq.approved&select=name,slug", 1800),
    getFeatured().catch(() => [] as FeaturedArtist[]),
    getStory().catch(() => null),
    select<{ artist_slug: string; title: string; deezer_album_id: string; deezer_track_id: string | number | null }>("artist_discography?deezer_album_id=not.is.null&release_type=in.(album,ep)&select=artist_slug,title,deezer_album_id,deezer_track_id&order=year.desc.nullslast&limit=300", 1800),
  ]);

  const listed = ours.filter((e) => isListed(e as any));
  const upcoming = listed.filter((e) => nightStatus(e) === "upcoming").sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const past = listed
    .filter((e) => nightStatus(e) === "past")
    .sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""))
    .slice(0, 6);
  const next = upcoming[0] ?? null;

  let nextHasTickets = false;
  if (next) {
    try {
      const tiers = await rpc<any[]>("public_tiers", { p_slug: next.slug });
      nextHasTickets = Array.isArray(tiers) && tiers.length > 0;
    } catch {
      nextHasTickets = false;
    }
  }

  const withArtists = (e: SceneBoardEvent): HomeNight => ({ ...e, artists: matchArtists(e, artistNames) });
  const inWeek = scene
    .filter((e) => e.event_date && e.event_date >= today && e.event_date < weekEnd)
    .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? "") || (a.featured === b.featured ? 0 : a.featured ? -1 : 1));
  const tonight = inWeek.filter((e) => e.event_date === today).map(withArtists);
  const weekCities = Array.from(new Set(inWeek.map((e) => e.city).filter(Boolean) as string[]));

  // Spread the picks across days rather than twelve from one Friday.
  const picked: SceneBoardEvent[] = [];
  const seenDay = new Map<string, number>();
  for (const e of [...inWeek].sort((a, b) => Number(b.featured) - Number(a.featured) || (a.event_date ?? "").localeCompare(b.event_date ?? ""))) {
    const k = e.event_date ?? "";
    if ((seenDay.get(k) ?? 0) >= 3) continue;
    seenDay.set(k, (seenDay.get(k) ?? 0) + 1);
    picked.push(e);
    if (picked.length === 12) break;
  }
  const week = picked.sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? "")).map(withArtists);

  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nextLineup = (next?.lineup ?? []).map((name) => ({ name, slug: artistNames.find((a) => norm(a.name) === norm(name))?.slug ?? null }));

  // Up to two records per approved artist, newest first, so the wall shows the range.
  const nameOf = new Map(artistNames.map((a) => [a.slug, a.name]));
  const perArtist = new Map<string, number>();
  const covers: HomeData["covers"] = [];
  for (const r of discs) {
    if (!nameOf.has(r.artist_slug) || (perArtist.get(r.artist_slug) ?? 0) >= 2) continue;
    perArtist.set(r.artist_slug, (perArtist.get(r.artist_slug) ?? 0) + 1);
    covers.push({ title: r.title, artist: nameOf.get(r.artist_slug) as string, slug: r.artist_slug, img: `https://api.deezer.com/album/${r.deezer_album_id}/image?size=big`, track: r.deezer_track_id ? String(r.deezer_track_id) : null });
    if (covers.length === 24) break;
  }

  return {
    next,
    past,
    nextLineup,
    nextHasTickets,
    tonight,
    week,
    weekCount: inWeek.length,
    weekCities,
    featured,
    artistCount: artistNames.length,
    story,
    covers,
    today,
  };
}
