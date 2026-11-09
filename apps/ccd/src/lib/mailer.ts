// Server-only email helper. Sends through Resend when RESEND_API_KEY is set, otherwise does nothing.
// Until the catscandance.com domain is verified in Resend, set no RESEND_FROM and mail only reaches the Resend account owner.
import { rpc } from "@/lib/api-rpc";
import { tickets, crewReady, note, promoterReview, type Mail } from "@ccd/mail";

const FROM = () => process.env.RESEND_FROM || "Cats Can Dance <onboarding@resend.dev>";
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "https://catscandance.com";

/** Send one of the @ccd/mail templates. */
export const send = (to: string, m: Mail) => sendMail(to, m.subject, m.html, m.text);

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

/** The ticket email (plan section 9): the QR codes, when and where, one button. */
function ticketMail(x: any, orderId: string, again = false): Mail {
  return tickets({
    name: x.name, night: x.event_title, when: x.event_date, where: [x.venue, x.city].filter(Boolean).join(", "),
    codes: (x.codes as string[]) ?? [], paid: x.amount_inr > 0, again,
    link: `${SITE()}/tickets/order?o=${encodeURIComponent(orderId)}&e=${encodeURIComponent(x.email)}`,
  });
}

export async function emailTicketOrder(orderId: string) {
  const token = process.env.OPS_TOKEN;
  if (!token || !process.env.RESEND_API_KEY) return { ok: false, skipped: true };
  const d = await rpc("ops_order_email_data", { p_token: token, p_order: orderId });
  if (!d.ok || !d.data?.ok) return { ok: false };
  const x = d.data;
  const m = await send(x.email, ticketMail(x, orderId));
  if (m.ok) await rpc("ops_mark_order_emailed", { p_token: token, p_order: orderId });
  return m;
}

/**
 * "Email me my tickets": sends every order for this email on nights that have not happened yet.
 * Throttled in the database (one lookup per email every 10 minutes). Needs migration 037.
 */
export async function resendTickets(email: string) {
  const token = process.env.OPS_TOKEN;
  if (!token || !process.env.RESEND_API_KEY) return { ok: false as const, reason: "email-off" as const };
  const list = await rpc("ops_orders_for_email", { p_token: token, p_email: email });
  if (!list.ok) return { ok: false as const, reason: "not-ready" as const };
  if (!list.data?.ok) return { ok: true as const, sent: 0, throttled: !!list.data?.throttled };
  let sent = 0;
  for (const id of (list.data.orders as string[]) ?? []) {
    const d = await rpc("ops_order_resend_data", { p_token: token, p_order: id });
    if (!d.ok || !d.data?.ok) continue;
    const m = await send(d.data.email, ticketMail(d.data, id, true));
    if (m.ok) sent++;
  }
  return { ok: true as const, sent };
}

/** Tell each member which crew they are in. Returns how many were sent. */
export async function emailCrews(slug: string) {
  const token = process.env.OPS_TOKEN;
  const d = await rpc("ops_crew_email_list", { p_token: token, p_slug: slug });
  if (!d.ok || !d.data?.members) return { sent: 0, failed: 0, skipped: !process.env.RESEND_API_KEY };
  const ev = d.data.event ?? {};
  let sent = 0, failed = 0;
  for (const m of d.data.members as any[]) {
    const r = await send(m.email, crewReady({
      name: m.name, night: ev.title, meet: m.pre_spot || [ev.venue].filter(Boolean).join("") || "In the app", at: ev.date ?? "",
      people: (m.mates as string[])?.length ? (m.mates as string[]) : ["just you so far"], link: `${SITE()}/me`,
    }));
    r.ok ? sent++ : failed++;
  }
  if (sent > 0 && failed === 0) await rpc("ops_mark_crews_emailed", { p_token: token, p_slug: slug });
  return { sent, failed, skipped: !process.env.RESEND_API_KEY };
}

/** Tell people who asked about a city that a night is on there. */
export async function emailCityWaitlist(city: string, emails: string[], eventTitle: string, when: string, venue: string) {
  let sent = 0;
  for (const to of emails) {
    const r = await send(to, note({ product: "ccd", subject: `${eventTitle} is on in ${city}`, eyebrow: `A night in ${city}`, title: eventTitle, lines: [`You asked us to tell you. ${eventTitle} is on ${when} at ${venue}.`], cta: { label: "See the night", href: `${SITE()}/whats-on` } }));
    if (r.ok) sent++;
  }
  if (sent === emails.length && emails.length > 0) await rpc("ops_city_waitlist_done", { p_token: process.env.OPS_TOKEN, p_city: city });
  return { sent };
}

