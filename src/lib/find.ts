/**
 * Find (Prowl): helpers for the scene calendar. Pure functions, used on the server
 * (getStaticProps) and in the browser (filters).
 */
import { todayIST } from "@/lib/nights";
import type { SceneBoardEvent } from "@/lib/ccd-db";

export type When = "tonight" | "weekend" | "week" | "all";
export type Kind = "all" | "club" | "big";

export type FindArtist = { name: string; slug: string };
export type FindEvent = SceneBoardEvent & { artists: FindArtist[] };

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Date range [from, to] for a "when" filter, in India time. to = null means open-ended. */
export function whenRange(w: When, today = todayIST()): [string, string | null] {
  if (w === "tonight") return [today, today];
  if (w === "week") return [today, addDays(today, 6)];
  if (w === "weekend") {
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 Sun .. 6 Sat
    if (dow === 0) return [today, today];                    // Sunday: just today
    const fri = addDays(today, (5 - dow + 7) % 7);
    const start = dow === 6 || dow === 5 ? today : fri;
    const sun = addDays(today, 7 - dow);
    return [start, sun];
  }
  return [today, null];
}

export function inWhen(e: { event_date: string | null }, w: When, today = todayIST()): boolean {
  if (!e.event_date) return w === "all";
  const [from, to] = whenRange(w, today);
  return e.event_date >= from && (to === null || e.event_date <= to);
}

/** Match published Litter artists named in an event's lineup or title. Names under 4 letters are skipped to avoid false hits. */
export function matchArtists(e: SceneBoardEvent, artists: FindArtist[]): FindArtist[] {
  const hay = ` ${[e.title, ...(e.lineup ?? [])].join(" , ")} `.toLowerCase();
  const out: FindArtist[] = [];
  for (const a of artists) {
    const n = a.name.trim().toLowerCase();
    if (n.length < 4) continue;
    const re = new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
    if (re.test(hay) && !out.some((x) => x.slug === a.slug)) out.push(a);
  }
  return out.slice(0, 6);
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Day stamp parts for the agenda: { label: "Tonight" | "Tomorrow" | "Thu", day: "12", month: "Nov" }. */
export function dayStamp(iso: string | null, today = todayIST()) {
  if (!iso) return { label: "Date TBA", day: "?", month: "", key: "tba" };
  const d = new Date(`${iso}T00:00:00Z`);
  const label = iso === today ? "Tonight" : iso === addDays(today, 1) ? "Tomorrow" : DAYS[d.getUTCDay()];
  return { label, day: String(d.getUTCDate()), month: MONTHS[d.getUTCMonth()], key: iso };
}

export const kindLabel = (k: string) => (k === "club" ? "Club night" : k === "festival" ? "Festival" : "Concert");

export const SOURCE_LABEL: Record<string, string> = {
  gigscalendar: "Gigs Calendar", district: "District", insider: "Insider", highape: "HighApe", skillbox: "Skillbox",
  allevents: "AllEvents", submitted: "Sent in", member: "A member",
};

/** Source categories that are not sounds ("club gigs", "music shows"). Hidden from chips and filters. */
const NOT_A_SOUND = new Set(["club gigs", "music shows", "gigs", "events", "nightlife", "concerts", "club night", "club nights"]);

/** One spelling per sound: drop source categories, start each word with a capital, dedupe ignoring case. */
export function tidyGenres(list: string[] | null | undefined): string[] {
  const out = new Map<string, string>();
  for (const raw of list ?? []) {
    const g = raw.trim().replace(/\s+/g, " ");
    const k = g.toLowerCase();
    if (!g || NOT_A_SOUND.has(k) || out.has(k)) continue;
    out.set(k, g === k ? g.replace(/(^|[\s&/-])([a-z])/g, (_, p, c) => p + c.toUpperCase()) : g);
  }
  return [...out.values()];
}

/**
 * Display tidy for scraped titles. Source punctuation stays in the database; this only cleans what people read:
 * three or more dots become one ellipsis ("pres...." to "pres…"); two dots stay ("Fred again.." is a name), "pres." or "pres…" reads "presents", "Housed- Featuring" becomes "Housed: Featuring", stray spaces before
 * punctuation go, and em dashes (or spaced en dashes) become a colon.
 */
export function tidyTitle(t: string | null | undefined): string {
  if (!t) return "";
  return t
    .replace(/\s*\u2014\s*|\s+\u2013\s+/g, ": ")
    .replace(/\.{3,}|\u2026/g, "\u2026")
    .replace(/\bpres(?:\.|\u2026)(?=\s|$)/gi, "presents")
    .replace(/(\w)-\s+(?=\S)/g, "$1: ")
    .replace(/\s+([,.:;!?\u2026])/g, "$1")
    .replace(/:\s*:/g, ":")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s:.,-]+|[\s:,-]+$/g, "")
    .trim();
}
