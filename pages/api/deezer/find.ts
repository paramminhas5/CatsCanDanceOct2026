/**
 * Preview page only (public/preview/night): one 30 second Deezer preview for an artist, by exact name.
 * Same rules as the other Deezer routes: asked for when you press play, nothing stored or re-hosted.
 */
import type { NextApiRequest, NextApiResponse } from "next";

type Hit = { title?: string; preview?: string; artist?: { name?: string } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = String(req.query.q ?? "").trim();
  if (!q || q.length > 80) return res.status(400).json({ error: "bad name" });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(`artist:"${q}"`)}&limit=15`, { signal: ctl.signal });
    const j = await r.json();
    const hit = (Array.isArray(j?.data) ? (j.data as Hit[]) : []).find(
      (t) => t.preview && (t.artist?.name ?? "").toLowerCase() === q.toLowerCase(),
    );
    if (!hit) return res.status(404).json({ error: "no preview" });
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=300");
    return res.json({ url: hit.preview, title: hit.title ?? "" });
  } catch {
    return res.status(502).json({ error: "deezer unreachable" });
  } finally {
    clearTimeout(timer);
  }
}
