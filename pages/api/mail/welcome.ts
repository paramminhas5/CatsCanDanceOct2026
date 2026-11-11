/**
 * Welcome email the moment someone joins. The browser calls this with the member's own session token;
 * we ask Supabase who that is, then send once (sendWelcome is safe to call twice).
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { sendWelcome } from "@/lib/lifecycle";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const auth = String(req.headers.authorization ?? "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!auth.startsWith("Bearer ") || !url || !anon) return res.status(401).json({ ok: false });
  const u = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!u?.id) return res.status(401).json({ ok: false });
  const r = await sendWelcome(String(u.id));
  return res.status(200).json({ ok: r.ok, sent: (r as any).sent ?? 0 });
}
