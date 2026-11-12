"use server";
/**
 * Server Actions for the public writes: a booking request (request_booking_v2) and follow
 * (follow_artist). Both call the existing anon SECURITY DEFINER RPCs with the viewer's own session
 * when they have one, so the database sees who asked. Input is checked with zod first.
 */
import { z } from "zod";
import { supabaseForRequest } from "@/lib/auth";
import { BUDGETS, type Stage } from "@/lib/desk";
import { emailBookingOutbox, notifyTeam } from "@/lib/mailer";
import { rpcResult } from "@/lib/db";
import { siteUrl } from "@/lib/site";

const Brief = z.object({
  slugs: z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).min(1).max(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  city: z.string().trim().min(2).max(60),
  venue: z.string().trim().max(120).default(""),
  room: z.number().int().positive().nullable().default(null),
  set: z.string().trim().max(60).default(""),
  budget: z.string().max(10).default(""),
  other: z.string().trim().max(200).default(""),
  message: z.string().trim().max(1400).default(""),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  org: z.string().trim().max(120).default(""),
  hp: z.string().max(200).default(""),
});
export type BriefInput = z.input<typeof Brief>;

export type SendResult =
  | { ok: true; requests: { id: string; key: string; artist_slug: string; stage: Stage }[] }
  | { ok: false; error: string };

export async function sendBookingRequest(input: BriefInput): Promise<SendResult> {
  const p = Brief.safeParse(input);
  if (!p.success) return { ok: false, error: "Check the date, city, your name and email." };
  const b = p.data;
  const band = BUDGETS.find((x) => x.key === b.budget);
  let sb;
  try { sb = await supabaseForRequest(); } catch { return { ok: false, error: "Could not reach the database. Try again." }; }
  const v2 = await sb.rpc("request_booking_v2", {
    p_artist_slugs: b.slugs, p_name: b.name, p_email: b.email, p_org: b.org || null, p_city: b.city, p_date: b.date,
    p_venue: b.venue || null, p_room_size: b.room, p_set_length: b.set || null, p_budget_band: band?.key ? band.label : null,
    p_budget_max_inr: band?.max ?? band?.min ?? null, p_other_acts: b.other || null, p_message: b.message || null, p_hp: b.hp || null,
  });
  if (v2.error) return { ok: false, error: v2.error.message || "Could not send. Try again." };
  const d = v2.data as { ok?: boolean; error?: string; requests?: { id: string; key: string; artist_slug: string; stage: Stage }[] } | null;
  if (!d?.ok) return { ok: false, error: d?.error ?? "Could not send. Try again." };
  // Tell the team and the artists, once each (no input, so this cannot send arbitrary mail).
  void notifyBookings().catch(() => {});
  return { ok: true, requests: d.requests ?? [] };
}

/** Follow or unfollow. Only for signed-in members; the browser keeps its own list for visitors. */
export async function setFollow(slug: string, follow: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return { ok: false, error: "Bad slug" };
  try {
    const sb = await supabaseForRequest();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return { ok: false, error: "Sign in to follow." };
    const { data, error } = await sb.rpc("follow_artist", { p_slug: slug, p_follow: follow });
    if (error) return { ok: false, error: error.message };
    const d = data as { ok?: boolean; error?: string } | null;
    if (d && typeof d === "object" && d.ok === false) return { ok: false, error: d.error ?? "Could not save." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error." };
  }
}

/** Tells the CCD team about requests they have not heard about yet, then mails the artists and requesters (migration 051). */
export async function notifyBookings() {
  const token = process.env.OPS_TOKEN;
  if (!token) return { ok: true, sent: 0, mailed: 0 };
  const r = await rpcResult("ops_booking_unnotified", { p_token: token });
  const list = (r.ok && Array.isArray(r.data) ? r.data : []) as Record<string, string>[];
  if (list.length) {
    await notifyTeam(
      list.length === 1 ? "New booking request" : `${list.length} new booking requests`,
      [
        ...list.map((b) => `${b.name} (${b.email}) asked ${b.artist ?? b.artist_slug} for ${b.event_date ?? "no date"} in ${b.city ?? "no city"}${b.budget_band ? `, budget ${b.budget_band}` : ""}${b.stage === "declined" ? ". Auto-declined: below the artist's minimum." : "."}`),
        `Pipeline: ${siteUrl()}/desk/bookings`,
      ],
    ).catch(() => {});
  }
  const out = await emailBookingOutbox().catch(() => ({ sent: 0 }));
  return { ok: true, sent: list.length, mailed: out.sent };
}

/** "I was there" on a show (migration 043). Signed-in members only; visitors keep it on the device. */
export async function setWasThere(slug: string, moment: string, on: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug) || !moment || moment.length > 200) return { ok: false, error: "Bad input" };
  try {
    const sb = await supabaseForRequest();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return { ok: false, error: "Sign in to keep it on your profile." };
    const { error } = await sb.rpc("set_i_was_there", { p_slug: slug, p_moment: moment, p_on: on });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch {
    return { ok: false, error: "Network error." };
  }
}

/** Which shows this member said they were at, and the counts for everyone. */
export async function wasThereState(slug: string): Promise<{ mine: string[]; counts: Record<string, number> }> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return { mine: [], counts: {} };
  try {
    const sb = await supabaseForRequest();
    const [{ data: c }, { data: user }] = await Promise.all([sb.rpc("i_was_there_counts", { p_slug: slug }), sb.auth.getUser()]);
    const counts = Object.fromEntries(((c as { moment_id: string; count: number }[] | null) ?? []).map((r) => [r.moment_id, Number(r.count)]));
    if (!user.user) return { mine: [], counts };
    const { data: m } = await sb.rpc("my_i_was_there", { p_slug: slug });
    const mine = ((m as unknown[] | null) ?? []).map((x) => (typeof x === "string" ? x : (x as { my_i_was_there?: string }).my_i_was_there ?? "")).filter(Boolean);
    return { mine, counts };
  } catch {
    return { mine: [], counts: {} };
  }
}
