/**
 * Everything the homepage needs, fetched once in getStaticProps so the first HTML
 * already carries the next Episode, this week's nights, the featured artists and the tour.
 * Nothing here calls AI or needs the service key. Falls back to empty lists when
 * the database is unreachable so the page still builds.
 */
import { getCcdEvents, getSceneEvents, getTouring, select, rpc, type CcdEvent, type SceneBoardEvent, type TouringDate } from "@/lib/ccd-db";
import { matchArtists, type FindArtist } from "@/lib/find";
import { isListed, nightStatus, todayIST } from "@/lib/nights";

export type HomeNight = SceneBoardEvent & { artists: FindArtist[] };

/** One artist in the homepage carousel. Every value comes from a sourced row. */
export type FeaturedArtist = {
  slug: string;
  name: string;
  city: string | null;
  genres: string[];
  label: string | null;
  photo: string;
  eras: { years: string; label: string | null; sound: string }[];
  stats: { n: string; l: string }[];
  latest: { title: string; meta: string; deezer: string | null }[];
  extra: string | null;
  conn: { label: string; to: string } | null;
};

/** The artist story on the home: one real artist page with its newest gig, release and press. */
export type ArtistStory = {
  slug: string; name: string; city: string | null; genres: string[]; label: string | null; photo: string;
  gig: { title: string; venue: string | null; city: string | null; date: string; time: string | null };
  release: { title: string; meta: string } | null;
  olderReleases: { title: string; meta: string }[];
  press: { outlet: string; title: string } | null;
  counts: { releases: number; press: number; eras: number; since: number | null };
};

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
  tour: TouringDate[];
  story: ArtistStory | null;
  today: string;
};

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Cand = { slug: string; name: string; based_city: string | null; genres: string[] | null; labels: string | null; photo_url: string | null; is_resident: boolean | null };
type Era = { artist_slug: string; from_year: number; to_year: number | null; sound: string | null; label: string | null };
type Rel = { artist_slug: string; title: string; year: number | null; release_type: string | null; label: string | null; deezer_track_id: string | number | null };
type Gig = { artist_slug: string; event_name: string; city: string | null; event_date: string | null };
type Press = { artist_slug: string; publication: string | null };

/** Pick six artists with the most complete sourced pages, and find links between them in release titles. */
async function getFeatured(): Promise<FeaturedArtist[]> {
  const cands = await select<Cand>(
    "artists?status=eq.approved&photo_url=not.is.null&select=slug,name,based_city,genres,labels,photo_url,is_resident&limit=200",
    1800,
  );
  if (!cands.length) return [];
  const inList = cands.map((c) => c.slug).join(",");
  const [eras, rels, gigs, press] = await Promise.all([
    select<Era>(`artist_eras?artist_slug=in.(${inList})&select=artist_slug,from_year,to_year,sound,label&order=from_year.asc`, 1800),
    select<Rel>(`artist_discography?artist_slug=in.(${inList})&select=artist_slug,title,year,release_type,label,deezer_track_id&order=year.desc.nullslast`, 1800),
    select<Gig>(`artist_gigs?artist_slug=in.(${inList})&verified=is.true&select=artist_slug,event_name,city,event_date&order=event_date.desc.nullslast`, 1800),
    select<Press>(`artist_press?artist_slug=in.(${inList})&select=artist_slug,publication`, 1800),
  ]);
  const by = <T extends { artist_slug: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.artist_slug, [...(m.get(r.artist_slug) ?? []), r]);
    return m;
  };
  const E = by(eras), R = by(rels), G = by(gigs), P = by(press);

  const scored = cands
    .map((c) => {
      const e = E.get(c.slug) ?? [], r = R.get(c.slug) ?? [], g = G.get(c.slug) ?? [], p = P.get(c.slug) ?? [];
      const score = e.length * 4 + Math.min(r.length, 12) + Math.min(g.length, 12) + Math.min(p.length, 12) + (r.length ? 4 : 0);
      return { c, e, r, g, p, score };
    })
    .filter((x) => x.e.length > 0 && x.r.length > 0 && x.e.some((e) => e.sound))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const out: FeaturedArtist[] = scored.map(({ c, e, r, g, p }) => {
    const stats = [
      { n: r.length, l: r.length === 1 ? "release" : "releases" },
      { n: g.length, l: g.length === 1 ? "verified gig" : "verified gigs" },
      { n: p.length, l: p.length === 1 ? "press piece" : "press pieces" },
    ].filter((x) => x.n > 0).slice(0, 3).map((x) => ({ n: String(x.n), l: x.l }));
    const outlets = Array.from(new Set(p.map((x) => x.publication).filter(Boolean) as string[])).slice(0, 3);
    const lastGig = g[0];
    const extra = lastGig && lastGig.event_date
      ? `Last played ${lastGig.event_name}${lastGig.city ? `, ${lastGig.city}` : ""}, ${shortDate(lastGig.event_date)}`
      : outlets.length ? `Press: ${outlets.join(", ")}` : null;
    // A link to another featured artist: their name in one of this artist's release titles.
    let conn: FeaturedArtist["conn"] = null;
    for (const other of scored) {
      if (other.c.slug === c.slug) continue;
      const hit = r.find((x) => norm(x.title).includes(norm(other.c.name)));
      if (hit) { conn = { label: hit.title, to: other.c.slug }; break; }
      const back = other.r.find((x) => norm(x.title).includes(norm(c.name)));
      if (back) { conn = { label: `${other.c.name}: ${back.title}`, to: other.c.slug }; break; }
    }
    return {
      slug: c.slug,
      name: c.name,
      city: c.based_city,
      genres: (c.genres ?? []).slice(0, 3),
      label: c.labels ? c.labels.split(",")[0].trim() : r.find((x) => x.label)?.label ?? null,
      photo: c.photo_url as string,
      eras: e.filter((x) => x.sound).map((x) => ({ years: `${x.from_year} to ${x.to_year ?? "now"}`, label: x.label, sound: x.sound as string })),
      stats,
      latest: r.slice(0, 2).map((x) => ({
        title: x.title,
        meta: [x.release_type ? cap(x.release_type) : null, x.year, x.label].filter(Boolean).join(" · "),
        deezer: x.deezer_track_id ? String(x.deezer_track_id) : null,
      })),
      extra,
      conn,
    };
  });

  // Put connected artists next to each other so the link is one step away.
  const ordered: FeaturedArtist[] = [];
  for (const a of out) {
    if (ordered.includes(a)) continue;
    ordered.push(a);
    const partner = a.conn ? out.find((x) => x.slug === a.conn!.to) : null;
    if (partner && !ordered.includes(partner)) ordered.push(partner);
  }
  return ordered;
}

