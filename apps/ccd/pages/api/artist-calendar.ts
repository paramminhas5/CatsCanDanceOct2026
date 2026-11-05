/**
 * GET /api/artist-calendar?slug=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Day-status map for the booking form and profile strip.
 *   busy      = a verified gig on that day
 *   available = the artist posted a date window in a city (artist_dates, approved)
 * Public read under RLS. Contact details are never read here.
 */
import { sbGet, pq, eqf } from "@/lib/db";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const slug = String(req.query.slug ?? req.query.artist_slug ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return res.status(400).json({ error: "slug required" });

  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dflt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const from = ISO.test(String(req.query.from ?? "")) ? String(req.query.from) : dflt(today);
  const to = ISO.test(String(req.query.to ?? "")) ? String(req.query.to) : dflt(new Date(today.getFullYear(), today.getMonth() + 6, 0));

  const [artist] = await sbGet("artists", `?select=id,slug,open_to_bookings&slug=eq.${slug}&limit=1`);
  if (!artist) return res.status(404).json({ error: "Artist not found" });

  const [windows, gigs] = await Promise.all([
    sbGet("artist_dates", `?select=id,city,from_date,to_date,status&artist_slug=eq.${slug}&to_date=gte.${from}&from_date=lte.${to}&order=from_date.asc`),
    sbGet("artist_gigs", `?select=id,event_name,venue,city,event_date&artist_slug=eq.${slug}&event_date=gte.${from}&event_date=lte.${to}&order=event_date.asc`),
  ]);

  const days: Record<string, string> = {};
  for (const w of windows as any[]) {
    for (let d = new Date(w.from_date + "T00:00:00Z"); d <= new Date(w.to_date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      if (k >= from && k <= to) days[k] = "available";
    }
  }
  for (const g of gigs as any[]) days[String(g.event_date).slice(0, 10)] = "busy";

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.json({
    artist_id: artist.id,
    artist_slug: slug,
    from, to, days,
    blocks: [],
    gigs: (gigs as any[]).map((g) => ({ ...g, from_date: g.event_date, to_date: g.event_date })),
    available_cities: Array.from(new Set((windows as any[]).map((w) => w.city).filter(Boolean))),
    open_to_bookings: !!artist.open_to_bookings,
  });
}
