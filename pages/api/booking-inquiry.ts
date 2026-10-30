/**
 * POST /api/booking-inquiry
 * Body: { artist_slug, requester_name, requester_email, org?, city?, event_date?, budget?, notes? }
 * Saves through the request_booking RPC. Artist contact details stay in private_contacts and are never read here.
 */
import { rpc } from "@/lib/api-rpc";
import { notifyTeam } from "@/lib/mailer";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body ?? {};
  if (!b.artist_slug || !b.requester_name || !b.requester_email) {
    return res.status(400).json({ error: "artist_slug, requester_name, requester_email required" });
  }
  const r = await rpc("request_booking", {
    p_artist_slug: b.artist_slug,
    p_name: b.requester_name,
    p_email: b.requester_email,
    p_org: b.org ?? b.venue ?? null,
    p_city: b.city ?? null,
    p_date: b.event_date || null,
    p_budget: b.budget ? String(b.budget) : null,
    p_message: b.notes ?? b.purpose ?? null,
    p_event_slug: b.event_slug ?? null,
  });
  if (r.ok) await notifyTeam("New booking request", [`${b.requester_name} (${b.requester_email}) asked for ${b.artist_slug}`, String(b.notes ?? b.purpose ?? "").slice(0, 500)]).catch(() => {});
  return r.ok
    ? res.json({ ok: true, message: "Booking request sent. We pass it on and reply within a few days." })
    : res.status(400).json({ error: r.error });
}