/** An artist whose next gig was found by the gig radar, with the most complete page among those. */
export async function getStory(): Promise<ArtistStory | null> {
  const ups = await rpc<any[]>("tour_board", {}).catch(() => [] as any[]);
  const gigs = (ups ?? []).filter((r) => r.src === "gig" && r.artist_slug).sort((a, b) => String(a.from_date).localeCompare(String(b.from_date)));
  const slugs = Array.from(new Set(gigs.map((g) => g.artist_slug as string))).slice(0, 30);
  if (!slugs.length) return null;
  const inList = slugs.join(",");
  const [artists, rels, press, eras] = await Promise.all([
    select<Cand>(`artists?status=eq.approved&photo_url=not.is.null&slug=in.(${inList})&select=slug,name,based_city,genres,labels,photo_url,is_resident`, 1800),
    select<Rel>(`artist_discography?artist_slug=in.(${inList})&select=artist_slug,title,year,release_type,label,deezer_track_id&order=year.desc.nullslast`, 1800),
    select<{ artist_slug: string; publication: string | null; title: string | null; date_published: string | null }>(`artist_press?artist_slug=in.(${inList})&select=artist_slug,publication,title,date_published&order=date_published.desc.nullslast`, 1800),
    select<Era>(`artist_eras?artist_slug=in.(${inList})&select=artist_slug,from_year,to_year,sound,label`, 1800),
  ]);
  const best = artists
    .map((a) => {
      const r = rels.filter((x) => x.artist_slug === a.slug), p = press.filter((x) => x.artist_slug === a.slug), e = eras.filter((x) => x.artist_slug === a.slug);
      return { a, r, p, e, score: Math.min(r.length, 12) + Math.min(p.length, 8) * 2 + e.length * 3 };
    })
    .filter((x) => x.r.length > 1 && x.p.length > 0)
    .sort((x, y) => y.score - x.score)[0];
  if (!best) return null;
  const g = gigs.find((x) => x.artist_slug === best.a.slug)!;
  const meta = (x: Rel) => [x.release_type ? cap(x.release_type) : null, x.year, x.label].filter(Boolean).join(" · ");
  const years = best.e.map((x) => x.from_year).filter(Boolean);
  const pr = best.p.find((x) => x.publication && x.title) ?? null;
  return {
    slug: best.a.slug, name: best.a.name, city: best.a.based_city, genres: (best.a.genres ?? []).slice(0, 3),
    label: best.a.labels ? best.a.labels.split(",")[0].trim() : best.r.find((x) => x.label)?.label ?? null,
    photo: best.a.photo_url as string,
    gig: { title: g.title ?? "", venue: g.venue ?? null, city: g.city ?? null, date: g.from_date, time: null },
    release: best.r[0] ? { title: best.r[0].title, meta: meta(best.r[0]) } : null,
    olderReleases: best.r.slice(1, 3).map((x) => ({ title: x.title, meta: meta(x) })),
    press: pr ? { outlet: pr.publication as string, title: pr.title as string } : null,
    counts: { releases: best.r.length, press: best.p.length, eras: best.e.length, since: years.length ? Math.min(...years) : null },
  };
}

export async function getHomeData(): Promise<HomeData> {
  const today = todayIST();
  const weekEnd = addDays(today, 7);

  const [ours, scene, artistNames, featured, tourAll, story] = await Promise.all([
    getCcdEvents(),
    getSceneEvents(),
    select<FindArtist>("artists?status=eq.approved&select=name,slug", 1800),
    getFeatured().catch(() => [] as FeaturedArtist[]),
    getTouring(),
    getStory().catch(() => null),
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
    featured,
    artistCount: artistNames.length,
    tour,
    story,
    today,
  };
}
