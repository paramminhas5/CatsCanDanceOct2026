/**
 * Preview page only (public/preview/night): something real to play for an artist name.
 *
 * Order (identity first, newest first):
 *  1. A CCD artist with checked Deezer tracks in artist_discography: the newest release that has a 30 second preview.
 *  2. Their checked Deezer artist id (artist_external_ids): their top track.
 *  3. Their newest Bandcamp release: the page shows Bandcamp's own player.
 *  4. Their SoundCloud: the page shows SoundCloud's own player.
 *  5. Someone not in our database: Deezer search by exact name, then their top track.
 * A CCD artist with none of these gets 404 "nothing on file"; we never guess a namesake for them.
 * Nothing is stored or re-hosted. Audio streams from Deezer, Bandcamp or SoundCloud.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { select } from "@/lib/ccd-db";

type Hit =
  | { kind: "audio"; url: string; title: string; from: "Deezer" }
  | { kind: "bandcamp"; type: "album" | "track"; id: number; title: string }
  | { kind: "soundcloud"; url: string };

type Disc = {
  title: string | null;
  release_type: string | null;
  release_date: string | null;
  year: number | null;
  deezer_track_id: string | number | null;
  bandcamp_item_id: number | null;
  bandcamp_item_type: string | null;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const when = (d: Disc) => d.release_date ?? (d.year ? `${d.year}-06-30` : "0000");

async function dz<T>(path: string, signal: AbortSignal): Promise<T | null> {
  try {
    const r = await fetch(`https://api.deezer.com/${path}`, { signal });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.error ? null : (j as T);
  } catch {
    return null;
  }
}

async function topTrack(artistId: string | number, signal: AbortSignal): Promise<Hit | null> {
  const j = await dz<{ data?: { title?: string; preview?: string }[] }>(`artist/${artistId}/top?limit=5`, signal);
  const t = (j?.data ?? []).find((x) => x.preview);
  return t?.preview ? { kind: "audio", url: t.preview, title: t.title ?? "", from: "Deezer" } : null;
}

async function fromCcd(name: string, signal: AbortSignal): Promise<Hit | null | "none"> {
  const artists = await select<{ slug: string; soundcloud: string | null }>(
    `artists?name=ilike.${encodeURIComponent(name)}&status=eq.approved&select=slug,soundcloud&limit=1`,
    600,
  );
  const a = artists[0];
  if (!a) return null; // not ours: caller may search Deezer by name
  const s = encodeURIComponent(a.slug);
  const [disc, ext] = await Promise.all([
    select<Disc>(`artist_discography?artist_slug=eq.${s}&select=title,release_type,release_date,year,deezer_track_id,bandcamp_item_id,bandcamp_item_type&limit=200`, 600),
    select<{ value: string }>(`artist_external_ids?artist_slug=eq.${s}&scheme=eq.deezer&select=value&limit=1`, 600),
  ]);
  const newest = disc.slice().sort((x, y) => (when(y) > when(x) ? 1 : when(y) < when(x) ? -1 : 0));
  // 1. newest checked Deezer track with a preview (a few tries; some tracks have none)
  for (const d of newest.filter((x) => x.deezer_track_id).slice(0, 4)) {
    const t = await dz<{ preview?: string; title?: string }>(`track/${d.deezer_track_id}`, signal);
    if (t?.preview) return { kind: "audio", url: t.preview, title: t.title ?? d.title ?? "", from: "Deezer" };
  }
  // 2. checked Deezer artist id
  if (ext[0]?.value && /^\d+$/.test(ext[0].value)) {
    const t = await topTrack(ext[0].value, signal);
    if (t) return t;
  }
  // 3. newest Bandcamp release (a compilation's album player starts on someone else's track, so skip those)
  const bc = newest.find(
    (d) => d.bandcamp_item_id && (d.bandcamp_item_type === "track" || (d.bandcamp_item_type === "album" && (d.release_type ?? "").toLowerCase() !== "compilation")),
  );
  if (bc) return { kind: "bandcamp", type: bc.bandcamp_item_type as "album" | "track", id: Number(bc.bandcamp_item_id), title: bc.title ?? "" };
  // 4. SoundCloud
  if (a.soundcloud && /^https:\/\/(www\.)?soundcloud\.com\/[\w-]+/.test(a.soundcloud)) return { kind: "soundcloud", url: a.soundcloud };
  return "none";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = String(req.query.q ?? "").trim();
  if (!q || q.length > 80 || !/^[\p{L}\p{N} .&'-]+$/u.test(q)) return res.status(400).json({ error: "bad name" });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const ours = await fromCcd(q, ctl.signal);
    if (ours === "none") return res.status(404).json({ error: "nothing on file" });
    let hit: Hit | null = ours;
    if (!hit) {
      const j = await dz<{ data?: { id?: number; name?: string }[] }>(`search/artist?q=${encodeURIComponent(q)}&limit=8`, ctl.signal);
      const artist = (j?.data ?? []).find((x) => norm(x.name ?? "") === norm(q));
      if (!artist?.id) return res.status(404).json({ error: "no artist" });
      hit = await topTrack(artist.id, ctl.signal);
      if (!hit) return res.status(404).json({ error: "no preview" });
    }
    // Deezer preview links are signed and expire; keep the cache well inside that.
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=300");
    return res.json(hit);
  } catch {
    return res.status(502).json({ error: "lookup failed" });
  } finally {
    clearTimeout(timer);
  }
}
