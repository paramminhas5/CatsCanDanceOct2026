// Thin PostgREST client. No SDK, no ORM: fewer deps, faster builds.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const headers = () => ({
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
});

export async function select<T>(path: string, revalidate = 300): Promise<T[]> {
  if (!URL || !KEY) return [];
  try {
    const res = await fetch(`${URL}/rest/v1/${path}`, { headers: headers(), next: { revalidate } });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (!URL || !KEY) return null;
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${fn} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export type CcdEvent = {
  slug: string;
  title: string;
  episode_no: number | null;
  start_time: string | null;
  rsvp_open: boolean | null;
  capacity: number | null;
  recap: string | null;
  date: string | null;
  event_date: string | null;
  city: string | null;
  venue: string | null;
  blurb: string | null;
  lineup: string[] | null;
  status: string | null;
  poster_url: string | null;
  ticket_url: string | null;
  series_label: string | null;
  pet_friendly: boolean | null;
};

export type SceneBoardEvent = {
  id: string; title: string; url: string; ticket_url: string | null; source: string;
  city: string | null; venue: string | null; event_date: string | null; event_time: string | null;
  genres: string[] | null; lineup: string[] | null; kind: "club" | "concert" | "festival"; featured: boolean;
};

export type SceneEvent = {
  id: string;
  title: string;
  url: string;
  source: string;
  city: string | null;
  venue: string | null;
  event_date: string | null;
  event_time: string | null;
  image_url: string | null;
  genres: string[];
  featured: boolean;
};

export type Artist = {
  slug: string;
  name: string;
  kind: string;
  based_city: string | null;
  from_city: string | null;
  bio: string | null;
  why: string | null;
  genres: string[];
  festivals: string[];
  instagram: string | null;
  website: string | null;
  soundcloud: string | null;
  spotify: string | null;
  labels: string | null;
  is_resident: boolean;
  featured: boolean;
  photo_url: string | null;
  open_to_bookings: boolean;
  played_ccd: boolean | null;
  mix_url: string | null;
  claimed_at: string | null;
  rank: number | null;
  tier: string | null;
};

export type Promoter = {
  slug: string; name: string; city: string | null; cities: string[]; genres: string[];
  blurb: string | null; instagram: string | null; website: string | null;
};

export type Ngo = {
  slug: string; rank: number | null; name: string; city: string | null; location: string | null;
  focus: string[]; categories: string[]; donation: string | null; impact: string | null; website: string | null;
};

export type Post = {
  slug: string; title: string; category: string | null; excerpt: string | null; published_on: string | null;
  author: string | null; tldr: string | null; body: string[];
};

export type Scene = { kind: string; slug: string; name: string; tagline: string | null; data: Record<string, unknown> };

export type CcdGig = { artist_slug: string; event_slug: string; event_name: string; venue: string | null; city: string | null; event_date: string | null; episode_no: number | null };

export type TouringDate = {
  id: string;
  artist_slug: string;
  artist_name: string;
  city: string;
  from_date: string;
  to_date: string;
  note: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);

export const getCcdEvents = () =>
  select<CcdEvent>("events?published=is.true&order=event_date.asc.nullslast,sort_order.asc");

export const getScenePicks = (limit = 60) =>
  select<SceneEvent>(
    `scraped_events?status=eq.published&or=(event_date.gte.${today()},event_date.is.null)&order=featured.desc,event_date.asc&limit=${limit}`,
  );

export const getCcdEvent = async (slug: string) =>
  (await select<CcdEvent>(`events?slug=eq.${encodeURIComponent(slug)}&published=is.true&limit=1`, 120))[0] ?? null;

export const getTouring = (artistSlug?: string) =>
  select<TouringDate>(
    `touring_now?order=from_date.asc${artistSlug ? `&artist_slug=eq.${encodeURIComponent(artistSlug)}` : ""}`,
    120,
  );

export async function rsvpCount(slug: string) {
  try {
    return (await rpc<number>("rsvp_count", { p_event_slug: slug })) ?? 0;
  } catch {
    return 0;
  }
}

export const SCHOOL_URL = process.env.NEXT_PUBLIC_SCHOOL_URL ?? "https://ableton-final-next-ccd-school.vercel.app";

/** Split CCD nights into the next one(s) and the archive, newest first. */
export function splitEvents(all: CcdEvent[]) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = all.filter((e) => (e.event_date ? e.event_date >= today : e.status === "upcoming"));
  const past = all
    .filter((e) => !upcoming.includes(e))
    .sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""));
  return { upcoming, past };
}

export const getArtists = () =>
  select<Artist>("artists?status=eq.approved&order=is_resident.desc,featured.desc,name.asc");

export const getArtist = async (slug: string) =>
  (await select<Artist>(`artists?slug=eq.${encodeURIComponent(slug)}&status=eq.approved&limit=1`))[0] ?? null;

export function fmtLong(d: string | null) {
  if (!d) return "TBA";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function fmtDate(d: string | null, fallback?: string | null) {
  if (!d) return fallback ?? "TBA";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export const getPromoters = () => select<Promoter>("promoters?order=name.asc", 600);
export const getNgos = () => select<Ngo>("ngos?order=rank.asc.nullslast,name.asc", 600);
export const getPosts = () =>
  select<Post>("posts?select=slug,title,category,excerpt,published_on,author,tldr,body&order=published_on.desc.nullslast", 600);
export const getPost = async (slug: string) =>
  (await select<Post>(`posts?slug=eq.${encodeURIComponent(slug)}&limit=1`, 600))[0] ?? null;
export const getScenes = () => select<Scene>("scenes?order=kind.asc,name.asc", 600);
export const getScene = async (kind: string, slug: string) =>
  (await select<Scene>(`scenes?kind=eq.${encodeURIComponent(kind)}&slug=eq.${encodeURIComponent(slug)}&limit=1`, 600))[0] ?? null;
export const getCcdGigs = (artistSlug: string) =>
  select<CcdGig>(`ccd_gigs?artist_slug=eq.${encodeURIComponent(artistSlug)}&order=event_date.desc`, 300);

/** Published scene events through the scene_events RPC (the table itself is closed to the public). */
export async function getSceneEvents(): Promise<SceneBoardEvent[]> {
  try {
    const r = await rpc<SceneBoardEvent[]>("scene_events", { p_kind: null });
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}
