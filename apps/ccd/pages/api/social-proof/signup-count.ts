/** GET /api/social-proof/signup-count */
import { SB, SK } from "@/lib/api-helpers";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/public_stats`, {
      method: "POST",
      headers: { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" },
      body: "{}",
    });
    const d = r.ok ? await r.json() : null;
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.json({ count: Number(d?.total_signups ?? 0) });
  } catch {
    return res.json({ count: 0 });
  }
}
