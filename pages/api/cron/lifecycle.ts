/**
 * Daily lifecycle email (Vercel cron, vercel.json): welcome catch-up, tomorrow's reminder, yesterday's thank-you.
 * No AI. Each person gets each email once (migration 072). Does nothing without OPS_TOKEN and RESEND_API_KEY.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { runLifecycle } from "@/lib/lifecycle";

export const config = { maxDuration: 300 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = process.env.CRON_SECRET;
  const allowed = secret ? req.headers.authorization === `Bearer ${secret}` : String(req.headers["user-agent"] ?? "").startsWith("vercel-cron");
  if (!allowed) return res.status(401).json({ error: "unauthorized" });
  const r = await runLifecycle();
  return res.status(r.ok ? 200 : 500).json(r);
}
