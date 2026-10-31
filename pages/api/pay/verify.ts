import type { NextApiRequest, NextApiResponse } from "next";
import { createHmac, timingSafeEqual } from "crypto";
import { rpc } from "@/lib/api-rpc";
import { emailTicketOrder } from "@/lib/mailer";

// Confirms a payment by checking Razorpay's signature, then issues tickets or marks the shop order paid.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const secret = process.env.RAZORPAY_KEY_SECRET, token = process.env.OPS_TOKEN;
  if (!secret || !token) return res.status(503).json({ error: "Online payment is not switched on yet." });
  const { kind, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};
  if (!["ticket", "shop"].includes(kind) || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: "Bad request." });
  const want = createHmac("sha256", secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  const a = Buffer.from(want), b = Buffer.from(String(razorpay_signature));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(400).json({ error: "Payment could not be verified." });
  const r = await rpc(kind === "ticket" ? "ops_mark_order_paid" : "ops_shop_mark_paid", { p_token: token, p_rzp_order: razorpay_order_id, p_payment: razorpay_payment_id });
  if (!r.ok || !r.data?.ok) return res.status(500).json({ error: "Payment taken but the order could not be updated. Contact us with your payment id." });
  if (kind === "ticket") await emailTicketOrder(String(r.data.order_id)).catch(() => {});
  return res.status(200).json({ ok: true, order_id: r.data.order_id });
}
