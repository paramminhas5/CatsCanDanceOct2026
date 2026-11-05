/**
 * POST /api/booking-desk/notify
 * Tells the CCD team about booking requests they have not heard about yet. The browser calls it
 * after sending a request; it takes no input, so it can't be used to send arbitrary mail. Each
 * request is told once (ops_booking_unnotified marks them). No-op before migration 041 or
 * while email is off.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { rpc } from "@/lib/api-rpc";
import { emailBookingOutbox, notifyTeam } from "@/lib/mailer";

const SITE = "https://catscandance.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const token = process.env.OPS_TOKEN;
  if (!token) return res.status(200).json({ ok: true, sent: 0 });
  const r = await rpc("ops_booking_unnotified", { p_token: token });
  const list = (r.ok && Array.isArray(r.data) ? r.data : []) as any[];
  if (list.length) {
    await notifyTeam(
      list.length === 1 ? "New booking request" : `${list.length} new booking requests`,
      [
        ...list.map((b) => `${b.name} (${b.email}) asked ${b.artist ?? b.artist_slug} for ${b.event_date ?? "no date"} in ${b.city ?? "no city"}${b.budget_band ? `, budget ${b.budget_band}` : ""}${b.stage === "declined" ? ". Auto-declined: below the artist's minimum." : "."}`),
        `Pipeline: ${SITE}/ops/bookings`,
      ],
    ).catch(() => {});
  }
  // Artists and requesters hear about each request and reply once (migration 051).
  const out = await emailBookingOutbox().catch(() => ({ sent: 0 }));
  return res.status(200).json({ ok: true, sent: list.length, mailed: out.sent });
}
