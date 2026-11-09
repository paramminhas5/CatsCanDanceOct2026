/**
 * GET  /api/artists          — list all approved artists
 * POST /api/artists          — submit a new artist (public, goes to artist_submissions)
 *
 * Query params for GET:
 *   ?featured=true           — only featured artists
 *   ?limit=N                 — cap results
 *   ?slug=xxx                — single artist by slug (legacy query-param style)
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { listArtists, getArtist, sbInsert, pq, eqf } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { featured, limit, slug } = req.query as Record<string, string>;

    // Legacy: ?slug=xxx query-param style — single artist
    if (slug) {
      const artist = await getArtist(slug);
      return artist
        ? res.json(artist)
        : res.status(404).json({ error: "Artist not found" });
    }

    const artists = await listArtists({
      featured: featured === "true",
      limit:    limit ? parseInt(limit, 10) : undefined,
    });
    return res.json(artists);
  }

  // POST (artist submission) removed 9 Nov 2026: submissions go through submit_artist() with throttle.


  return res.status(405).json({ error: "Method not allowed" });
}
