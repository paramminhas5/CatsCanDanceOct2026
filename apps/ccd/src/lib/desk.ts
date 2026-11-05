/**
 * Booking desk: shared types and pure helpers. Used by getStaticProps on /book and in the browser.
 *
 * Honesty rules baked in here:
 *  - "Rate from" only comes from what an artist set in their booking settings. Old imported fee
 *    columns are never shown.
 *  - "Free on <date>" only when the artist marked the day open, or posted a tour window in that city.
 *    No known gig is labelled as exactly that: "No gig listed".
 */

export type ActType = "dj" | "live" | "band" | "producer_live" | "vj";
export const ACT_LABEL: Record<ActType, string> = { dj: "DJ", live: "Live act", band: "Band", producer_live: "Producer live", vj: "VJ" };
export const ACT_FILTERS: { key: "" | "dj" | "live" | "band" | "vj"; label: string }[] = [
  { key: "", label: "Any act" },
  { key: "dj", label: "DJs" },
  { key: "live", label: "Live acts" },
  { key: "band", label: "Bands" },
  { key: "vj", label: "VJs" },
];

export type Format = { kind: ActType; label?: string | null; minutes_min?: number | null; minutes_max?: number | null; band_size?: number | null; rate_from_inr?: number | null };

export type PublicSettings = {
  act_types: ActType[];
  formats: Format[];
  min_notice_days: number | null;
  travel_cities: string[];
  travels_anywhere: boolean;
  travel_terms: string | null;
  rider: string | null;
  tech: string | null;
  included: string | null;
  cancellation_terms: string | null;
};

export type DeskArtist = {
  slug: string;
  name: string;
  city: string | null;       // display city, e.g. "Delhi" or "London"
  from: string | null;       // where they are from, when different
  genres: string[];
  photo_url: string | null;
  bio: string | null;        // first ~180 chars
  members: string | null;
  played_ccd: boolean;
  verified: boolean;         // claimed by the artist
  acts: ActType[];
  acts_set: boolean;         // acts came from the artist's own settings
  settings: PublicSettings | null;
  open_days: string[];       // days the artist marked open
  busy: { day: string; what: string }[];  // known gigs or days marked booked/playing
  windows: { city: string; from: string; to: string }[]; // tour windows
  reply_hours: number | null;
  mix_url: string | null;
  rank: number | null;
};

export type MiniArtist = {
  slug: string;
  name: string;
  photo_url: string | null;
  city: string | null;
  sound?: string;
  rate_from?: number | null;
  min_notice_days?: number | null;
  busy_days?: string[];
};

export const toMini = (a: DeskArtist): MiniArtist => ({
  slug: a.slug, name: a.name, photo_url: a.photo_url, city: a.city, sound: soundLine(a.genres),
  rate_from: rateFrom(a), min_notice_days: a.settings?.min_notice_days ?? null, busy_days: a.busy.map((b) => b.day),
});

// ── cities ──────────────────────────────────────────────────────────────────
const ALIAS: Record<string, string> = {
  "new delhi": "Delhi", delhi: "Delhi", "delhi ncr": "Delhi", ncr: "Delhi", gurgaon: "Delhi", gurugram: "Delhi", noida: "Delhi",
  bangalore: "Bengaluru", bengaluru: "Bengaluru", blr: "Bengaluru",
  bombay: "Mumbai", mumbai: "Mumbai", "navi mumbai": "Mumbai",
  goa: "Goa", panjim: "Goa", vagator: "Goa", anjuna: "Goa",
  hyderabad: "Hyderabad", pune: "Pune", chennai: "Chennai", madras: "Chennai", kolkata: "Kolkata", calcutta: "Kolkata",
  chandigarh: "Chandigarh", jaipur: "Jaipur", ahmedabad: "Ahmedabad", kochi: "Kochi", cochin: "Kochi", shillong: "Shillong",
};
export const DESK_CITIES = ["Bengaluru", "Mumbai", "Delhi", "Goa", "Hyderabad", "Pune", "Chennai", "Kolkata", "Chandigarh", "Jaipur", "Kochi", "Shillong"];

/** "New Delhi, India" → "Delhi". "India" alone → null. "London, United Kingdom" → "London". */
export function normCity(raw?: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(/[,/(]/)[0].trim();
  const k = first.toLowerCase();
  if (!k || k === "india" || k === "worldwide" || k === "global") return null;
  return ALIAS[k] ?? first.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w+/g, (w) => w.toLowerCase());
}
export const sameCity = (a?: string | null, b?: string | null) => !!a && !!b && normCity(a)?.toLowerCase() === normCity(b)?.toLowerCase();

