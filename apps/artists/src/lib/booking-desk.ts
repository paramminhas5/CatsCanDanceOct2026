"use client";
/**
 * Booking desk calls from the browser (reads and the artist's own settings). Writes that create
 * requests or answer them go through Server Actions in booking-actions.ts so the browser never
 * needs anything beyond the anon key and the person's own session.
 * Ported from apps/ccd/src/lib/booking-desk.ts; the RPC names are unchanged.
 */
import { supabaseBrowser } from "@ccd/db/browser";
import type { Stage } from "@/lib/desk";

type RpcErr = { code?: string; message?: string } | null;
export const missingFn = (e: RpcErr) =>
  !!e && (e.code === "PGRST202" || e.code === "42883" || /could not find the function|does not exist|schema cache/i.test(e.message ?? ""));

export type Res<T> = { ok: true; data: T } | { ok: false; missing?: boolean; error: string };

export async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<Res<T>> {
  try {
    const { data, error } = await supabaseBrowser().rpc(fn, args);
    if (error) return { ok: false, missing: missingFn(error), error: missingFn(error) ? "Coming soon, needs database update." : error.message };
    const d = data as { ok?: boolean; error?: string } | null;
    if (d && typeof d === "object" && !Array.isArray(d) && d.ok === false) return { ok: false, error: d.error ?? "Something went wrong." };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Network error. Try again." };
  }
}

