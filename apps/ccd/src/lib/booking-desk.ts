/**
 * Booking desk calls from the browser. Each one prefers the migration 041 RPCs and falls back
 * when they are missing, so the desk works before Param applies 041:
 *   - requests fall back to /api/booking-inquiry-v2 (the old request_booking RPC), one per artist,
 *     with the night brief folded into the message;
 *   - threads, counters, calendar and settings report `missing: true`, and the UI says
 *     "Coming soon, needs database update".
 */
import { track } from "@/lib/track";
import { supabase } from "@/lib/supabase";
import { BUDGETS, roomLabel, dayLong, type Stage } from "@/lib/desk";

type RpcErr = { code?: string; message?: string } | null;
export const missingFn = (e: RpcErr) =>
  !!e && (e.code === "PGRST202" || e.code === "42883" || /could not find the function|does not exist|schema cache/i.test(e.message ?? ""));

export type Res<T> = { ok: true; data: T } | { ok: false; missing?: boolean; error: string };

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<Res<T>> {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return { ok: false, missing: missingFn(error), error: missingFn(error) ? "Coming soon, needs database update." : error.message };
    if (data && typeof data === "object" && !Array.isArray(data) && (data as any).ok === false) return { ok: false, error: (data as any).error ?? "Something went wrong." };
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
  } catch {}
}
export const keyFor = (id: string) => savedKeys().find((k) => k.id === id)?.key ?? null;

// ── send a request ──────────────────────────────────────────────────────────
export type NightBrief = {
  date: string; city: string; venue: string; room: number | null; set: string; budget: string;
  other: string; message: string; name: string; email: string; org: string; hp: string;
};
export type SendResult =
  | { ok: true; mode: "v2"; requests: { id: string; key: string; artist_slug: string; stage: Stage }[] }
  | { ok: true; mode: "v1"; sent: string[]; failed: { slug: string; error: string }[] }
  | { ok: false; error: string };

export function briefText(b: NightBrief) {
  const band = BUDGETS.find((x) => x.key === b.budget);
  const lines = [
    "Night brief",
    `Date: ${b.date ? dayLong(b.date) : "not set"}`,
    `City: ${b.city}`,
    b.venue && `Venue: ${b.venue}`,
    b.room && `Room: ${roomLabel(b.room)}`,
    b.set && `Set: ${b.set}`,
    band?.key && `Budget: ${band.label}`,
    b.other && `Other acts: ${b.other}`,
    b.org && `Organiser: ${b.org}`,
  ].filter((x): x is string => typeof x === "string" && x !== "");
  return [lines.join("\n"), b.message.trim()].filter(Boolean).join("\n\n");
}

export async function sendBookingRequest(slugs: string[], names: Record<string, string>, b: NightBrief): Promise<SendResult> {
  const band = BUDGETS.find((x) => x.key === b.budget);
  const v2 = await supabase.rpc("request_booking_v2", {
    p_artist_slugs: slugs, p_name: b.name.trim(), p_email: b.email.trim(), p_org: b.org.trim() || null, p_city: b.city.trim(), p_date: b.date,
    p_venue: b.venue.trim() || null, p_room_size: b.room, p_set_length: b.set || null, p_budget_band: band?.key ? band.label : null,
    p_budget_max_inr: band?.max ?? band?.min ?? null, p_other_acts: b.other.trim() || null, p_message: b.message.trim() || null, p_hp: b.hp || null,
  });
  if (!v2.error) {
    const d = v2.data as any;
    if (!d?.ok) return { ok: false, error: d?.error ?? "Could not send. Try again." };
    const reqs = (d.requests ?? []) as { id: string; key: string; artist_slug: string; stage: Stage }[];
    saveKeys(reqs.map((r) => ({ id: r.id, key: r.key, artist: names[r.artist_slug] ?? r.artist_slug, date: b.date })));
    track("book_request", { artists: reqs.length });
    fetch("/api/booking-desk/notify", { method: "POST" }).catch(() => {});
    return { ok: true, mode: "v2", requests: reqs };
  }
  if (!missingFn(v2.error)) return { ok: false, error: v2.error.message || "Could not send. Try again." };
  if (b.hp) return { ok: true, mode: "v1", sent: slugs, failed: [] }; // honeypot: pretend it worked

  // Fallback before 041: the old route, one call per artist.
  const sent: string[] = [];
  const failed: { slug: string; error: string }[] = [];
  for (const slug of slugs) {
    try {
      const r = await fetch("/api/booking-inquiry-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_slug: slug, requester_name: b.name.trim(), requester_email: b.email.trim(), venue_name: b.org.trim() || b.venue.trim(),
          venue_city: b.city.trim(), event_date: b.date, budget_inr: band?.max ?? band?.min ?? null, notes: briefText(b), source: "booking_desk",
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) sent.push(slug); else failed.push({ slug, error: j?.error ?? "Could not send." });
    } catch { failed.push({ slug, error: "Network error." }); }
  }
  if (!sent.length) return { ok: false, error: failed[0]?.error ?? "Could not send. Try again." };
  return { ok: true, mode: "v1", sent, failed };
}

