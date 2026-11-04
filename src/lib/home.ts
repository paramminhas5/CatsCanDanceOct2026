/**
 * Everything the homepage needs, fetched once in getStaticProps so the first HTML
 * already carries the next Episode, this week's nights, the roster and the tour.
 * Nothing here calls AI or needs the service key. Falls back to empty lists when
 * the database is unreachable so the page still builds.
 */
import { getCcdEvents, getSceneEvents, getTouring, select, type Artist, type CcdEvent, type SceneBoardEvent, type TouringDate } from "@/lib/ccd-db";
import { matchArtists, type FindArtist } from "@/lib/find";
import { isListed, nightStatus, todayIST } from "@/lib/nights";

export type HomeNight = SceneBoardEvent & { artists: FindArtist[] };

export type HomeArtist = Pick<Artist, "slug" | "name" | "based_city" | "genres" | "photo_url" | "is_resident" | "mix_url" | "open_to_bookings" | "played_ccd">;

export type HomeData = {
  /** Next listed CCD night, or null. */
  next: CcdEvent | null;
  /** Past Episodes, newest first, up to 6. */
  past: CcdEvent[];
  /** Lineup of the next night with roster slugs where we have the artist. */
  nextLineup: { name: string; slug: string | null }[];
  /** Does the next night have tickets on sale (any public tier)? */
  nextHasTickets: boolean;
  /** Scene nights tonight, for the ticker. */
  tonight: HomeNight[];
  /** Scene nights in the next 7 days, soonest first, up to 6. */
  week: HomeNight[];
  /** Total published scene nights in the next 7 days. */
  weekCount: number;
  /** Cities with a night this week. */
  weekCities: string[];
  /** Roster picks with photos, up to 6. */
  roster: HomeArtist[];
  /** Approved artists in the roster. */
  artistCount: number;
  /** Next tour dates, up to 6. */
  tour: TouringDate[];
  /** YYYY-MM-DD in India at build time. */
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

  const [ours, scene, artistNames, artists, tourAll, countRows] = await Promise.all([
    getCcdEvents(),
    getSceneEvents(),
    select<FindArtist>("artists?status=eq.approved&select=name,slug", 1800),
    select<HomeArtist>(
      "artists?status=eq.approved&photo_url=not.is.null&select=slug,name,based_city,genres,photo_url,is_resident,mix_url,open_to_bookings,played_ccd&order=is_resident.desc,featured.desc,rank.asc.nullslast,name.asc&limit=12",
      600,
    ),
    getTouring(),
    select<{ slug: string }>("artists?status=eq.approved&select=slug", 1800),
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
      const { rpc } = await import("@/lib/ccd-db");
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

  // Spread the six across days and cities rather than six from one Friday.
  const picked: SceneBoardEvent[] = [];
  const seenDay = new Map<string, number>();
  for (const e of [...inWeek].sort((a, b) => Number(b.featured) - Number(a.featured) || (a.event_date ?? "").localeCompare(b.event_date ?? ""))) {
    const k = e.event_date ?? "";
    if ((seenDay.get(k) ?? 0) >= 2) continue;
    seenDay.set(k, (seenDay.get(k) ?? 0) + 1);
    picked.push(e);
    if (picked.length === 6) break;
  }
  const week = picked.sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? "")).map(withArtists);

  const roster = artists.filter((a) => a.photo_url).slice(0, 6);
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nextLineup = (next?.lineup ?? []).map((name) => ({ name, slug: artistNames.find((a) => norm(a.name) === norm(name))?.slug ?? null }));
  const tour = tourAll.filter((t) => t.to_date >= today).slice(0, 6);

  return {
    next,
    past,
    nextLineup,
    nextHasTickets,
    tonight,
    week,
    weekCount: inWeek.length,
    weekCities,
    roster,
    artistCount: countRows.length,
    tour,
    today,
  };
}
