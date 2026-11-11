/**
 * Lifecycle email (migration 072): welcome, the evening-before reminder and the morning-after note.
 * Server only. Sends through sendMail (Resend); bookkeeping in lifecycle_sends so nobody gets one twice.
 * Every email has a signed stop link (/api/mail/stop).
 */
import { createHmac } from "node:crypto";
import { rpc, esc } from "@/lib/api-rpc";
import { sendMail } from "@/lib/mailer";

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "https://catscandance.com";
const first = (name?: string | null) => (name ?? "").trim().split(/\s+/)[0] || "there";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00+05:30`);
  return `${d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" })} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

export const stopSig = (email: string) =>
  createHmac("sha256", process.env.OPS_TOKEN || "ccd").update(`stop:${email.toLowerCase()}`).digest("hex").slice(0, 24);
const stopLink = (email: string) => `${SITE()}/api/mail/stop?e=${encodeURIComponent(email)}&s=${stopSig(email)}`;

const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;background:#b6ef36;color:#020617;border:3px solid #020617;padding:12px 18px;font-weight:bold;text-decoration:none">${esc(label)}</a></p>`;
const shell = (email: string, body: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#111;background:#faf5e8;border:3px solid #111">${body}` +
  `<p style="font-size:12px;color:#555;margin-top:24px">Cats Can Dance, Bengaluru. <a href="${SITE()}">catscandance.com</a> · <a href="${stopLink(email)}" style="color:#555">Stop these emails</a></p></div>`;

export type Welcome = { member_id: string; email: string; name: string | null; number: number | null };
export type Reminder = { email: string; name: string | null; slug: string; title: string; date: string; start: string | null; venue: string | null; city: string | null; ticket: boolean; order_id: string | null };
export type After = { email: string; name: string | null; slug: string; title: string; next: { slug: string; title: string; date: string; venue: string | null } | null };

export function welcomeMail(w: Welcome) {
  const subject = "You're in. Here's how CCD works";
  const html = shell(w.email,
    `<h2 style="margin:0 0 8px">Hi ${esc(first(w.name))}, you're in.</h2>` +
    (w.number ? `<p>You're member number ${w.number}.</p>` : "") +
    `<p>Three things you can do now:</p><ol>` +
    `<li><b>Find a night.</b> What's on lists the good ones in the city, ours and other people's.</li>` +
    `<li><b>Say you're going.</b> We'll put you in a crew with a few others going, so you're not walking in alone.</li>` +
    `<li><b>Follow artists.</b> You'll hear when they play near you.</li></ol>` +
    button(`${SITE()}/whats-on`, "See what's on") +
    `<p style="font-size:13px">Your tickets, crews and nights live in <a href="${SITE()}/me">Your account</a>.</p>`);
  return { subject, html };
}

export function reminderMail(r: Reminder) {
  const when = [day(r.date), r.start].filter(Boolean).join(", ");
  const where = [r.venue, r.city].filter(Boolean).join(", ");
  const subject = `Tomorrow: ${r.title}`;
  const html = shell(r.email,
    `<h2 style="margin:0 0 8px">See you tomorrow, ${esc(first(r.name))}.</h2>` +
    `<p><b>${esc(r.title)}</b><br>${esc(when)}${where ? `<br>${esc(where)}` : ""}</p>` +
    (r.ticket && r.order_id
      ? `<p>Your QR codes are ready. Show one per person at the door.</p>` + button(`${SITE()}/tickets/order?o=${encodeURIComponent(r.order_id)}&e=${encodeURIComponent(r.email)}`, "Open your tickets") +
        `<p style="font-size:13px">Can't make it? Pass your ticket on at face value from the same page.</p>`
      : `<p>You're on the list. Give your name at the door.</p>` + button(`${SITE()}/nights/${encodeURIComponent(r.slug)}`, "Night details")) +
    `<p style="font-size:13px">Your crew, if you have one, is in <a href="${SITE()}/me">Your account</a>.</p>`);
  return { subject, html };
}

export function afterMail(a: After) {
  const subject = `Thanks for coming to ${a.title}`;
  const html = shell(a.email,
    `<h2 style="margin:0 0 8px">Thanks for coming, ${esc(first(a.name))}.</h2>` +
    `<p>How was <b>${esc(a.title)}</b>? One tap tells us what to do more of.</p>` +
    button(`${SITE()}/me`, "Rate the night") +
    (a.next ? `<p>Next one: <b>${esc(a.next.title)}</b>, ${esc(day(a.next.date))}${a.next.venue ? `, ${esc(a.next.venue)}` : ""}. <a href="${SITE()}/nights/${encodeURIComponent(a.next.slug)}">Get in early</a>.</p>` : "") +
    `<p style="font-size:13px">Bring someone next time: share any night from its page and they'll see who's going.</p>`);
  return { subject, html };
}

type Sent = { email: string; kind: "welcome" | "reminder" | "after"; ref: string };

/** Send one welcome now (called right after join). Safe to call twice. */
export async function sendWelcome(memberId: string) {
  const token = process.env.OPS_TOKEN;
  if (!token) return { ok: false, skipped: "no OPS_TOKEN" };
  const w = await rpc("ops_lifecycle_welcome_for", { p_token: token, p_member: memberId });
  if (!w.ok || !w.data) return { ok: true, sent: 0 };
  const m = welcomeMail(w.data as Welcome);
  const r = await sendMail((w.data as Welcome).email, m.subject, m.html);
  if (r.ok) await rpc("ops_lifecycle_mark", { p_token: token, p_sent: [{ email: (w.data as Welcome).email, kind: "welcome", ref: "member" }] });
  return { ok: r.ok, sent: r.ok ? 1 : 0 };
}

/** The daily run: everything due, sent once each. */
export async function runLifecycle() {
  const token = process.env.OPS_TOKEN;
  if (!token) return { ok: false, skipped: "no OPS_TOKEN" };
  if (!process.env.RESEND_API_KEY) return { ok: true, skipped: "no RESEND_API_KEY" };
  const due = await rpc("ops_lifecycle_due", { p_token: token });
  if (!due.ok) return { ok: false, error: due.error };
  const d = due.data as { welcome: Welcome[]; reminder: Reminder[]; after: After[] };
  const sent: Sent[] = [];
  const counts = { welcome: 0, reminder: 0, after: 0, failed: 0 };
  const go = async (to: string, mail: { subject: string; html: string }, s: Sent) => {
    const r = await sendMail(to, mail.subject, mail.html);
    if (r.ok) { sent.push(s); counts[s.kind]++; } else counts.failed++;
    await new Promise((res) => setTimeout(res, 120)); // stay under Resend's rate limit
  };
  for (const w of d.welcome) await go(w.email, welcomeMail(w), { email: w.email, kind: "welcome", ref: "member" });
  for (const r of d.reminder) await go(r.email, reminderMail(r), { email: r.email, kind: "reminder", ref: r.slug });
  for (const a of d.after) await go(a.email, afterMail(a), { email: a.email, kind: "after", ref: a.slug });
  if (sent.length) await rpc("ops_lifecycle_mark", { p_token: token, p_sent: sent });
  return { ok: true, ...counts };
}
