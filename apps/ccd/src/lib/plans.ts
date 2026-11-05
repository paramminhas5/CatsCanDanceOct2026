/**
 * Going, Interested, who's going and crews, for any night.
 * A night key is the event slug for our own nights and "scene:<id>" for a night on What's on.
 * Each call prefers the migration 042 RPCs and falls back to the older ones, so pages keep
 * working before 042 is applied (Interested and scene crews need 042).
 */
import { track } from "@/lib/track";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PlanState = "going" | "interested" | null;
export type Crowd = { going: number; interested: number; names: string[] };
export type MyPlan = { night_key: string; state: "going" | "interested"; show_name: boolean; has_ticket: boolean; title?: string; city?: string | null; venue?: string | null; event_date?: string | null; kind?: "ccd" | "scene" };

export const sceneKey = (id: string) => `scene:${id}`;
export const isScene = (key: string) => key.startsWith("scene:");
const sceneId = (key: string) => key.slice(6);

const PENDING = "ccd:pending-plan";
const missing = (e: any) => !!e && (e.code === "PGRST202" || /could not find the function|does not exist/i.test(e.message ?? ""));

/** Counts and opt-in first names for many nights at once. */
export async function loadCrowd(keys: string[]): Promise<Record<string, Crowd>> {
  const out: Record<string, Crowd> = {};
  if (!keys.length) return out;
  const v2 = await supabase.rpc("night_crowd", { p_keys: keys });
  if (!v2.error && Array.isArray(v2.data)) {
    for (const r of v2.data as any[]) out[r.night_key] = { going: Number(r.going ?? 0), interested: Number(r.interested ?? 0), names: r.names ?? [] };
    return out;
  }
  const [ec, nc] = await Promise.all([
    keys.some(isScene) ? supabase.rpc("event_counts") : Promise.resolve({ data: [] as any[] }),
    keys.some((k) => !isScene(k)) ? supabase.rpc("night_counts") : Promise.resolve({ data: [] as any[] }),
  ]);
  for (const k of keys) {
    const row = isScene(k)
      ? ((ec.data as any[]) ?? []).find((x) => x.event_id === sceneId(k))
      : ((nc.data as any[]) ?? []).find((x) => x.event_slug === k);
    out[k] = { going: Number(row?.going ?? 0), interested: 0, names: [] };
  }
  return out;
}

export async function loadMyPlans(): Promise<MyPlan[]> {
  const v2 = await supabase.rpc("my_plans");
  if (!v2.error && Array.isArray(v2.data)) return v2.data as MyPlan[];
  // Before 042: our nights from my_night_state, What's on nights from my_event_state, titles looked up.
  const [ns, es] = await Promise.all([supabase.rpc("my_night_state"), supabase.rpc("my_event_state")]);
  const ours = ((ns.data as any[]) ?? []).filter((x) => x.going);
  const scene = ((es.data as any[]) ?? []).filter((x) => x.going);
  const [ev, se] = await Promise.all([
    ours.length ? supabase.from("events").select("slug,title,city,venue,event_date").in("slug", ours.map((x) => x.event_slug)) : Promise.resolve({ data: [] as any[] }),
    scene.length ? supabase.from("scraped_events").select("id,title,city,venue,event_date").in("id", scene.map((x) => x.event_id)) : Promise.resolve({ data: [] as any[] }),
  ]);
  const evBy = new Map(((ev.data as any[]) ?? []).map((e) => [e.slug, e]));
  const seBy = new Map(((se.data as any[]) ?? []).map((e) => [e.id, e]));
  return [
    ...ours.map((x) => { const e = evBy.get(x.event_slug); return { night_key: x.event_slug, state: "going" as const, show_name: !!x.show_name, has_ticket: false, kind: "ccd" as const, title: e?.title, city: e?.city, venue: e?.venue, event_date: e?.event_date }; }),
    ...scene.map((x) => { const e = seBy.get(x.event_id); return { night_key: sceneKey(x.event_id), state: "going" as const, show_name: !!x.show_name, has_ticket: false, kind: "scene" as const, title: e?.title, city: e?.city, venue: e?.venue, event_date: e?.event_date }; }),
  ];
}

export async function setPlan(key: string, state: PlanState, showName = false, hasTicket = false): Promise<{ ok: boolean; error?: string; need?: string }> {
  const v2 = await supabase.rpc("set_plan", { p_key: key, p_state: state ?? "", p_show_name: showName, p_has_ticket: hasTicket });
  if (!v2.error && state === "going") track("going", { scene: key.startsWith("scene:") });
  if (!v2.error) return (v2.data as any) ?? { ok: true };
  if (!missing(v2.error)) return { ok: false, error: v2.error.message };
  if (state === "interested") return { ok: false, error: "Interested opens soon. Tap Going for now." };
  const going = state === "going";
  const v1 = isScene(key)
    ? await supabase.rpc("set_going", { p_event_id: sceneId(key), p_going: going, p_show_name: showName })
    : await supabase.rpc("set_night_going", { p_slug: key, p_going: going, p_show_name: showName });
  if (v1.error) return { ok: false, error: v1.error.message };
  return (v1.data as any) ?? { ok: true };
}

