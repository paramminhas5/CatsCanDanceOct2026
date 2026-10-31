import type { NextApiRequest, NextApiResponse } from "next";
import { rpc } from "@/lib/api-rpc";

// Starts a Razorpay payment for a pending ticket or shop order. Keys live in Vercel env, never in the repo.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const keyId = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET, token = process.env.OPS_TOKEN;
  if (!keyId || !secret) return res.status(503).json({ error: "Online payment is not switched on yet." });
  if (!token) return res.status(503).json({ error: "Server is not configured." });
  const { kind, order_id } = req.body ?? {};
  if (!["ticket", "shop"].includes(kind) || !order_id) return res.status(400).json({ error: "Bad request." });

  const amt = await rpc(kind === "ticket" ? "ops_order_amount" : "ops_shop_order_amount", { p_token: token, p_order: order_id });
  if (!amt.ok || !amt.data?.ok) return res.status(400).json({ error: "This order cannot be paid." });

  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64"), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amt.data.amount_inr * 100, currency: "INR", receipt: String(order_id).slice(0, 40) }),
  });
  const o = await r.json().catch(() => ({}));
  if (!r.ok || !o.id) return res.status(502).json({ error: "Payment provider error. Try again." });

  await rpc(kind === "ticket" ? "ops_attach_razorpay" : "ops_shop_attach_razorpay", { p_token: token, p_order: order_id, p_rzp: o.id });
  return res.status(200).json({ key_id: keyId, razorpay_order_id: o.id, amount: o.amount, email: amt.data.email });
}
