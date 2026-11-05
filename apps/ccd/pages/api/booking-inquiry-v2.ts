/**
 * POST /api/booking-inquiry-v2
 * Structured booking request from BookingForm. Saves through the request_booking RPC, so the
 * artist's contact details stay in private_contacts. Package, event type, venue and phone are
 * folded into the message so staff see everything in /ops Inbox.
 */
import { rpc } from "@/lib/api-rpc";
import { notifyTeam } from "@/lib/mailer";
import { sbGet } from "@/lib/db";

const s = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body ?? {};
  const slug = s(b.artist_slug, 80).toLowerCase();
  const name = s(b.requester_name, 120);
  const email = s(b.requester_email, 200);
  if (!slug || !name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "artist_slug, requester_name and a valid requester_email are required" });
  }

  let pkgLine = "";
  if (b.package_id && /^[0-9a-f-]{36}$/i.test(String(b.package_id))) {
    const [p] = await sbGet("artist_packages", `?select=name,price_inr,price_is_minimum&id=eq.${b.package_id}&artist_slug=eq.${slug}&limit=1`);
    if (p) pkgLine = `Package: ${p.name} (${p.price_is_minimum ? "from " : ""}INR ${p.price_inr})`;
  }
  const lines = [
    s(b.event_type, 80) && `Event type: ${s(b.event_type, 80)}`,
    pkgLine,
    b.event_date_end && `Dates: ${s(b.event_date, 10)} to ${s(b.event_date_end, 10)}`,
    s(b.venue_name, 120) && `Venue: ${s(b.venue_name, 120)}`,
    s(b.requester_phone, 40) && `Phone: ${s(b.requester_phone, 40)}`,
    s(b.source, 60) && `Source: ${s(b.source, 60)}`,
    s(b.notes, 2000),
  ].filter(Boolean).join("\n");

  const r = await rpc("request_booking", {
    p_artist_slug: slug,
    p_name: name,
    p_email: email,
    p_org: s(b.venue_name, 120) || null,
    p_city: s(b.venue_city, 80) || null,
    p_date: ISO_OK(b.event_date) ? b.event_date : null,
    p_budget: b.budget_inr ? String(Number(b.budget_inr) || "") || null : null,
    p_message: lines || null,
    p_event_slug: null,
  });
  if (r.ok) await notifyTeam("New booking request", [`${name} (${email}) asked for ${slug}`, lines.slice(0, 500)]).catch(() => {});
  return r.ok
    ? res.json({ ok: true, message: "Booking request sent. We pass it on and reply within a few days." })
    : res.status(400).json({ error: r.error });
}

function ISO_OK(v: unknown) { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v); }
