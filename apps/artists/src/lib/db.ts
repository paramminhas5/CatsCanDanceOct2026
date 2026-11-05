/**
 * Thin data access for public reads: PostgREST `select` with Next's fetch cache (5 minutes by
 * default) and anon RPC calls. The old site's `ccd-db.ts` pattern, on top of @ccd/db.
 *
 * Writes never happen here. Public writes go through the anon SECURITY DEFINER RPCs from the
 * browser or Server Actions (see booking-actions.ts), and staff writes through the token-guarded
 * ops_* RPCs with OPS_TOKEN (desk/*).
 */
import { supabaseEnv } from "@ccd/db";

export const REVALIDATE = 300;

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

/** SELECT through PostgREST. Returns [] on any error so a page never dies on one missing table. */
export async function select<T>(path: string, revalidate: number | false = REVALIDATE, tags?: string[]): Promise<T[]> {
  let env: { url: string; key: string };
  try { env = supabaseEnv(); } catch { return []; }
  try {
    const res = await fetch(`${env.url}/rest/v1/${path}`, {
      headers: headers(env.key),
      ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate, tags } }),
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

/** Anon RPC. Throws on a non-2xx so callers can tell "missing function" from "empty". */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}, revalidate: number | false = false): Promise<T | null> {
  const { url, key } = supabaseEnv();
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify(args),
    ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate } }),
  });
  if (!res.ok) throw new Error(`${fn} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/** RPC that returns null instead of throwing. For optional data (a function that may not exist yet). */
export async function safeRpc<T>(fn: string, args: Record<string, unknown> = {}, revalidate: number | false = false): Promise<T | null> {
  try { return await rpc<T>(fn, args, revalidate); } catch { return null; }
}

/** Server-side RPC with the { ok, data, error } convention the mailer and the ops pages use. */
export async function rpcResult(fn: string, args: Record<string, unknown>) {
  let env: { url: string; key: string };
  try { env = supabaseEnv(); } catch { return { ok: false as const, data: null, error: "Supabase is not configured" }; }
  try {
    const r = await fetch(`${env.url}/rest/v1/rpc/${fn}`, { method: "POST", headers: headers(env.key), body: JSON.stringify(args), cache: "no-store" });
    const body = await r.json().catch(() => null);
    if (!r.ok) return { ok: false as const, data: null, error: (body && (body.message as string)) || `Request failed (${r.status})` };
    return { ok: true as const, data: body, error: null };
  } catch {
    return { ok: false as const, data: null, error: "Network error" };
  }
}

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export const isSlug = (s: string) => /^[a-z0-9-]{1,80}$/.test(s);
export const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

// ── Shared row types ─────────────────────────────────────────────────────────
export type Artist = {
  slug: string;
  name: string;
  kind: string | null;
  based_city: string | null;
  from_city: string | null;
  bio: string | null;
  why: string | null;
  genres: string[] | null;
  festivals: string[] | null;
  instagram: string | null;
  website: string | null;
  soundcloud: string | null;
  spotify: string | null;
  labels: string | null;
  is_resident: boolean | null;
  featured: boolean | null;
  photo_url: string | null;
  open_to_bookings: boolean | null;
  played_ccd: boolean | null;
  mix_url: string | null;
  claimed_at: string | null;
  owner_member: string | null;
  members: string | null;
  rank: number | null;
  tier: string | null;
  lane: "core" | "parallel" | null;
  links: Record<string, string> | null;
  updated_at: string | null;
};

export const ARTIST_COLS =
  "slug,name,kind,based_city,from_city,bio,why,genres,festivals,instagram,website,soundcloud,spotify,labels,is_resident,featured,photo_url,open_to_bookings,played_ccd,mix_url,claimed_at,owner_member,members,rank,tier,lane,links,updated_at";

/** Every approved artist, richest first (see artist-richness.ts for the order used on the index). */
export const getArtists = () => select<Artist>(`artists?status=eq.approved&select=${ARTIST_COLS}&order=rank.asc.nullslast,name.asc`, REVALIDATE, ["artists"]);

export const getArtist = async (slug: string) =>
  (await select<Artist>(`artists?slug=eq.${encodeURIComponent(slug)}&status=eq.approved&select=${ARTIST_COLS}&limit=1`, REVALIDATE, ["artists", `artist:${slug}`]))[0] ?? null;

export type SceneBoardEvent = {
  id: string; title: string; url: string; ticket_url: string | null; source: string;
  city: string | null; venue: string | null; event_date: string | null; event_time: string | null;
  genres: string[] | null; lineup: string[] | null; kind: "club" | "concert" | "festival"; featured: boolean;
};

/** Published scene events through the scene_events RPC (the table itself is closed to the public). */
export async function getSceneEvents(): Promise<SceneBoardEvent[]> {
  const r = await safeRpc<SceneBoardEvent[]>("scene_events", { p_kind: null }, REVALIDATE);
  return Array.isArray(r) ? r : [];
}

/** Match roster artists named in a scene event's lineup or title. Names under 4 letters are skipped. */
export function matchArtists<T extends { name: string; slug: string }>(e: { title: string; lineup: string[] | null }, artists: T[]): T[] {
  const hay = ` ${[e.title, ...(e.lineup ?? [])].join(" , ")} `.toLowerCase();
  const out: T[] = [];
  for (const a of artists) {
    const n = a.name.trim().toLowerCase();
    if (n.length < 4) continue;
    const re = new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
    if (re.test(hay) && !out.some((x) => x.slug === a.slug)) out.push(a);
  }
  return out.slice(0, 6);
}
