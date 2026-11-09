/**
 * Data for the Artists front page (board W39-Artists): roster size, a few artists to start with,
 * roster artists on this week's published nights, and the newest releases across the roster.
 * Real data only. Each list can come back empty and the page then leaves that block out.
 */
import { getArtists, getSceneEvents, matchArtists, select, todayIST, REVALIDATE, type Artist } from "@/lib/db";
import { displayName } from "@/lib/artist-v2";

export type FrontArtist = { slug: string; name: string; photo: string | null; line: string };
export type FrontNight = { id: string; day: string; title: string; venue: string | null; city: string | null; url: string; artists: { slug: string; name: string }[] };
export type FrontRelease = { slug: string; artist: string; title: string; type: string; date: string; label: string | null; albumId: string | null };

const TYPES: Record<string, string> = { album: "Album", ep: "EP", single: "Single", remix: "Remix" };

export async function getFront() {
  const today = todayIST();
  const [artists, events, rels] = await Promise.all([
    getArtists(),
    getSceneEvents(),
    select<{ artist_slug: string; title: string; release_type: string | null; release_date: string; label: string | null; deezer_album_id: string | null }>(
      `artist_discography?release_date=lte.${today}&release_date=not.is.null&deezer_album_id=not.is.null&select=artist_slug,title,release_type,release_date,label,deezer_album_id&order=release_date.desc&limit=40`,
      REVALIDATE, ["artists"],
    ),
  ]);
  const bySlug = new Map(artists.map((a) => [a.slug, a]));
  const line = (a: Artist) => [a.genres?.[0], a.based_city?.split(",")[0]].filter(Boolean).join(", ");

  const start: FrontArtist[] = artists.filter((a) => a.photo_url).slice(0, 8).map((a) => ({ slug: a.slug, name: displayName(a.name), photo: a.photo_url, line: line(a) }));

  const nights: FrontNight[] = events
    .filter((e) => e.event_date && e.event_date >= today)
    .map((e) => ({ e, m: matchArtists(e, artists) }))
    .filter((x) => x.m.length)
    .slice(0, 6)
    .map(({ e, m }) => ({ id: e.id, day: e.event_date as string, title: e.title, venue: e.venue, city: e.city, url: e.ticket_url ?? e.url, artists: m.map((a) => ({ slug: a.slug, name: displayName(a.name) })) }));

  // One release per artist so a prolific act does not fill the row.
  const seen = new Set<string>();
  const releases: FrontRelease[] = [];
  for (const r of rels) {
    const a = bySlug.get(r.artist_slug);
    if (!a || seen.has(r.artist_slug)) continue;
    seen.add(r.artist_slug);
    releases.push({ slug: r.artist_slug, artist: displayName(a.name), title: r.title, type: TYPES[(r.release_type ?? "").toLowerCase()] ?? "Release", date: r.release_date, label: r.label, albumId: r.deezer_album_id });
    if (releases.length === 4) break;
  }
  return { count: artists.length, start, nights, releases };
}
