/**
 * GET /api/site-settings
 *   no key       : all settings as one object { key: value } (unchanged, for any outside caller).
 *   ?key=<name>  : only that row, as [{ key, value }] (PostgREST shape, so the shim's
 *                  .eq("key", ...).maybeSingle() gets { key, value }). Empty array if missing.
 * Edited from /ops via ops_set_setting.
 */
import { SB, SK } from "@/lib/api-helpers";

const KEY_RE = /^[a-z0-9_]{1,64}$/;

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const rawKey = Array.isArray(req.query?.key) ? req.query.key[0] : req.query?.key;
  const key = typeof rawKey === "string" && rawKey !== "" ? rawKey : null;
  if (key !== null && !KEY_RE.test(key)) return res.status(400).json({ error: "Bad key" });

  const filter = key ? `&key=eq.${key}` : "";
  try {
    const r = await fetch(`${SB}/rest/v1/site_settings?select=key,value${filter}`, {
      headers: { apikey: SK, Authorization: `Bearer ${SK}` },
    });
    const rows: { key: string; value: unknown }[] = r.ok ? await r.json() : [];
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    if (key) return res.json(rows);
    return res.json(Object.fromEntries(rows.map((x) => [x.key, x.value])));
  } catch {
    return res.json(key ? [] : {});
  }
}
