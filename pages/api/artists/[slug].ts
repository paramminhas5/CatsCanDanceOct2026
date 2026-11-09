/**
 * Artist routes by slug — all sub-resources live here.
 *
 * GET    /api/artists/:slug           — single artist profile
 * GET    /api/artists/:slug/basic     — artist + appearances + upcoming dates + stats
 * GET    /api/artists/:slug/full      — full enriched profile (all relations)
 * Read only. Writes go through checked RPCs (claim links, /me, /ops).
 */
import type { NextApiRequest, NextApiResponse } from "next";
import {
  getArtist, getArtistAny, getArtistFullProfile,
  getAppearances, getUpcomingDates, getConnections,
  computeArtistStats, computeArtistFacts,
  updateArtist, deleteArtist, claimArtist, selfUpdateArtist,
  sbGet, sbPatch, pq, eqf,
} from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const segments = Array.isArray(req.query.slug) ? req.query.slug : [req.query.slug as string];
  const slug     = segments[0];
  const sub      = segments[1]; // "basic" | "full" | "claim" | "self-update" | undefined

  // ── GET /api/artists/:slug ──────────────────────────────────────────────────
  if (req.method === "GET" && !sub) {
    const artist = await getArtist(slug);
    return artist ? res.json(artist) : res.status(404).json({ error: "Artist not found" });
  }

  // ── GET /api/artists/:slug/basic ────────────────────────────────────────────
  if (req.method === "GET" && sub === "basic") {
    const artist = await getArtistAny(slug);
    if (!artist) return res.status(404).json({ error: "Artist not found" });

    const [appearances, upcomingDates] = await Promise.all([
      getAppearances(slug),
      getUpcomingDates(artist.id),
    ]);

    const stats = computeArtistStats(appearances, []);
    return res.json({ artist, appearances, upcomingDates, stats, connections: [], milestones: [], socialStats: null, facts: [] });
  }

  // ── GET /api/artists/:slug/full ─────────────────────────────────────────────
  if (req.method === "GET" && sub === "full") {
    const profile = await getArtistFullProfile(slug);
    if (!profile) return res.status(404).json({ error: "Artist not found" });
    return res.json(profile);
  }

  // Writes (claim, self-update, admin edit and delete) were removed on 9 Nov 2026: they trusted a user id
  // from the request body. Claims go through /claim/<token> and submit_artist(); edits through /me and /ops.
  return res.status(404).json({ error: `No handler for ${req.method} /api/artists/${segments.join("/")}` });
}
