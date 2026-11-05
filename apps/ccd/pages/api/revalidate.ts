/**
 * On-demand ISR revalidation endpoint.
 * 
 * Call after updating an event in admin to refresh the static page:
 *   POST /api/revalidate { path: "/events/ccdxsocial-01", secret: "your-secret" }
 * 
 * Set REVALIDATE_SECRET in env vars to protect this endpoint.
 */
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const secret = process.env.REVALIDATE_SECRET;
  if (secret && req.body?.secret !== secret) {
    return res.status(401).json({ error: "Invalid secret" });
  }

  const path = req.body?.path;
  if (!path || typeof path !== "string") {
    return res.status(400).json({ error: "path required" });
  }

  try {
    await res.revalidate(path);
    return res.json({ revalidated: true, path });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
