/**
 * Daily reminders (Vercel cron, vercel.json). No AI. Sends web push for nights tomorrow and new gigs by
 * followed artists, once each (ops_due_reminders / ops_mark_reminders, migration 050).
 * Needs VAPID_PRIVATE_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY; does nothing without them.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import webpush from "web-push";
import { rpc } from "@/lib/api-rpc";
import { safeEqual } from "@/lib/safe-equal";

export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = process.env.CRON_SECRET;
  const allowed = !!secret && safeEqual(req.headers.authorization ?? "", `Bearer ${secret}`);
  if (!allowed) return res.status(401).json({ error: "unauthorized" });
  const token = process.env.OPS_TOKEN, pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!token || !pub || !priv) return res.status(200).json({ ok: true, skipped: "push keys not set" });
  webpush.setVapidDetails("mailto:hello@catscandance.com", pub, priv);

  const due = await rpc("ops_due_reminders", { p_token: token });
  const d = (due.ok ? due.data : null) as { subs: { endpoint: string; member_id: string; p256dh: string; auth: string }[]; items: { member_id: string; kind: string; ref: string; title: string; venue: string; url: string }[] } | null;
  if (!d) return res.status(500).json({ ok: false, error: due.error });
  const subsBy = new Map<string, typeof d.subs>();
  for (const s of d.subs) subsBy.set(s.member_id, [...(subsBy.get(s.member_id) ?? []), s]);

  const sent: { member_id: string; kind: string; ref: string }[] = [];
  const dead: string[] = [];
  for (const it of d.items) {
    const subs = subsBy.get(it.member_id);
    if (!subs?.length) continue;
    const payload = JSON.stringify({
      title: it.kind === "tomorrow" ? `Tomorrow: ${it.title}` : it.title,
      body: it.kind === "tomorrow" ? `${it.venue ?? ""}. Your crew and ticket are on Your account.` : `${it.venue}. Tickets on the artist page.`,
      url: it.url, tag: `${it.kind}:${it.ref}`,
    });
    let any = false;
    for (const s of subs) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 43200 }); any = true; }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.endpoint); }
    }
    if (any) sent.push({ member_id: it.member_id, kind: it.kind, ref: it.ref });
  }
  await rpc("ops_mark_reminders", { p_token: token, p_sent: sent, p_dead: dead });
  return res.status(200).json({ ok: true, due: d.items.length, sent: sent.length, dead: dead.length });
}
