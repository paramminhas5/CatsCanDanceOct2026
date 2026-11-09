/**
 * 30 second preview lookup for the Play button in the home's Artists carousel.
 * Deezer's preview links are signed and expire, and api.deezer.com sends no CORS header, so the
 * browser cannot ask Deezer directly. The audio streams from Deezer; nothing is stored here.
 * The full player lives in the Artists product (/api/deezer/* there); this is the home's only need.
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
    return res.json({ preview: j.preview as string, title: j.title as string });
  } catch {
    return res.status(502).json({ error: "deezer unreachable" });
  } finally {
    clearTimeout(timer);
  }
}
