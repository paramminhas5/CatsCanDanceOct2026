/**
 * Deezer album tracklist for the artist page focus panel: titles, lengths and track ids.
 * Previews are fetched per track by /api/deezer/track/[id] when you press play (their links expire).
 * Nothing is stored or re-hosted here.
 */
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id ?? "");
  if (!/^\d{1,15}$/.test(id)) return res.status(400).json({ error: "bad id" });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(`https://api.deezer.com/album/${id}/tracks?limit=60`, { signal: ctl.signal });
    const j = await r.json();
    if (!r.ok || j?.error || !Array.isArray(j?.data)) return res.status(404).json({ error: "no album" });
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=3600");
    return res.json({
      tracks: (j.data as { id: number; title: string; duration?: number; readable?: boolean }[])
        .filter((t) => t.readable !== false)
        .map((t) => ({ id: String(t.id), t: t.title, d: t.duration ?? null })),
    });
  } catch {
    return res.status(502).json({ error: "deezer unreachable" });
  } finally {
    clearTimeout(timer);
  }
}
