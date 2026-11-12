/**
 * On tour: who is playing where, and which dates are open. Ported from apps/ccd/src/lib/tour.ts.
 *
 * One row per date window, from four places:
 *   post   approved tour posts (migration 040)
 *   gig    confirmed artist links on published scene nights
 *   ccd    names on CCD's own upcoming nights
 *   dates  approved single-city dates from the old form (artist_dates)
 *
 * loadTourBoard() reads the tour_board RPC. If it is missing it builds the same rows from what
 * exists today. Everything here is rule based, no AI.
 */
import { getSceneEvents, matchArtists, rpc, select, todayIST, REVALIDATE } from "@/lib/db";
import { ccd } from "@/lib/site";

export type TourState = "playing" | "open";
export type TourKind = "touring" | "away";

/** Shape returned by tour_board (and by the fallback). */
export type TourRow = {
  src: "post" | "gig" | "ccd" | "dates";
  ref: string;
  post_kind: TourKind | null;
  artist_slug: string | null;
  artist_name: string;
  home: string | null;
  city: string;
  from_date: string;
  to_date: string;
  state: TourState;
  venue: string | null;
  title: string | null;
  url: string | null;
  ticket_url: string | null;
  note: string | null;
  instagram: string | null;
  ra: string | null;
  spotify: string | null;
};

/** What the page gets: a row plus who the act is relative to the city. */
export type TourStop = TourRow & {
  id: string;
  kind: TourKind | null;   // null: CCD lineup or old-form date where we can't tell
  photo_url: string | null;
  genres: string[];
};

type RosterArtist = {
  slug: string; name: string; based_city: string | null; from_city: string | null;
  instagram: string | null; spotify: string | null; photo_url: string | null; genres: string[] | null;
};

// ── Cities ─────────────────────────────────────────────────────────────────
/** Same rules as the city_norm() SQL function. */
export function cityNorm(p: string | null | undefined): string {
  const t = (p ?? "").trim();
  const l = t.toLowerCase();
  if (!t) return "";
  if (["bengaluru", "bangalore", "blr", "bengalooru"].includes(l)) return "Bengaluru";
  if (["mumbai", "bombay"].includes(l)) return "Mumbai";
  if (["delhi", "new delhi", "delhi ncr", "ncr", "gurgaon", "gurugram", "noida"].includes(l)) return "Delhi NCR";
  if (l === "pune") return "Pune";
  if (l === "hyderabad") return "Hyderabad";
  if (["chennai", "madras"].includes(l)) return "Chennai";
  if (["kolkata", "calcutta"].includes(l)) return "Kolkata";
  if (l === "goa") return "Goa";
  return t;
}

