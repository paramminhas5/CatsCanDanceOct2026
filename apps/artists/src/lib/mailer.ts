// Server-only email helper. Sends through Resend when RESEND_API_KEY is set, otherwise does nothing.
// Ported from apps/ccd/src/lib/mailer.ts (the booking parts only). Links point at this app.
import { rpcResult, esc } from "@/lib/db";
import { NAME, siteUrl } from "@/lib/site";

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
  `<div style="font-family:Geist,Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0a0a0c;background:#ffffff;border:1px solid #e6e4de;border-radius:16px">${body}<p style="font-size:12px;color:#6b6b70;margin-top:24px">${esc(NAME)} by Cats Can Dance, Bengaluru. <a href="${siteUrl()}" style="color:#0a0a0c">${siteUrl().replace(/^https?:\/\//, "")}</a></p></div>`;
const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;background:#0a0a0c;color:#ffffff;border-radius:999px;padding:12px 18px;font-weight:600;text-decoration:none">${label}</a></p>`;

/** Optional heads up to the team for new booking requests. Set OPS_NOTIFY_EMAIL to turn on. */
export async function notifyTeam(subject: string, lines: string[]) {
  const to = process.env.OPS_NOTIFY_EMAIL;
  if (!to) return;
  await sendMail(to, subject, shell(lines.map((l) => `<p>${esc(l)}</p>`).join("")));
}

/** Tell requesters what the artist answered (old request_booking flow). Sends each answer once. */
export async function emailBookingAnswers() {
  const token = process.env.OPS_TOKEN;
  if (!token || !process.env.RESEND_API_KEY) return { sent: 0, skipped: true };
  const d = await rpcResult("ops_booking_answers", { p_token: token });
  const list = Array.isArray(d.data) ? d.data : [];
  let sent = 0;
  for (const b of list as Record<string, string>[]) {
    const yes = b.response === "interested";
    const html = shell(`<h2 style="margin:0 0 8px">${yes ? esc(b.artist) + " is interested" : "A reply from " + esc(b.artist)}</h2><p>Hi ${esc(b.name)}, ${yes ? "good news. They would like to talk about your request." : "they cannot do this one."}</p>${b.note ? `<p>Their note: ${esc(b.note)}</p>` : ""}<p>${yes ? "Reply to them in the request thread." : `You can find someone free on your date at ${siteUrl()}/artists.`}</p>${button(`${siteUrl()}/bookings`, "See your requests")}`);
    const r = await sendMail(b.email, `${b.artist}: reply to your booking request`, html);
    if (r.ok) { await rpcResult("ops_mark_booking_answer_emailed", { p_token: token, p_id: b.id }); sent++; }
  }
  return { sent };
}

/** Booking emails: new requests to artists who own their page, and each reply to the other side (migration 051). */
export async function emailBookingOutbox() {
  const token = process.env.OPS_TOKEN;
  if (!token || !process.env.RESEND_API_KEY) return { sent: 0, skipped: true };
  const d = await rpcResult("ops_booking_outbox", { p_token: token });
  const list = (d.ok && Array.isArray(d.data) ? d.data : []) as Record<string, string>[];
  let sent = 0;
  for (const b of list) {
    if (!b.to_email) continue;
    const link = `${siteUrl()}/bookings/${b.id}${b.key ? `?k=${b.key}` : ""}`;
    const when = [b.event_date, b.city].filter(Boolean).map(esc).join(", ");
    const kind = String(b.kind ?? "");
    const [subject, head, line] =
      kind === "new_request" ? [`Booking request: ${b.requester}${b.city ? `, ${b.city}` : ""}`, `${esc(b.requester)} wants to book you`, `${when}${b.budget_band ? `. Budget ${esc(b.budget_band)}` : ""}. Reply, counter or pass in the thread.`]
      : kind.startsWith("reply_artist_confirmed") ? [`${b.artist} confirmed your booking`, `${esc(b.artist)} confirmed`, `${when}. The receipt with the terms is in the thread.`]
      : kind.startsWith("reply_artist_counter") ? [`${b.artist} sent a counter offer`, `${esc(b.artist)} sent a counter offer`, `${when}. Accept it or reply in the thread.`]
      : kind.startsWith("reply_artist_interested") ? [`${b.artist} is interested`, `${esc(b.artist)} is interested`, `${when}. Talk it through in the thread.`]
      : kind.startsWith("reply_artist_declined") ? [`${b.artist} can't do this one`, `A reply from ${esc(b.artist)}`, `They can't do ${when}. Find someone free on your date at ${siteUrl()}/artists.`]
      : kind.startsWith("reply_requester") ? [`New message about your booking`, `A message from ${esc(b.requester)}`, `${when}.`]
      : [`Update on your booking request`, `An update from ${esc(NAME)}`, `${when}.`];
    const html = shell(`<h2 style="margin:0 0 8px">${head}</h2><p>${line}</p>${b.body ? `<p style="border-left:3px solid #0a0a0c;padding-left:10px">${esc(b.body)}</p>` : ""}${button(link, "Open the thread")}`);
    const r = await sendMail(b.to_email, subject, html);
    if (r.ok) sent++;
  }
  return { sent };
}
