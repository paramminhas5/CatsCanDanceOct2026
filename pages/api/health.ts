/**
 * Health check endpoint — used by monitoring and uptime services.
 */
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.json({ ok: true, ts: Date.now() });
}
