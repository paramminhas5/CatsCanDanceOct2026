import "server-only";
import { productUrl } from "@ccd/brand";
import { esc, rpcSafe } from "@/lib/rpc";

/**
 * Server-only mail through Resend. Ported from apps/ccd/src/lib/mailer.ts (the promoter review part).
 * Does nothing when RESEND_API_KEY is missing. Mail reaches everyone once RESEND_FROM is an address
 * on the verified domain; until then only the Resend account owner receives it.
 */
const FROM = () => process.env.RESEND_FROM || "Cats Can Dance <onboarding@resend.dev>";

export async function sendMail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, skipped: true as const };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM(), to, subject, html }),
    });
    return r.ok ? { ok: true as const } : { ok: false as const, error: (await r.text()).slice(0, 200) };
  } catch {
    return { ok: false as const, error: "network" };
  }
}

const shell = (body: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#f5f5f5;background:#0a0a0a;border:3px solid #ffe600">${body}<p style="font-size:12px;color:#9a9a9a;margin-top:24px">Gate, by Cats Can Dance, Bengaluru. <a style="color:#ffe600" href="${productUrl("gate")}">gate.catscandance.com</a></p></div>`;

type MailData = {
  ok: boolean; promoter: string; promoter_slug: string; note: string | null; emails: string[];
  night?: { slug: string; title: string } | null;
};

/**
 * Tell a promoter's team what CCD decided: about the promoter (approved or not), or about one night
 * (live, or sent back with a note). Called from /admin after a review.
 */
export async function emailPromoterReview(opts: { promoter?: string; night?: string; approved: boolean }) {
  const token = process.env.OPS_TOKEN;
  if (!token || !process.env.RESEND_API_KEY) return { sent: 0, skipped: true };
  const d = await rpcSafe<MailData>("ops_promoter_mail_data", { p_token: token, p_promoter: opts.promoter ?? null, p_night: opts.night ?? null });
  if (!d.ok || !d.data?.ok) return { sent: 0 };
  const x = d.data;
  const dash = `${productUrl("gate")}/promote/${encodeURIComponent(x.promoter_slug)}`;
  const note = x.note ? `<p>Our note: ${esc(x.note)}</p>` : "";
  let subject: string, body: string;
  if (opts.night && x.night) {
    const page = `${productUrl("ccd")}/nights/${encodeURIComponent(x.night.slug)}`;
    subject = opts.approved ? `${x.night.title} is live` : `${x.night.title}: not approved yet`;
    body = opts.approved
      ? `<h2 style="margin:0 0 8px">${esc(x.night.title)} is live.</h2><p>It is on Cats Can Dance and on What's on. Share the page: <a style="color:#ffe600" href="${page}">${page}</a></p><p>Before doors, add your door team and import any lists from other ticket platforms in Door setup, from <a style="color:#ffe600" href="${dash}">your dashboard</a>.</p>`
      : `<h2 style="margin:0 0 8px">${esc(x.night.title)} is not live yet.</h2>${note}<p>Change it and send it again from <a style="color:#ffe600" href="${dash}">your dashboard</a>.</p>`;
  } else {
    subject = opts.approved ? `${x.promoter} is approved on Gate` : `Your Gate promoter application`;
    body = opts.approved
      ? `<h2 style="margin:0 0 8px">You're in.</h2><p>${esc(x.promoter)} is approved. Set your look and make your first night: <a style="color:#ffe600" href="${dash}">${dash}</a></p><p>Every night is checked by us before it goes up, usually within a day. It is free.</p>`
      : `<h2 style="margin:0 0 8px">Not approved this time.</h2>${note}<p>Reply to this email if you want to talk about it.</p>`;
  }
  let sent = 0;
  for (const to of x.emails ?? []) { const r = await sendMail(to, subject, shell(body)); if (r.ok) sent++; }
  return { sent };
}