// ── acts and sound ──────────────────────────────────────────────────────────
/** Best guess at the act type from genres and bio, used only until the artist sets it. */
export function inferActs(genres: string[], bio: string | null, members: string | null): ActType[] {
  const t = `${genres.join(" ")} ${bio ?? ""}`.toLowerCase();
  const out = new Set<ActType>();
  if (/\bvj\b|\bvjing\b|visual artist|audio-?visual/.test(t)) out.add("vj");
  if (/\bband\b|\bquartet\b|\btrio\b|\bfive-piece\b|\bfour-piece\b|\bdrummer\b|\bguitarist\b|\bvocalist\b/.test(t) && !/\bdj\b/.test(t)) out.add("band");
  if (/live (set|act|show|electronic|electronica|performance|pa)\b|live electronica|\bhardware\b|\bmodular\b|drum machines|live looping/.test(t)) out.add("live");
  if (/\bdj\b|dj set|\bselector\b|\bb2b\b|\bdjs\b/.test(t) || out.size === 0) out.add("dj");
  if (members && /\+|,|\band\b/.test(members) && out.has("band")) out.add("band");
  return [...out];
}
export const actLine = (acts: ActType[]) => acts.map((x) => ACT_LABEL[x]).join(" and ");

export function soundLine(genres: string[], n = 3) {
  const g = genres.filter(Boolean).slice(0, n);
  if (!g.length) return "";
  return g.map((x, i) => (i === 0 ? x : x.toLowerCase())).join(", ");
}

export function rateFrom(a: Pick<DeskArtist, "settings">, act?: ActType | ""): number | null {
  const fs = (a.settings?.formats ?? []).filter((f) => !act || f.kind === act || (act === "live" && f.kind === "producer_live"));
  const rates = fs.map((f) => Number(f.rate_from_inr)).filter((n) => Number.isFinite(n) && n > 0);
  return rates.length ? Math.min(...rates) : null;
}

export function formatLine(f: Format): string {
  const kind = f.label?.trim() || ACT_LABEL[f.kind] || "Set";
  const mins = (m?: number | null) => (m ? (m % 60 === 0 ? `${m / 60}h` : `${m} min`) : "");
  const len = f.minutes_min && f.minutes_max && f.minutes_max !== f.minutes_min ? `${mins(f.minutes_min)} to ${mins(f.minutes_max)}` : mins(f.minutes_min ?? f.minutes_max);
  const size = f.band_size ? `${f.band_size} on stage` : "";
  return [kind, len, size].filter(Boolean).join(", ");
}

