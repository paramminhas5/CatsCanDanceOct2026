/** GET /api/site-settings : all settings as one object { key: value }. Edited from /ops via ops_set_setting. */
import { SB, SK } from "@/lib/api-helpers";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const r = await fetch(`${SB}/rest/v1/site_settings?select=key,value`, { headers: { apikey: SK, Authorization: `Bearer ${SK}` } });
    const rows: { key: string; value: unknown }[] = r.ok ? await r.json() : [];
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.json(Object.fromEntries(rows.map((x) => [x.key, x.value])));
  } catch {
    return res.json({});
  }
}
