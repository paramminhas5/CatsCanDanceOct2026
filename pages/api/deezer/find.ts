/**
 * Preview page only (public/preview/night): one 30 second Deezer preview for an artist.
 * Finds the artist by name first, then takes their top track. Nothing stored or re-hosted.
 */
import type { NextApiRequest, NextApiResponse } from "next";

type Artist = { id?: number; name?: string };
type Track = { title?: string; preview?: string };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = String(req.query.q ?? "").trim();
  if (!q || q.length > 80) return res.status(400).json({ error: "bad name" });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=8`, { signal: ctl.signal });
    const j = await r.json();
    const artist = (Array.isArray(j?.data) ? (j.data as Artist[]) : []).find((a) => norm(a.name ?? "") === norm(q));
    if (!artist?.id) return res.status(404).json({ error: "no artist" });
    const r2 = await fetch(`https://api.deezer.com/artist/${artist.id}/top?limit=5`, { signal: ctl.signal });
    const j2 = await r2.json();
    const hit = (Array.isArray(j2?.data) ? (j2.data as Track[]) : []).find((t) => t.preview);
    if (!hit) return res.status(404).json({ error: "no preview" });
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=300");
    return res.json({ url: hit.preview, title: hit.title ?? "" });
  } catch {
    return res.status(502).json({ error: "deezer unreachable" });
  } finally {
    clearTimeout(timer);
  }
}
