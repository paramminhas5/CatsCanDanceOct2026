"use server";
/**
 * Contract signing and the deposit (migration 067). The one-time code is made by the database through
 * the ops token and emailed from here, so it never reaches a browser. Signing passes the typed name,
 * the code and the signer's IP. The deposit goes through Razorpay (test keys until the CA signs off);
 * the payment signature is checked here before the database marks it paid.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { supabaseForRequest } from "@/lib/auth";
import { send } from "@/lib/mailer";
import { note } from "@ccd/mail";
import { siteUrl } from "@/lib/site";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<R<{ data: T }>> {
  const sb = await supabaseForRequest();
  const { data, error } = await sb.rpc(fn, args);
  if (error) return { ok: false, error: /ops token|not allowed|denied/i.test(error.message) ? "The server is not set up for this yet." : error.message };
  const d = data as { ok?: boolean; error?: string } | null;
  if (d && d.ok === false) return { ok: false, error: d.error ?? "Something went wrong." };
  return { ok: true, data: data as T };
}

const mask = (e: string) => e.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${"•".repeat(Math.min(6, b.length))}${c}`);

/** Email the signer a six-digit code for the contract on this booking. */
export async function requestSignCode(id: string, key: string | null): Promise<R<{ sentTo: string }>> {
  const token = process.env.OPS_TOKEN;
  if (!token) return { ok: false, error: "Signing switches on once the server is set up." };
  if (!isUuid(id) || (key !== null && !isUuid(key))) return { ok: false, error: "Bad link." };
  const r = await rpc<{ code: string; email: string; name: string; artist: string; date: string | null }>("contract_code_issue", { p_token: token, p_id: id, p_key: key });
  if (!r.ok) return r;
  const { code, email, name, artist, date } = r.data;
  const m = await send(email, note({
    product: "artists", subject: `Your code to sign: ${code}`, eyebrow: "Contract", title: "Your signing code",
    preheader: `${code} signs the contract for ${artist}.`,
    lines: [`Hi ${(name ?? "").split(" ")[0] || "there"}, use this code to sign the contract for ${artist}${date ? ` on ${date}` : ""}. It works for 15 minutes.`],
    rows: [["Code", code]],
    cta: { label: "Open the booking", href: `${siteUrl()}/bookings/${id}${key ? `?k=${key}` : ""}` },
    after: ["Did not ask for this? Ignore it. Nobody can sign without the code."],
  }));
  if (!m.ok) return { ok: false, error: "We could not email the code. Email is not fully switched on yet." };
  return { ok: true, sentTo: mask(email) };
}

export async function signContract(id: string, key: string | null, name: string, code: string): Promise<R> {
  const token = process.env.OPS_TOKEN;
  if (!token) return { ok: false, error: "Signing switches on once the server is set up." };
  if (!isUuid(id) || (key !== null && !isUuid(key))) return { ok: false, error: "Bad link." };
  if (!/^\d{6}$/.test(code.trim())) return { ok: false, error: "The code is six digits." };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim().slice(0, 64) || null;
  const r = await rpc("contract_sign", { p_token: token, p_id: id, p_key: key, p_name: name.trim().slice(0, 120), p_code: code.trim(), p_ip: ip });
  return r.ok ? { ok: true } : r;
}

/** Start the organiser's deposit payment. */
export async function startDeposit(id: string, key: string | null): Promise<R<{ keyId: string; orderId: string; amount: number; label: string }>> {
  const keyId = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET, token = process.env.OPS_TOKEN;
  if (!keyId || !secret || !token) return { ok: false, error: "Deposits through Cats Can Dance switch on soon. Until then, agree how to pay in the thread." };
  if (!isUuid(id) || (key !== null && !isUuid(key))) return { ok: false, error: "Bad link." };
  const get = await rpc<{ contract: { status: string; body: { deposit_inr: number; artist: { name: string } } } | null }>("contract_get", { p_id: id, p_key: key });
  if (!get.ok) return get;
  const c = get.data.contract;
  if (!c || c.status !== "signed") return { ok: false, error: "Both sides sign first." };
  const amount = Math.round(Number(c.body.deposit_inr) || 0);
  if (amount <= 0) return { ok: false, error: "This contract has no deposit." };
  const o = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64"), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt: `dep-${id.slice(0, 30)}`, notes: { booking: id, kind: "deposit" } }),
  }).then((r) => r.json()).catch(() => null);
  if (!o?.id) return { ok: false, error: "The payment provider did not answer. Try again." };
  const att = await rpc("contract_deposit_order", { p_token: token, p_id: id, p_key: key, p_rzp_order: o.id });
  if (!att.ok) return att;
  return { ok: true, keyId, orderId: o.id, amount: amount * 100, label: `Deposit for ${c.body.artist.name}` };
}

export async function verifyDeposit(p: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<R> {
  const secret = process.env.RAZORPAY_KEY_SECRET, token = process.env.OPS_TOKEN;
  if (!secret || !token) return { ok: false, error: "Payments are not switched on." };
  const want = createHmac("sha256", secret).update(`${p.razorpay_order_id}|${p.razorpay_payment_id}`).digest("hex");
  const a = Buffer.from(want), b = Buffer.from(String(p.razorpay_signature ?? ""));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, error: "The payment could not be checked. Contact us with your payment id." };
  const r = await rpc("ops_contract_deposit_paid", { p_token: token, p_rzp_order: p.razorpay_order_id, p_payment: p.razorpay_payment_id });
  return r.ok ? { ok: true } : r;
}
