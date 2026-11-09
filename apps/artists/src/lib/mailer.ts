// Server-only email helper. Sends through Resend when RESEND_API_KEY is set, otherwise does nothing.
// Every email uses the shared design in @ccd/mail (plan ccd/v2-plan.md section 9). Links point at this app.
import { rpcResult } from "@/lib/db";
import { siteUrl } from "@/lib/site";
import { note, type Mail } from "@ccd/mail";

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

/** Optional heads up to the team for new booking requests. Set OPS_NOTIFY_EMAIL to turn on. */
export async function notifyTeam(subject: string, lines: string[]) {
  const to = process.env.OPS_NOTIFY_EMAIL;
  if (!to) return;
  await send(to, note({ product: "artists", subject, title: subject, lines }));
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
    const r = await send(b.email, note({
      product: "artists", subject: `${b.artist}: reply to your booking request`, eyebrow: "Booking", title: yes ? `${b.artist} is interested` : `A reply from ${b.artist}`,
      lines: [`Hi ${b.name}, ${yes ? "good news. They would like to talk about your request. Reply in the request thread." : "they cannot do this one. You can find someone free on your date in Artists."}`],
      quote: b.note || undefined, cta: { label: "See your requests", href: `${siteUrl()}/bookings` },
    }));
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
    const when = [b.event_date, b.city].filter(Boolean).join(", ");
    const kind = String(b.kind ?? "");
    const [subject, head, line] =
      kind === "new_request" ? [`Booking request: ${b.requester}${b.city ? `, ${b.city}` : ""}`, `${b.requester} wants to book you`, `${when}${b.budget_band ? `. Budget ${b.budget_band}` : ""}. Reply, counter or pass in the thread.`]
      : kind.startsWith("reply_artist_confirmed") ? [`${b.artist} confirmed your booking`, `${b.artist} confirmed`, `${when}. The receipt with the terms is in the thread.`]
      : kind.startsWith("reply_artist_counter") ? [`${b.artist} sent a counter offer`, `${b.artist} sent a counter offer`, `${when}. Accept it or reply in the thread.`]
      : kind.startsWith("reply_artist_interested") ? [`${b.artist} is interested`, `${b.artist} is interested`, `${when}. Talk it through in the thread.`]
      : kind.startsWith("reply_artist_declined") ? [`${b.artist} can't do this one`, `A reply from ${b.artist}`, `They can't do ${when}. Find someone free on your date in Artists.`]
      : kind.startsWith("reply_requester") ? [`New message about your booking`, `A message from ${b.requester}`, `${when}.`]
      : [`Update on your booking request`, `An update on your booking`, `${when}.`];
    const r = await send(b.to_email, note({ product: "artists", subject, eyebrow: "Booking", title: head, lines: [line], quote: b.body || undefined, cta: { label: "Open the thread", href: link } }));
    if (r.ok) sent++;
  }
  return { sent };
}