export async function joinCrew(key: string): Promise<{ ok: boolean; error?: string; need?: string }> {
  const v2 = await supabase.rpc("join_crew_pool_any", { p_key: key });
  if (!v2.error && (v2.data as any)?.ok) track("join_crew");
  if (!v2.error) return v2.data as any;
  if (!missing(v2.error)) return { ok: false, error: v2.error.message };
  if (isScene(key)) return { ok: false, error: "Crews for this night open soon. You are on the going list." };
  const v1 = await supabase.rpc("join_crew_pool", { p_slug: key });
  return v1.error ? { ok: false, error: v1.error.message } : (v1.data as any);
}

export async function leaveCrew(key: string) {
  await supabase.rpc("leave_crew_pool", { p_key: key });
}

export type Mate = { id: string; first_name: string; tags: string[]; captain: boolean; you: boolean; ticket: "verified" | "pending" | "rejected" | "missing"; in: boolean };
export type CrewCard = {
  placed: boolean;
  status?: { state: "not_joined" | "waiting" | "placed" | "other_city"; waiting?: number; need?: number; event_city?: string; your_city?: string };
  night?: { title: string; city: string | null; venue: string | null; event_date: string | null; kind: "ccd" | "scene" };
  crew?: { name: string; pre_spot: string | null; meet_point: string | null; meet_time: string | null; whatsapp_link: string | null; lost_point: string | null; you_are_captain: boolean };
  mates?: Mate[];
};

export async function loadCrewCard(key: string): Promise<CrewCard> {
  const v2 = await supabase.rpc("my_crew_card", { p_key: key });
  if (!v2.error && v2.data) return v2.data as CrewCard;
  const st = await supabase.rpc("my_crew_status", { p_slug: key });
  const status = (st.data as any) ?? { state: "not_joined" };
  if (status.state !== "placed") return { placed: false, status };
  const [c, mm] = await Promise.all([supabase.rpc("my_crew", { p_slug: key }), supabase.rpc("my_crew_mates", { p_slug: key })]);
  const rows = (c.data as any[]) ?? [];
  return {
    placed: true, status,
    crew: { name: rows[0]?.crew_name ?? "Your crew", pre_spot: rows[0]?.pre_spot ?? null, meet_point: null, meet_time: null, whatsapp_link: null, lost_point: null, you_are_captain: false },
    mates: ((mm.data as any[]) ?? []).map((m) => ({ id: m.mate_id, first_name: String(m.mate).split(" ")[0], tags: [], captain: false, you: false, ticket: "missing", in: false })),
  };
}

/** Remember what someone tapped before signing in, and apply it once they are a member. */
export function rememberPending(key: string, state: PlanState, title?: string) {
  try { localStorage.setItem(PENDING, JSON.stringify({ key, state, title, at: Date.now() })); } catch {}
}
export async function applyPending(): Promise<string | null> {
  let p: any = null;
  try { p = JSON.parse(localStorage.getItem(PENDING) ?? "null"); } catch {}
  if (!p?.key || Date.now() - Number(p.at ?? 0) > 1000 * 60 * 60 * 24 * 3) return null;
  const r = await setPlan(p.key, p.state ?? "going");
  if (r.ok || r.need !== "join") { try { localStorage.removeItem(PENDING); } catch {} }
  return r.ok ? p.key : null;
}

export async function sendSignInLink(email: string, next: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}${next}` } });
  return error ? { ok: false, error: "Could not send the link. Try again in a minute." } : { ok: true };
}

/** Session, member and my plans, shared by every Going button on a page. */
type Me = { ready: boolean; signedIn: boolean; isMember: boolean; plans: Record<string, MyPlan> };
let cache: Me | null = null;
let inflight: Promise<Me> | null = null;
const listeners = new Set<(m: Me) => void>();

async function fetchMe(): Promise<Me> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { ready: true, signedIn: false, isMember: false, plans: {} };
  const m = await supabase.from("members").select("id").eq("id", data.session.user.id).maybeSingle();
  const isMember = !!m.data;
  if (isMember) await applyPending();
  const plans = isMember ? await loadMyPlans() : [];
  return { ready: true, signedIn: true, isMember, plans: Object.fromEntries(plans.map((p) => [p.night_key, p])) };
}

export async function refreshMe() {
  inflight = fetchMe();
  cache = await inflight;
  inflight = null;
  listeners.forEach((l) => l(cache!));
  return cache;
}

export function useMe() {
  const [me, setMe] = useState<Me>(cache ?? { ready: false, signedIn: false, isMember: false, plans: {} });
  useEffect(() => {
    listeners.add(setMe);
    if (!cache && !inflight) refreshMe(); else if (cache) setMe(cache);
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") refreshMe(); });
    return () => { listeners.delete(setMe); sub.subscription.unsubscribe(); };
  }, []);
  const reload = useCallback(() => refreshMe(), []);
  return { ...me, reload };
}

/** "Asha, Rohan and 10 others are going" */
export function crowdLine(c: Crowd | undefined, mine: PlanState = null): string {
  if (!c) return "";
  const going = c.going;
  if (going === 0 && c.interested === 0) return "";
  const names = c.names.slice(0, 2);
  const rest = going - names.length;
  let s = "";
  if (names.length) s = `${names.join(", ")}${rest > 0 ? ` and ${rest} other${rest > 1 ? "s" : ""}` : ""} going`;
  else if (going > 0) s = `${going} going`;
  if (mine === "going" && going > 0 && !names.length) s = going === 1 ? "You're going" : `You and ${going - 1} other${going - 1 > 1 ? "s" : ""} going`;
  if (c.interested > 0) s += `${s ? " · " : ""}${c.interested} interested`;
  return s;
}
