/** GET /api/curated-events?kind=club|concert|festival&city= : published scene events (Prowl).
 *  Reads through the scene_events RPC, so nothing shows until status = published and submitter details never leave the database. */
import { rpc } from "@/lib/api-rpc";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { kind, city } = req.query as Record<string, string>;
  const k = ["club", "concert", "festival"].includes(kind) ? kind : null;
  const r = await rpc("scene_events", { p_kind: k });
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  let rows: any[] = r.ok && Array.isArray(r.data) ? r.data : [];
  if (city) rows = rows.filter((e) => (e.city ?? "").toLowerCase().includes(city.toLowerCase()));
  return res.json(rows);
}