export const TOUR_CITIES = ["Bengaluru", "Mumbai", "Delhi NCR", "Goa", "Pune", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Chandigarh", "Kochi", "Shillong", "Guwahati"];

/** Approximate map positions (percent of a 0..100 box) for the static India outline. */
export const CITY_XY: Record<string, [number, number]> = {
  "Delhi NCR": [38, 28], Chandigarh: [37, 21], Jaipur: [33, 34], Ahmedabad: [24, 44], Mumbai: [26, 56], Pune: [29, 59], Goa: [27, 67],
  Bengaluru: [36, 76], Chennai: [45, 76], Hyderabad: [40, 62], Kochi: [33, 86], Kolkata: [68, 48], Guwahati: [80, 38], Shillong: [81, 41],
};

const INDIA_RE = /\b(india|bengaluru|bangalore|mumbai|bombay|delhi|gurgaon|gurugram|noida|goa|pune|hyderabad|chennai|kolkata|ahmedabad|jaipur|chandigarh|kochi|cochin|shillong|guwahati|lucknow|indore|bhopal|surat|vadodara|mysore|mysuru|manipal|dharamshala|rishikesh|kasauli|udaipur)\b/i;

/** "Mumbai, India" -> "Mumbai". "India" alone -> "". */
const homeCityOf = (home: string) => {
  const first = home.split(",")[0].trim();
  return /^india$/i.test(first) ? "" : cityNorm(first);
};

/**
 * Touring (based outside India), away (Indian act in another city), home (playing their own city)
 * or null when we don't know where they are from.
 */
export function classify(r: Pick<TourRow, "post_kind" | "home" | "city">): TourKind | "home" | null {
  if (r.post_kind) return r.post_kind;
  if (!r.home) return null;
  if (!INDIA_RE.test(r.home)) return "touring";
  const hc = homeCityOf(r.home);
  if (hc && hc === cityNorm(r.city)) return "home";
  return hc ? "away" : null;
}

/** Keep posts, CCD nights and old-form dates. Keep scene gigs only when the act is travelling. */
export function toStops(rows: TourRow[], roster: Map<string, RosterArtist>): TourStop[] {
  const out: TourStop[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const c = classify(r);
    if (r.src === "gig" && (c === "home" || c === null)) continue;
    const city = cityNorm(r.city);
    const key = `${r.artist_slug ?? r.artist_name.toLowerCase()}|${city}|${r.from_date}|${r.state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const a = r.artist_slug ? roster.get(r.artist_slug) : undefined;
    out.push({
      ...r,
      city,
      id: `${r.src}:${r.ref}:${r.artist_slug ?? r.artist_name}:${city}:${r.from_date}`,
      kind: c === "home" ? null : c,
      photo_url: a?.photo_url ?? null,
      genres: (a?.genres ?? []).slice(0, 3),
    });
  }
  return out.sort((x, y) => x.from_date.localeCompare(y.from_date) || x.artist_name.localeCompare(y.artist_name));
}

// ── Loading (server) ───────────────────────────────────────────────────────
const ROSTER_SELECT = "artists?status=eq.approved&select=slug,name,based_city,from_city,instagram,spotify,photo_url,genres";

export async function loadTourBoard(): Promise<{ stops: TourStop[]; live: boolean }> {
  const roster = await select<RosterArtist>(ROSTER_SELECT, 600, ["artists"]);
  const bySlug = new Map(roster.map((a) => [a.slug, a]));

  try {
    const r = await rpc<TourRow[]>("tour_board", { p_city: null }, REVALIDATE);
    if (Array.isArray(r)) return { stops: toStops(r, bySlug), live: true };
  } catch {
    // tour_board is not there yet (migration 040). Build the same rows from today's tables.
  }
  return { stops: toStops(await fallbackRows(roster, bySlug), bySlug), live: false };
}

async function fallbackRows(roster: RosterArtist[], bySlug: Map<string, RosterArtist>): Promise<TourRow[]> {
  const today = todayIST();
  const home = (a?: RosterArtist) => (a ? a.based_city ?? a.from_city : null);
  const byName = new Map(roster.map((a) => [a.name.trim().toLowerCase(), a]));

  const [dates, scene, ours] = await Promise.all([
    select<{ id: string; artist_slug: string; artist_name: string; city: string; from_date: string; to_date: string; note: string | null }>(
      "touring_now?order=from_date.asc", 600),
    getSceneEvents(),
    select<{ slug: string; title: string; event_date: string | null; venue: string | null; city: string | null; lineup: string[] | null; ticket_url: string | null; published: boolean | null; listed?: boolean | null; status: string | null }>(
      `events?published=is.true&event_date=gte.${today}&order=event_date.asc&limit=20`, 600),
  ]);

  const rows: TourRow[] = [];
  const base = { post_kind: null, title: null, url: null, ticket_url: null, note: null, venue: null, ra: null } as const;

  for (const d of dates) {
    const a = bySlug.get(d.artist_slug);
    rows.push({ ...base, src: "dates", ref: d.id, artist_slug: a?.slug ?? null, artist_name: d.artist_name, home: home(a),
      city: cityNorm(d.city), from_date: d.from_date, to_date: d.to_date, state: "open", note: d.note,
      instagram: a?.instagram ?? null, spotify: a?.spotify ?? null });
  }

  // Confirmed links are not readable by anon, so ask artist_upcoming for each act named on a scene night.
  const candidates = new Set<string>();
  for (const e of scene) for (const a of matchArtists(e, roster)) candidates.add(a.slug);
  const gigs = await Promise.all([...candidates].slice(0, 60).map(async (slug) => {
    try {
      const r = await rpc<{ id: string; title: string; city: string | null; venue: string | null; event_date: string | null; ticket_url: string | null; url: string | null }[]>(
        "artist_upcoming", { p_slug: slug }, REVALIDATE);
      return (r ?? []).map((g) => ({ slug, g }));
    } catch { return []; }
  }));
  for (const { slug, g } of gigs.flat()) {
    if (!g.event_date || !g.city) continue;
    const a = bySlug.get(slug)!;
    rows.push({ ...base, src: "gig", ref: g.id, artist_slug: slug, artist_name: a.name, home: home(a),
      city: cityNorm(g.city), from_date: g.event_date, to_date: g.event_date, state: "playing", venue: g.venue, title: g.title,
      url: g.url, ticket_url: g.ticket_url ?? g.url, instagram: a.instagram, spotify: a.spotify });
  }

  for (const ev of ours) {
    if (!ev.event_date || ev.status === "cancelled" || ev.listed === false || ev.slug.startsWith("test-night")) continue;
    for (const raw of ev.lineup ?? []) {
      const name = raw.trim();
      if (!name) continue;
      const a = byName.get(name.toLowerCase());
      rows.push({ ...base, src: "ccd", ref: ev.slug, artist_slug: a?.slug ?? null, artist_name: a?.name ?? name, home: home(a),
        city: cityNorm(ev.city), from_date: ev.event_date, to_date: ev.event_date, state: "playing", venue: ev.venue, title: ev.title,
        url: ccd.night(ev.slug), ticket_url: ev.ticket_url ?? ccd.night(ev.slug), instagram: a?.instagram ?? null, spotify: a?.spotify ?? null });
    }
  }
  return rows;
}

// ── Dates (shared, pure) ───────────────────────────────────────────────────
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const d0 = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const addDays = (iso: string, n: number) => {
  const d = d0(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** "Fri 13 Nov", "18 to 30 Nov", "28 Nov to 2 Dec". */
export function windowLabel(from: string, to: string): string {
  const a = d0(from), b = d0(to);
  if (from === to) return `${DAYS[a.getUTCDay()]} ${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]}`;
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()} to ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
  return `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} to ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
}

