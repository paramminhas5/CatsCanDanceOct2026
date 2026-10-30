import type { NextApiRequest, NextApiResponse } from "next";
import { emailBookingAnswers } from "@/lib/mailer";

// Sends any artist answers that have not been emailed yet. Safe to call often: each answer goes out once, only to the requester.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const r = await emailBookingAnswers();
  return res.status(200).json({ ok: true, sent: r.sent });
}
