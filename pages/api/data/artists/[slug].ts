// Public, read-only artist record from the Cats Can Dance database.
// Every fact carries its source. Approved artists only. No keys, cached at the edge.
import type { NextApiRequest, NextApiResponse } from "next";
import { getArtistV2 } from "@/lib/artist-v2";

const SITE = "https://catscandance.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.slug ?? "").toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return res.status(400).json({ error: "bad slug" });
  const a = await getArtistV2(slug).catch(() => null);
  if (!a) return res.status(404).json({ error: "not found" });
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json({
    id: `ccd:artist:${a.slug}`,
    name: a.name,
    url: `${SITE}/litter/${a.slug}`,
    based_in: a.city,
    genres: a.genres,
    members: a.members,
    bio: a.bio,
    ids: a.ids,
    links: a.links,
    eras: a.eras.filter((e) => e.src).map((e) => ({ from: e.from, to: e.to, sound: e.sound, tags: e.tags, source: e.src })),
    releases: a.releases.map((r) => ({ title: r.t, type: r.type || null, date: r.undated ? null : r.date, label: r.label, source: r.src, deezer_album_id: r.albumId })),
    moments: a.moments.filter((m) => m.kind !== "rel").map((m) => ({ type: m.kind === "show" ? "show" : "milestone", date: m.date, title: m.t, detail: m.sub || null, source: m.src })),
    upcoming: a.upcoming.map((u) => ({ title: u.title, date: u.event_date, city: u.city, venue: u.venue, tickets: u.ticket_url })),
    ccd_nights: a.ccdNights.map((n) => ({ title: n.title, date: n.date, url: `${SITE}${n.url}` })),
    attribution: "Cats Can Dance (catscandance.com). Each fact links to its source.",
  });
}
