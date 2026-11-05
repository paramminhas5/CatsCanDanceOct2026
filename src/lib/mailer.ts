// Server-only email helper. Sends through Resend when RESEND_API_KEY is set, otherwise does nothing.
// Until the catscandance.com domain is verified in Resend, set no RESEND_FROM and mail only reaches the Resend account owner.
import { rpc, esc } from "@/lib/api-rpc";

const FROM = () => process.env.RESEND_FROM || "Cats Can Dance <onboarding@resend.dev>";
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "https://catscandance.com";

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
  `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#111;background:#faf5e8;border:3px solid #111">${body}<p style="font-size:12px;color:#555;margin-top:24px">Cats Can Dance, Bengaluru. <a href="${SITE()}">catscandance.com</a></p></div>`;

/** Email the tickets for a paid or free order, once. Safe to call twice. */
function ticketHtml(x: any, orderId: string, again = false) {
  const codes = (x.codes as string[]).map((c) => `<li style="font-family:monospace;font-size:18px;margin:4px 0">${esc(c)}</li>`).join("");
  return shell(
    `<h2 style="margin:0 0 8px">${again ? "Here are your tickets." : "You are in."}</h2><p>Hi ${esc(x.name)}, your ${x.amount_inr > 0 ? "tickets are paid" : "free tickets are confirmed"} for <b>${esc(x.event_title)}</b>.</p>` +
      `<p>${esc(x.event_date)}<br>${esc(x.venue)}, ${esc(x.city)}</p><p>Show one of these codes at the door, one per person:</p><ul>${codes}</ul>` +
      `<p><a href="${SITE()}/tickets/order?o=${esc(orderId)}&e=${encodeURIComponent(x.email)}" style="display:inline-block;background:#b6ef36;color:#020617;border:3px solid #020617;padding:12px 18px;font-weight:bold;text-decoration:none">Open your tickets and QR codes</a></p>` +
      `<p style="font-size:13px">Can't make it? Pass your ticket on at face value: <a href="${SITE()}/discover#pass-it-on">Pass it on</a>.</p>`
  );
}

export async function emailTicketOrder(orderId: string) {
  const token = process.env.OPS_TOKEN;
  if (!token || !process.env.RESEND_API_KEY) return { ok: false, skipped: true };
  const d = await rpc("ops_order_email_data", { p_token: token, p_order: orderId });
  if (!d.ok || !d.data?.ok) return { ok: false };
  const x = d.data;
  const m = await sendMail(x.email, `Your tickets: ${x.event_title}`, ticketHtml(x, orderId));
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
    const m = await sendMail(d.data.email, `Your tickets: ${d.data.event_title}`, ticketHtml(d.data, id, true));
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
    const mates = (m.mates as string[]).map(esc).join(", ");
    const html = shell(
      `<h2 style="margin:0 0 8px">${esc(m.crew)}</h2><p>Hi ${esc(m.name)}, your crew for <b>${esc(ev.title)}</b> (${esc(ev.date)}, ${esc(ev.venue)}) is ready.</p>` +
        `<p>Crew mates: ${mates || "just you so far"}</p>${m.pre_spot ? `<p>Pre-spot: ${esc(m.pre_spot)}</p>` : ""}` +
        `<p>Open <a href="${SITE()}/club">your club page</a> to see the crew. If anyone makes you uncomfortable, use the report button there.</p>`
    );
    const r = await sendMail(m.email, `Your crew for ${ev.title}`, html);
    r.ok ? sent++ : failed++;
  }
  if (sent > 0 && failed === 0) await rpc("ops_mark_crews_emailed", { p_token: token, p_slug: slug });
  return { sent, failed, skipped: !process.env.RESEND_API_KEY };
}

/** Tell people who asked about a city that a night is on there. */
export async function emailCityWaitlist(city: string, emails: string[], eventTitle: string, when: string, venue: string) {
  let sent = 0;
  for (const to of emails) {
    const r = await sendMail(to, `${eventTitle} is on in ${city}`, shell(`<h2 style="margin:0 0 8px">A night in ${esc(city)}</h2><p>You asked us to tell you. <b>${esc(eventTitle)}</b> is on ${esc(when)} at ${esc(venue)}.</p><p><a href="${SITE()}/whats-on">See the details</a></p>`));
    if (r.ok) sent++;
  }
  if (sent === emails.length && emails.length > 0) await rpc("ops_city_waitlist_done", { p_token: process.env.OPS_TOKEN, p_city: city });
  return { sent };
}

/** Optional heads up to the team for new contact messages and booking requests. Set OPS_NOTIFY_EMAIL to turn on. */
export async function notifyTeam(subject: string, lines: string[]) {
  const to = process.env.OPS_NOTIFY_EMAIL;
  if (!to) return;
  await sendMail(to, subject, shell(lines.map((l) => `<p>${esc(l)}</p>`).join("")));
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
    const html = shell(`<h2 style="margin:0 0 8px">${yes ? esc(b.artist) + " is interested" : "A reply from " + esc(b.artist)}</h2><p>Hi ${esc(b.name)}, ${yes ? "good news. They would like to talk about your request." : "they cannot do this one."}</p>${b.note ? `<p>Their note: ${esc(b.note)}</p>` : ""}<p>${yes ? "Reply to them in the request thread." : "You can find someone free on your date at catscandance.com/book."}</p><p><a href="${SITE()}/bookings">See your requests</a></p>`);
    const r = await sendMail(b.email, `${b.artist}: reply to your booking request`, html);
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
    const when = [b.event_date, b.city].filter(Boolean).map(esc).join(", ");
    const [subject, head, line] =
      b.kind === "new_request" ? [`Booking request: ${b.requester}${b.city ? `, ${b.city}` : ""}`, `${esc(b.requester)} wants to book you`, `${when}${b.budget_band ? `. Budget ${esc(b.budget_band)}` : ""}. Reply, counter or pass in the thread.`]
      : b.kind.startsWith("reply_artist_confirmed") ? [`${b.artist} confirmed your booking`, `${esc(b.artist)} confirmed`, `${when}. The receipt with the terms is in the thread.`]
      : b.kind.startsWith("reply_artist_counter") ? [`${b.artist} sent a counter offer`, `${esc(b.artist)} sent a counter offer`, `${when}. Accept it or reply in the thread.`]
      : b.kind.startsWith("reply_artist_interested") ? [`${b.artist} is interested`, `${esc(b.artist)} is interested`, `${when}. Talk it through in the thread.`]
      : b.kind.startsWith("reply_artist_declined") ? [`${b.artist} can't do this one`, `A reply from ${esc(b.artist)}`, `They can't do ${when}. Find someone free on your date at catscandance.com/book.`]
      : b.kind.startsWith("reply_requester") ? [`New message about your booking`, `A message from ${esc(b.requester)}`, `${when}.`]
      : [`Update on your booking request`, `An update from Cats Can Dance`, `${when}.`];
    const html = shell(`<h2 style="margin:0 0 8px">${head}</h2><p>${line}</p>${b.body ? `<p style="border-left:3px solid #111;padding-left:10px">${esc(b.body)}</p>` : ""}<p><a href="${link}" style="display:inline-block;background:#b6ef36;color:#020617;border:3px solid #020617;padding:12px 18px;font-weight:bold;text-decoration:none">Open the thread</a></p>`);
    const r = await sendMail(b.to_email, subject, html);
    if (r.ok) sent++;
  }
  return { sent };
}
