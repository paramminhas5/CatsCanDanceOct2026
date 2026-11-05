/**
 * Deezer 30s preview lookup for the artist page player.
 * Deezer's preview links are signed and expire, so the page asks for a fresh one when you press play.
 * The audio itself streams from Deezer; nothing is stored or re-hosted here.
 */
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id ?? "");
  if (!/^\d{1,15}$/.test(id)) return res.status(400).json({ error: "bad id" });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(`https://api.deezer.com/track/${id}`, { signal: ctl.signal });
    const j = await r.json();
    if (!r.ok || j?.error || !j?.preview) return res.status(404).json({ error: "no preview" });
    // Preview links last a while; keep the cache well inside that.
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=60");
    return res.json({ preview: j.preview as string, title: j.title as string, link: j.link as string, album: j.album?.title ?? null, albumId: j.album?.id ? String(j.album.id) : null });
  } catch {
    return res.status(502).json({ error: "deezer unreachable" });
  } finally {
    clearTimeout(timer);
  }
}
