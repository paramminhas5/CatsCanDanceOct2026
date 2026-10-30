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
};

const today = () => new Date().toISOString().slice(0, 10);

export const getCcdEvents = () =>
  select<CcdEvent>("events?published=is.true&order=event_date.asc.nullslast,sort_order.asc");

export const getScenePicks = (limit = 60) =>
  select<SceneEvent>(
    `scraped_events?status=eq.published&or=(event_date.gte.${today()},event_date.is.null)&order=featured.desc,event_date.asc&limit=${limit}`,
  );

export const getArtists = () =>
  select<Artist>("artists?status=eq.approved&order=is_resident.desc,featured.desc,name.asc");

export const getArtist = async (slug: string) =>
  (await select<Artist>(`artists?slug=eq.${encodeURIComponent(slug)}&status=eq.approved&limit=1`))[0] ?? null;

export function fmtDate(d: string | null, fallback?: string | null) {
  if (!d) return fallback ?? "TBA";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