/** Optional heads up to the team for new contact messages and booking requests. Set OPS_NOTIFY_EMAIL to turn on. */
export async function notifyTeam(subject: string, lines: string[]) {
  const to = process.env.OPS_NOTIFY_EMAIL;
  if (!to) return;
  await send(to, note({ product: "ccd", subject, title: subject, lines }));
}

/** Tell requesters what the artist answered. Sends each answer once. */
export async function emailBookingAnswers() {
  const token = process.env.OPS_TOKEN;
  if (!token || !process.env.RESEND_API_KEY) return { sent: 0, skipped: true };
  const d = await rpc("ops_booking_answers", { p_token: token });
  const list = Array.isArray(d.data) ? d.data : [];
  let sent = 0;
  for (const b of list as any[]) {
    const yes = b.response === "interested";
    const r = await send(b.email, note({
      product: "artists", subject: `${b.artist}: reply to your booking request`, eyebrow: "Booking", title: yes ? `${b.artist} is interested` : `A reply from ${b.artist}`,
      lines: [`Hi ${b.name}, ${yes ? "good news. They would like to talk about your request. Reply in the request thread." : "they cannot do this one. You can find someone free on your date in Artists."}`],
      quote: b.note || undefined, cta: { label: "See your requests", href: `${SITE()}/bookings` },
    }));
    if (r.ok) { await rpc("ops_mark_booking_answer_emailed", { p_token: token, p_id: b.id }); sent++; }
  }
  return { sent };
}

/** Booking emails: new requests to artists who own their page, and each reply to the other side (migration 051). */
export async function emailBookingOutbox() {
  const token = process.env.OPS_TOKEN;
  if (!token || !process.env.RESEND_API_KEY) return { sent: 0, skipped: true };
  const d = await rpc("ops_booking_outbox", { p_token: token });
  const list = (d.ok && Array.isArray(d.data) ? d.data : []) as any[];
  let sent = 0;
  for (const b of list) {
    if (!b.to_email) continue;
    const link = `${SITE()}/bookings/${b.id}${b.key ? `?k=${b.key}` : ""}`;
    const when = [b.event_date, b.city].filter(Boolean).join(", ");
    const [subject, head, line] =
      b.kind === "new_request" ? [`Booking request: ${b.requester}${b.city ? `, ${b.city}` : ""}`, `${b.requester} wants to book you`, `${when}${b.budget_band ? `. Budget ${b.budget_band}` : ""}. Reply, counter or pass in the thread.`]
      : b.kind.startsWith("reply_artist_confirmed") ? [`${b.artist} confirmed your booking`, `${b.artist} confirmed`, `${when}. The receipt with the terms is in the thread.`]
      : b.kind.startsWith("reply_artist_counter") ? [`${b.artist} sent a counter offer`, `${b.artist} sent a counter offer`, `${when}. Accept it or reply in the thread.`]
      : b.kind.startsWith("reply_artist_interested") ? [`${b.artist} is interested`, `${b.artist} is interested`, `${when}. Talk it through in the thread.`]
      : b.kind.startsWith("reply_artist_declined") ? [`${b.artist} can't do this one`, `A reply from ${b.artist}`, `They can't do ${when}. Find someone free on your date in Artists.`]
      : b.kind.startsWith("reply_requester") ? [`New message about your booking`, `A message from ${b.requester}`, `${when}.`]
      : [`Update on your booking request`, `An update on your booking`, `${when}.`];
    const r = await send(b.to_email, note({ product: "artists", subject, eyebrow: "Booking", title: head, lines: [line], quote: b.body || undefined, cta: { label: "Open the thread", href: link } }));
    if (r.ok) sent++;
  }
  return { sent };
}

/**
 * Tell a promoter's team what CCD decided: about the promoter (approved or not), or about one night (live, or sent back with a note).
 * Called from /ops/promoters after a review. Does nothing until RESEND_API_KEY is set; reaches everyone once RESEND_FROM uses the verified domain.
 */
export async function emailPromoterReview(opts: { promoter?: string; night?: string; approved: boolean }) {
  const token = process.env.OPS_TOKEN;
  if (!token || !process.env.RESEND_API_KEY) return { sent: 0, skipped: true };
  const d = await rpc("ops_promoter_mail_data", { p_token: token, p_promoter: opts.promoter ?? null, p_night: opts.night ?? null });
  if (!d.ok || !d.data?.ok) return { sent: 0 };
  const x = d.data;
  const dash = `${SITE()}/promote/${encodeURIComponent(x.promoter_slug)}`;
  const night = !!(opts.night && x.night);
  const m = promoterReview({ what: night ? x.night.title : x.promoter, approved: opts.approved, note: x.note || undefined, night, link: night && opts.approved ? `${SITE()}/nights/${encodeURIComponent(x.night.slug)}` : dash });
  let sent = 0;
  for (const to of (x.emails as string[]) ?? []) { const r = await send(to, m); if (r.ok) sent++; }
  return { sent };
}
