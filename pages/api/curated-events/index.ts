/** GET /api/curated-events?city=&limit= : published scene events (Prowl). Nothing shows until status = published. */
import { SB, SK } from "@/lib/api-helpers";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { city, limit } = req.query as Record<string, string>;
  const q = new URLSearchParams({ select: "*", status: "eq.published", order: "event_date.asc" });
  if (city) q.set("city", `ilike.*${city}*`);
  q.set("limit", String(Math.min(parseInt(limit || "100", 10) || 100, 200)));
  try {
    const r = await fetch(`${SB}/rest/v1/scraped_events?${q}`, { headers: { apikey: SK, Authorization: `Bearer ${SK}` } });
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.json(r.ok ? await r.json() : []);
  } catch {
    return res.json([]);
  }
}
