/**
 * POST /api/contact
 *
 * Body: { name, email, message }
 * Saves to contact_messages table.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { rpc } from "@/lib/api-rpc";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, message } = req.body ?? {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email, message required" });
  }

  const r = await rpc("submit_contact", { p_name: name, p_email: email, p_message: message });
  if (r.ok && r.data?.ok) return res.json({ ok: true });
  return res.status(r.ok ? 400 : 500).json({ error: r.data?.error ?? "Failed to save message" });
}