// ── keys for visitors without an account ────────────────────────────────────
const KEYS = "ccd:booking-keys";
export type SavedKey = { id: string; key: string; artist: string; date: string | null };
export function savedKeys(): SavedKey[] {
  try { const v = JSON.parse(localStorage.getItem(KEYS) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function saveKeys(rows: SavedKey[]) {
  try {
    const all = [...rows, ...savedKeys().filter((k) => !rows.some((r) => r.id === k.id))].slice(0, 30);
    localStorage.setItem(KEYS, JSON.stringify(all));
  } catch { /* storage blocked */ }
}
export const keyFor = (id: string) => savedKeys().find((k) => k.id === id)?.key ?? null;

// ── threads ─────────────────────────────────────────────────────────────────
export type ThreadMsg = { id: string; author_role: "requester" | "artist" | "system" | "ops"; kind: string; body: string | null; fee_inr: number | null; set_terms: string | null; created_at: string };
export type Thread = {
  role: "requester" | "artist";
  request: {
    id: string; group_id: string | null; stage: Stage; created_at: string; updated_at: string; seen_at: string | null; accepted_at: string | null;
    confirmed_at: string | null; cancelled_at: string | null; name: string; org: string | null; email: string | null; city: string | null;
    event_date: string | null; venue: string | null; room_size: number | null; set_length: string | null; budget_band: string | null;
    budget_max_inr: number | null; other_acts: string | null; message: string | null; fee_inr: number | null; set_terms: string | null;
    last_actor: string | null; declined_reason: string | null; terms: Record<string, string | null> | null; phone?: string | null;
  };
  artist: { slug: string; name: string; photo_url: string | null; based_city: string | null; genres: string[]; verified: boolean; played_ccd: boolean } | null;
  settings: { formats: unknown[]; min_notice_days: number | null; travel_cities: string[]; travels_anywhere: boolean; travel_terms: string | null; rider: string | null; tech: string | null; included: string | null; cancellation_terms: string | null; templates: { name: string; body: string }[] | null } | null;
  messages: ThreadMsg[];
  reviews: { open: boolean; mine: { rating: number; body: string | null } | null; theirs: { rating: number; body: string | null } | null; theirs_written: boolean };
};

export const loadThread = (id: string, key: string | null) => call<Thread>("booking_thread", { p_id: id, p_key: key });
// After a message or an action the server emails the other side (no input, so it can't send arbitrary mail).
const nudgeMail = <T,>(r: Res<T>) => { if (r.ok) fetch("/api/booking-desk/notify", { method: "POST" }).catch(() => {}); return r; };
export const postMessage = (id: string, key: string | null, body: string) => call("booking_post", { p_id: id, p_key: key, p_body: body }).then(nudgeMail);
export const actOn = (id: string, key: string | null, action: string, fee: number | null, set: string | null, note: string | null) =>
  call<{ stage: Stage }>("booking_act", { p_id: id, p_key: key, p_action: action, p_fee_inr: fee, p_set_terms: set, p_note: note }).then(nudgeMail);
export const review = (id: string, key: string | null, rating: number, body: string) => call("booking_review", { p_id: id, p_key: key, p_rating: rating, p_body: body });

export type ThreadRow = {
  id: string; role: "requester" | "artist"; stage: Stage; artist_slug: string; artist: string | null; photo_url: string | null; name: string;
  org: string | null; city: string | null; event_date: string | null; venue: string | null; room_size: number | null; set_length: string | null;
  budget_band: string | null; budget_max_inr: number | null; fee_inr: number | null; last_actor: string | null; created_at: string; updated_at: string;
  last_message: string | null; key?: string; legacy?: boolean; message?: string | null;
};

/** Everything the viewer can see: their own requests and, for artists, requests sent to them. */
export async function loadMyThreads(signedIn: boolean): Promise<{ rows: ThreadRow[]; legacy: boolean }> {
  const keys = savedKeys().map((k) => k.key);
  const rows: ThreadRow[] = [];
  let legacy = false;
  if (signedIn) {
    const r = await call<ThreadRow[]>("my_booking_threads");
    if (r.ok) rows.push(...(r.data ?? []));
    else if (r.missing) {
      legacy = true;
      const sb = supabaseBrowser();
      const [mine, forMe] = await Promise.all([sb.rpc("my_bookings"), sb.rpc("my_booking_requests")]);
      for (const x of ((mine.data as Record<string, unknown>[]) ?? [])) rows.push(legacyRow(x, "requester"));
      for (const x of ((forMe.data as Record<string, unknown>[]) ?? [])) rows.push(legacyRow(x, "artist"));
    }
  }
  if (keys.length && !legacy) {
    const r = await call<ThreadRow[]>("booking_threads_by_keys", { p_keys: keys });
    if (r.ok) for (const x of r.data ?? []) if (!rows.some((y) => y.id === x.id)) rows.push(x);
  }
  return { rows: rows.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")), legacy };
}

function legacyRow(x: Record<string, unknown>, role: "requester" | "artist"): ThreadRow {
  const s = (k: string) => (x[k] == null ? null : String(x[k]));
  const stage: Stage = x.response === "interested" ? "interested" : x.response === "declined" ? "declined" : "sent";
  return {
    id: String(x.id), role, stage, artist_slug: s("slug") ?? "", artist: s("artist"), photo_url: null, name: s("name") ?? "", org: s("org"), city: s("city"),
    event_date: s("event_date"), venue: null, room_size: null, set_length: null, budget_band: s("budget"), budget_max_inr: null, fee_inr: null,
    last_actor: null, created_at: String(x.created_at), updated_at: String(x.created_at), last_message: s("note"), legacy: true, message: s("message"),
  };
}

// ── artist side ─────────────────────────────────────────────────────────────
export type MySettings = {
  act_types: string[]; formats: unknown[]; min_notice_days: number | null; travel_cities: string[]; travels_anywhere: boolean;
  travel_terms: string | null; rider: string | null; tech: string | null; included: string | null; cancellation_terms: string | null;
  auto_decline_below_inr: number | null; templates: { name: string; body: string }[];
};
export const loadMySettings = () => call<MySettings | null>("my_booking_settings");
export const saveMySettings = (p: MySettings) => call("save_my_booking_settings", { p });
export type DayRow = { day: string; state: "open" | "booked" | "playing"; city: string | null; note: string | null };
export const loadCalendar = (from: string, to: string) => call<DayRow[]>("my_calendar", { p_from: from, p_to: to });
export const setDay = (day: string, state: string | null, city: string | null) => call("set_my_day", { p_day: day, p_state: state, p_city: city, p_note: null });
export const myArtist = () => call<{ slug: string; name: string; based_city: string | null; status: string } | null>("my_artist");