// ── money and dates ─────────────────────────────────────────────────────────
export const inrShort = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : n >= 1000 ? `₹${Math.round(n / 1000)}K` : `₹${n}`;
export const inrFull = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const dayShort = (iso: string) => { const d = new Date(`${iso}T00:00:00Z`); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
export const dayLong = (iso: string) => { const d = new Date(`${iso}T00:00:00Z`); return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
export const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const isIsoDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function replyLine(h: number | null): string | null {
  if (h == null) return null;
  if (h < 2) return "Usually replies within 2 hours";
  if (h < 24) return `Usually replies within ${Math.ceil(h)} hours`;
  return `Usually replies within ${Math.ceil(h / 24)} days`;
}

// ── brief options ───────────────────────────────────────────────────────────
export const BUDGETS: { key: string; label: string; min: number | null; max: number | null }[] = [
  { key: "", label: "Any budget", min: null, max: null },
  { key: "u25", label: "Under ₹25K", min: null, max: 25000 },
  { key: "25-50", label: "₹25K to ₹50K", min: 25000, max: 50000 },
  { key: "50-100", label: "₹50K to ₹1L", min: 50000, max: 100000 },
  { key: "100+", label: "₹1L and up", min: 100000, max: null },
];
export const ROOM_SIZES: { v: number; label: string }[] = [
  { v: 80, label: "Under 100 people" },
  { v: 200, label: "100 to 300 people" },
  { v: 500, label: "300 to 800 people" },
  { v: 1200, label: "800 people or more" },
];
export const roomLabel = (n?: number | null) => (n ? ROOM_SIZES.find((r) => r.v === n)?.label ?? `About ${n} people` : null);
export const SET_LENGTHS = ["1 hour DJ set", "2 hour DJ set", "3 hour DJ set", "Open to close", "Live set, about an hour", "Band set", "Not sure yet"];

// ── ranking ─────────────────────────────────────────────────────────────────
export type Brief = { date: string; city: string; budget: string; act: string; sound: string; q: string };
export type Reason = { label: string; tone: "good" | "warn" | "bad" | "info" };
export type Group = "free" | "clear" | "busy" | "all";
export type Ranked = { a: DeskArtist; group: Group; score: number; reasons: Reason[]; rate: number | null };

export function rankArtists(list: DeskArtist[], brief: Brief, today: string): Ranked[] {
  const city = normCity(brief.city);
  const budget = BUDGETS.find((b) => b.key === brief.budget) ?? BUDGETS[0];
  const act = brief.act as ActType | "";
  const q = brief.q.trim().toLowerCase();
  const sound = brief.sound.trim().toLowerCase();
  const date = isIsoDay(brief.date) && brief.date >= today ? brief.date : "";

  const out: Ranked[] = [];
  for (const a of list) {
    if (act && !a.acts.includes(act) && !(act === "live" && a.acts.includes("producer_live"))) continue;
    if (sound && !a.genres.some((g) => g.toLowerCase().includes(sound))) continue;
    if (q && !`${a.name} ${a.genres.join(" ")} ${a.city ?? ""} ${a.members ?? ""}`.toLowerCase().includes(q)) continue;
    const rate = rateFrom(a, act);
    if (rate != null && budget.max != null && rate > budget.max) continue;

    const reasons: Reason[] = [];
    let score = 0;
    let group: Group = date ? "clear" : "all";

    if (date) {
      const gig = a.busy.find((b) => b.day === date);
      const win = a.windows.find((w) => w.from <= date && w.to >= date);
      if (gig) {
        group = "busy"; score -= 100;
        reasons.push({ label: `${gig.what} on ${dayShort(date)}`, tone: "bad" });
      } else if (a.open_days.includes(date)) {
        group = "free"; score += 60;
        reasons.push({ label: `Free on ${dayShort(date)}`, tone: "good" });
      } else if (win && (!city || sameCity(win.city, city))) {
        group = "free"; score += 55;
        reasons.push({ label: `Touring ${normCity(win.city) ?? win.city} on ${dayShort(date)}`, tone: "good" });
      } else if (win) {
        score -= 10;
        reasons.push({ label: `In ${normCity(win.city) ?? win.city} that week`, tone: "warn" });
      } else {
        reasons.push({ label: `No gig listed on ${dayShort(date)}`, tone: "info" });
      }
      const notice = a.settings?.min_notice_days;
      if (notice && daysBetween(today, date) < notice) { score -= 20; reasons.push({ label: `Asks for ${notice} days notice`, tone: "warn" }); }
    }

    if (city) {
      if (sameCity(a.city, city)) { score += 25; reasons.push({ label: `Based in ${city}`, tone: "good" }); }
      else if (a.settings?.travel_cities?.some((c) => sameCity(c, city))) { score += 18; reasons.push({ label: `Plays ${city}`, tone: "good" }); }
      else if (a.settings?.travels_anywhere) { score += 12; reasons.push({ label: "Travels anywhere", tone: "good" }); }
      else if (sameCity(a.from, city)) { score += 6; reasons.push({ label: `From ${city}`, tone: "info" }); }
    }
    if (sound) { score += 15; reasons.push({ label: "Sound match", tone: "good" }); }
    if (rate != null && budget.max != null) { score += 8; reasons.push({ label: "In your budget", tone: "good" }); }
    if (a.played_ccd) score += 6;
    if (a.verified) score += 6;
    if (a.settings) score += 4;
    if (a.photo_url) score += 3;
    if (a.bio) score += 1;
    score -= (a.rank ?? 500) / 1000;
    out.push({ a, group, score, reasons, rate });
  }
  const order: Record<Group, number> = { free: 0, clear: 1, all: 1, busy: 2 };
  return out.sort((x, y) => order[x.group] - order[y.group] || y.score - x.score || x.a.name.localeCompare(y.a.name));
}

// ── stages ──────────────────────────────────────────────────────────────────
export type Stage = "sent" | "seen" | "interested" | "countered" | "declined" | "accepted" | "confirmed" | "cancelled";
export const STAGE_LABEL: Record<Stage, string> = {
  sent: "Sent", seen: "Seen", interested: "Interested", countered: "Counter offer", declined: "Declined",
  accepted: "Accepted", confirmed: "Confirmed", cancelled: "Withdrawn",
};
export const STAGE_TONE: Record<Stage, string> = {
  sent: "bg-cream text-ink", seen: "bg-cream text-ink", interested: "bg-acid-yellow text-ink", countered: "bg-electric-blue text-cream",
  declined: "bg-ink/10 text-ink/60", accepted: "bg-acid-yellow text-ink", confirmed: "bg-magenta text-cream", cancelled: "bg-ink/10 text-ink/60",
};
/** Stepper position: Sent 0, Seen 1, Answer 2, Accepted 3, Confirmed 4. */
export const stageStep = (s: Stage) => ({ sent: 0, seen: 1, interested: 2, countered: 2, declined: 2, accepted: 3, confirmed: 4, cancelled: 0 }[s] ?? 0);
