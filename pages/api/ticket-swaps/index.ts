/** GET: approved Pass it on listings. POST: submit one for review (face value only, no payments, contact stays private). */
import { rpc } from "@/lib/api-rpc";

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    const r = await rpc("public_ticket_swaps", {});
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.json(r.ok && Array.isArray(r.data) ? r.data : []);
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body ?? {};
  const type = ["sell", "trade", "upgrade"].includes(b.swap_type) ? b.swap_type : null;
  if (!type || !b.event_label || !b.contact) return res.status(400).json({ error: "Event, type and contact are required." });
  const fv = b.face_value_inr === "" || b.face_value_inr == null ? null : Math.round(Number(b.face_value_inr));
  const r = await rpc("submit_ticket_swap", {
    p_event_label: String(b.event_label).slice(0, 160),
    p_swap_type: type,
    p_ticket_count: Math.min(Math.max(parseInt(b.ticket_count, 10) || 1, 1), 10),
    p_face_value_inr: fv != null && Number.isFinite(fv) ? fv : null,
    p_tier: b.tier ? String(b.tier).slice(0, 60) : null,
    p_note: b.note ? String(b.note).slice(0, 400) : null,
    p_contact: String(b.contact).slice(0, 160),
    p_event_id: null,
  });
  if (!r.ok) return res.status(500).json({ error: "Could not save. Try again." });
  if (r.data?.ok === false) return res.status(400).json({ error: r.data.error });
  return res.json({ ok: true });
}