/** Monday of the week the date falls in. */
export const weekStart = (iso: string) => addDays(iso, -((d0(iso).getUTCDay() + 6) % 7));

/** "This week", "Next week", "Week of 23 Nov". */
export function weekLabel(monday: string, today = todayIST()): string {
  const thisWeek = weekStart(today);
  if (monday <= thisWeek) return "This week";
  if (monday === addDays(thisWeek, 7)) return "Next week";
  const d = d0(monday);
  return `Week of ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export const dayParts = (iso: string) => {
  const d = d0(iso);
  return { dow: DAYS[d.getUTCDay()], day: String(d.getUTCDate()), month: MONTHS[d.getUTCMonth()] };
};

// ── Links ──────────────────────────────────────────────────────────────────
export const instagramUrl = (v: string) =>
  v.startsWith("http") ? v : `https://instagram.com/${v.replace(/^@/, "").replace(/\/$/, "")}`;

/** The artist's booking form with the date and city filled in. */
export const bookUrl = (slug: string, date: string, city: string) =>
  `/${slug}/book?date=${date}&city=${encodeURIComponent(city)}`;

export const connectUrl = (act: string, city: string, window: string) => {
  const q = new URLSearchParams({
    subject: `Booking: ${act} in ${city}, ${window}`,
    body: `Hi CCD,\n\nI'd like to book ${act} in ${city} (${window}). Can you connect us?\n\nMy name:\nVenue or crew:\nBudget:\n`,
  });
  return `mailto:hello@catscandance.com?${q.toString().replace(/\+/g, "%20")}`;
};
