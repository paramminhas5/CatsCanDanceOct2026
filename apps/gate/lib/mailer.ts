import "server-only";
import { productUrl } from "@ccd/brand";
import { rpcSafe } from "@/lib/rpc";
import { promoterReview, partyLive, doorTeam, type Mail } from "@ccd/mail";

/**
 * Server-only mail through Resend. Ported from apps/ccd/src/lib/mailer.ts (the promoter review part).
 * Does nothing when RESEND_API_KEY is missing. Mail reaches everyone once RESEND_FROM is an address
 * on the verified domain; until then only the Resend account owner receives it.
 */
const FROM = () => process.env.RESEND_FROM || "Cats Can Dance <onboarding@resend.dev>";

export async function sendMail(to: string, subject: string, html: string, text?: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, skipped: true as const };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM(), to, subject, html, ...(text ? { text } : {}) }),
    });
    return r.ok ? { ok: true as const } : { ok: false as const, error: (await r.text()).slice(0, 200) };
  } catch {
    return { ok: false as const, error: "network" };
  }
}

export const send = (to: string, m: Mail) => sendMail(to, m.subject, m.html, m.text);

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
  const night = !!(opts.night && x.night);
  const m = promoterReview({ what: night ? x.night!.title : x.promoter, approved: opts.approved, note: x.note || undefined, night, link: night && opts.approved ? `${productUrl("ccd")}/nights/${encodeURIComponent(x.night!.slug)}` : dash });
  let sent = 0;
  for (const to of x.emails ?? []) { const r = await send(to, m); if (r.ok) sent++; }
  return { sent };
}

export { partyLive, doorTeam };