// ── threads ─────────────────────────────────────────────────────────────────
export type ThreadMsg = { id: string; author_role: "requester" | "artist" | "system" | "ops"; kind: string; body: string | null; fee_inr: number | null; set_terms: string | null; created_at: string };
export type Thread = {
  role: "requester" | "artist";
  request: {
    id: string; group_id: string | null; stage: Stage; created_at: string; updated_at: string; seen_at: string | null; accepted_at: string | null;
    confirmed_at: string | null; cancelled_at: string | null; name: string; org: string | null; email: string | null; city: string | null;
    event_date: string | null; venue: string | null; room_size: number | null; set_length: string | null; budget_band: string | null;
    budget_max_inr: number | null; other_acts: string | null; message: string | null; fee_inr: number | null; set_terms: string | null;
    last_actor: string | null; declined_reason: string | null; terms: Record<string, string | null> | null;
  };
  artist: { slug: string; name: string; photo_url: string | null; based_city: string | null; genres: string[]; verified: boolean; played_ccd: boolean } | null;
  settings: { formats: any[]; min_notice_days: number | null; travel_cities: string[]; travels_anywhere: boolean; travel_terms: string | null; rider: string | null; tech: string | null; included: string | null; cancellation_terms: string | null; templates: { name: string; body: string }[] | null } | null;
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
      const [mine, forMe] = await Promise.all([supabase.rpc("my_bookings"), supabase.rpc("my_booking_requests")]);
      for (const x of ((mine.data as any[]) ?? [])) rows.push(legacyRow(x, "requester"));
      for (const x of ((forMe.data as any[]) ?? [])) rows.push(legacyRow(x, "artist"));
    }
  }
  if (keys.length && !legacy) {
    const r = await call<ThreadRow[]>("booking_threads_by_keys", { p_keys: keys });
    if (r.ok) for (const x of r.data ?? []) if (!rows.some((y) => y.id === x.id)) rows.push(x);
  }
  return { rows: rows.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")), legacy };
}

function legacyRow(x: any, role: "requester" | "artist"): ThreadRow {
  const stage: Stage = x.response === "interested" ? "interested" : x.response === "declined" ? "declined" : "sent";
  return {
    id: x.id, role, stage, artist_slug: x.slug ?? "", artist: x.artist ?? null, photo_url: null, name: x.name ?? "", org: x.org ?? null, city: x.city ?? null,
    event_date: x.event_date ?? null, venue: null, room_size: null, set_length: null, budget_band: x.budget ?? null, budget_max_inr: null, fee_inr: null,
    last_actor: null, created_at: x.created_at, updated_at: x.created_at, last_message: x.note ?? null, legacy: true, message: x.message ?? null,
  };
}

// ── artist side ─────────────────────────────────────────────────────────────
export type MySettings = {
  act_types: string[]; formats: any[]; min_notice_days: number | null; travel_cities: string[]; travels_anywhere: boolean;
  travel_terms: string | null; rider: string | null; tech: string | null; included: string | null; cancellation_terms: string | null;
  auto_decline_below_inr: number | null; templates: { name: string; body: string }[];
};
export const loadMySettings = () => call<MySettings | null>("my_booking_settings");
export const saveMySettings = (p: MySettings) => call("save_my_booking_settings", { p });
export type DayRow = { day: string; state: "open" | "booked" | "playing"; city: string | null; note: string | null };
export const loadCalendar = (from: string, to: string) => call<DayRow[]>("my_calendar", { p_from: from, p_to: to });
export const setDay = (day: string, state: string | null, city: string | null) => call("set_my_day", { p_day: day, p_state: state, p_city: city, p_note: null });

export const DEFAULT_TEMPLATES = [
  { name: "Interested", body: "Thanks for the brief. I'm interested. Can you share the venue, the set time and who else is playing?" },
  { name: "Fee and rider", body: "Happy to do it. My fee for this is in the counter above. I need CDJs or a controller-ready booth, a booth monitor, and travel from my city covered." },
  { name: "Not free", body: "Thanks for thinking of me. I'm not free that night. Keep me in mind for the next one." },
];
