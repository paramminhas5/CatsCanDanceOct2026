/**
 * GET /api/artist-packages?artist_slug=xxx
 * Active booking packages for a published artist. Public read under RLS. Returns [] when none.
 */
import { sbGet, pq, eqf, ord } from "@/lib/db";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const slug = String(req.query.artist_slug ?? req.query.slug ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return res.json([]);
  const rows = await sbGet("artist_packages", pq({ ...eqf("artist_slug", slug), ...eqf("is_active", true), ...ord("sort_order") }));
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.json(rows);
}
