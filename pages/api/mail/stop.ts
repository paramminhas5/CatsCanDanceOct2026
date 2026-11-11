/** The "Stop these emails" link. Checks the signature, records the stop (migration 072), says so plainly. */
import type { NextApiRequest, NextApiResponse } from "next";
import { timingSafeEqual } from "node:crypto";
import { rpc, esc } from "@/lib/api-rpc";
import { stopSig } from "@/lib/lifecycle";

const page = (msg: string) =>
  `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cats Can Dance</title>` +
  `<body style="font-family:Arial,sans-serif;background:#faf5e8;color:#111;padding:40px 16px"><div style="max-width:480px;margin:0 auto;border:3px solid #111;padding:20px;background:#fff">` +
  `<p style="font-size:18px;font-weight:bold">${msg}</p><p><a href="/">catscandance.com</a></p></div></body>`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const email = String(req.query.e ?? "").trim().toLowerCase();
  const sig = String(req.query.s ?? "");
  const good = email.includes("@") && sig.length === 24 && timingSafeEqual(Buffer.from(sig), Buffer.from(stopSig(email)));
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!good) return res.status(400).send(page("That link doesn't look right. Reply to any of our emails and we'll take you off."));
  const r = await rpc("ops_lifecycle_stop", { p_token: process.env.OPS_TOKEN, p_email: email });
  return res.status(r.ok ? 200 : 500).send(page(r.ok ? `Done. ${esc(email)} won't get these emails again. Tickets you buy still come by email.` : "Something went wrong. Reply to any of our emails and we'll take you off."));
}
