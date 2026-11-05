/**
 * /api/promoters
 *
 * GET              — public promoter list
 * GET ?user_id=xxx — promoter claimed by this Clerk user
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { get, pq, eqf } from "@/lib/api-helpers";
import { rpc } from "@/lib/ccd-db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { user_id } = req.query as Record<string, string>;

  if (user_id) {
    // Return the promoter claimed by this user
    const rows = await get("promoters", pq(eqf("claimed_by", user_id))) as any[];
    return res.json(rows[0] ?? null);
  }

  // Only promoters that qualify for a page (migration 057, promoters_public): approved via /promote,
  // or older listings that throw nights and are credible or have a night on What's on.
  const rows = await rpc<any[]>("promoters_public", {});
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.json((rows ?? []).map((p) => ({ ...p, trusted: true })));
}
