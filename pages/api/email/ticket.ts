import type { NextApiRequest, NextApiResponse } from "next";
import { emailTicketOrder } from "@/lib/mailer";

// Emails the tickets for a free order right after it is placed. Sends once per order, only to the buyer on the order.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const id = String(req.body?.order_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Bad request." });
  const r = await emailTicketOrder(id);
  return res.status(200).json({ ok: !!r.ok });
}
