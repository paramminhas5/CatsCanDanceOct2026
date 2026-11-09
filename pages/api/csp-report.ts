import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Receives Content-Security-Policy violation reports (report-only mode, next.config.mjs) and writes a
 * short line to the Vercel runtime log, so we can see what a strict policy would block before enforcing it.
 */
export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const r = body?.["csp-report"] ?? body?.[0]?.body ?? body ?? {};
    const pick = (k: string, k2: string) => String(r[k] ?? r[k2] ?? "").slice(0, 200);
    console.warn("[csp]", pick("violated-directive", "effectiveDirective"), pick("blocked-uri", "blockedURL"), "on", pick("document-uri", "documentURL"));
  } catch {
    /* ignore malformed reports */
  }
  return res.status(204).end();
}
