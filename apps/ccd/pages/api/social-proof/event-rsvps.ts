/** GET /api/social-proof/event-rsvps?slug= : RSVP count via the rsvp_count RPC. */
import { SB, SK } from "@/lib/api-helpers";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const slug = req.query.slug as string;
  if (!slug) return res.json({ count: 0 });
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/rsvp_count`, {
      method: "POST",
      headers: { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_event_slug: slug }),
    });
    const n = r.ok ? await r.json() : 0;
    return res.json({ count: Number(n) || 0 });
  } catch {
    return res.json({ count: 0 });
  }
}
