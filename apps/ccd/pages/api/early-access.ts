/** POST /api/early-access  Body: { email, source? } : uses the signup RPC (idempotent, throttled). */
import { rpc } from "@/lib/api-rpc";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const email = String(req.body?.email ?? "").toLowerCase().trim();
  if (!email) return res.status(400).json({ error: "Email required" });
  const r = await rpc("signup", { p_email: email, p_source: req.body?.source ?? "home" });
  return r.ok ? res.json({ ok: true }) : res.status(400).json({ error: r.error });
}
