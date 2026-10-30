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
export async function emailTicketOrder(orderId: string) {
  const token = process.env.OPS_TOKEN;
  if (!token || !process.env.RESEND_API_KEY) return { ok: false, skipped: true };
  const d = await rpc("ops_order_email_data", { p_token: token, p_order: orderId });
  if (!d.ok || !d.data?.ok) return { ok: false };
  const x = d.data;
  const codes = (x.codes as string[]).map((c) => `<li style="font-family:monospace;font-size:18px;margin:4px 0">${esc(c)}</li>`).join("");
  const html = shell(
    `<h2 style="margin:0 0 8px">You are in.</h2><p>Hi ${esc(x.name)}, your ${x.amount_inr > 0 ? "tickets are paid" : "free tickets are confirmed"} for <b>${esc(x.event_title)}</b>.</p>` +
      `<p>${esc(x.event_date)}<br>${esc(x.venue)}, ${esc(x.city)}</p><p>Show one of these codes at the door:</p><ul>${codes}</ul>` +
      `<p><a href="${SITE()}/tickets/order?o=${esc(orderId)}&e=${encodeURIComponent(x.email)}">Open your tickets and QR codes</a></p>`
  );
  const m = await sendMail(x.email, `Your tickets: ${x.event_title}`, html);
  if (m.ok) await rpc("ops_mark_order_emailed", { p_token: token, p_order: orderId });
  return m;
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
