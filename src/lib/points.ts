/**
 * CCD points (migration 071). Points come from nights the door can prove: CCD tickets and RSVPs that
 * were checked in, and any outside ticket scanned at a Gate door. Friends who come through your
 * invite, crew mates who show up and rating a night you were at add more. Spend them on a
 * guaranteed spot, a +1 or a free ticket.
 */
import { supabase } from "@/lib/supabase";
import { memberRpc } from "@/lib/member";

export type Activity = { at: string | null; kind: "night" | "referral" | "crew" | "rating" | "spend" | "adjustment"; label: string; ref: string | null; points: number; status: "confirmed" | "pending" };

export type MyPoints = {
  balance: number; pending: number; earned: number; nights_12m: number;
  tier: "stray" | "regular" | "resident"; tier_title: string; tier_perks: string;
  next_tier: string | null; next_tier_title: string | null; nights_to_next: number | null;
  ref_code: string; friends_joined: number; friends_came: number; activity: Activity[];
};

export type Perk = { id: string; title: string; description: string; cost: number; kind: "guaranteed_spot" | "plus_one" | "free_ticket"; min_tier: string; left: number | null; affordable: boolean; tier_ok: boolean };
export type PointsNight = { slug: string; title: string; event_date: string; venue: string | null; full: boolean; paid: boolean };
export type Rule = { key: string; points: number; note: string };
export type Tier = { key: string; title: string; min_nights: number; perks: string; sort: number };

const INVITE_KEY = "ccd:invite";
const MYCODE_KEY = "ccd:mycode";

export async function loadMyPoints(): Promise<MyPoints | null> {
  const r = await memberRpc<MyPoints>("my_points");
  if (!r.ok || !r.data) return null;
  try { localStorage.setItem(MYCODE_KEY, r.data.ref_code); } catch {}
  return r.data;
}

export async function loadPerks(slug?: string | null): Promise<Perk[]> {
  const { data } = await supabase.rpc("points_perks_for", { p_slug: slug ?? null });
  return (data as Perk[]) ?? [];
}

export async function loadPointsNights(): Promise<PointsNight[]> {
  const { data } = await supabase.rpc("points_nights");
  return (data as PointsNight[]) ?? [];
}

export async function loadRules(): Promise<{ rules: Rule[]; tiers: Tier[] }> {
  const [r, t] = await Promise.all([
    supabase.from("points_rules").select("key,points,note"),
    supabase.from("points_tiers").select("key,title,min_nights,perks,sort").order("sort"),
  ]);
  return { rules: (r.data as Rule[]) ?? [], tiers: (t.data as Tier[]) ?? [] };
}

export async function redeem(perk: string, slug: string): Promise<{ ok: boolean; error?: string; result?: { code?: string; worth_inr?: number; plus_ones?: number; on_list?: boolean }; balance?: number }> {
  const { data, error } = await supabase.rpc("redeem_perk", { p_perk: perk, p_slug: slug });
  if (error) return { ok: false, error: "Could not reach the box office. Try again." };
  return data as any;
}

/** Remember an invite code from ?i=<code> until the visitor has joined. */
export function captureInvite() {
  if (typeof window === "undefined") return;
  try {
    const code = new URLSearchParams(window.location.search).get("i");
    if (code && /^[a-z0-9]{6,12}$/i.test(code) && code.toLowerCase() !== localStorage.getItem(MYCODE_KEY)) {
      localStorage.setItem(INVITE_KEY, code.toLowerCase());
    }
  } catch {}
}

/** After joining: attach the saved invite to this member once. Returns the inviter's first name if it worked. */
export async function claimPendingInvite(): Promise<string | null> {
  let code: string | null = null;
  try { code = localStorage.getItem(INVITE_KEY); } catch {}
  if (!code) return null;
  const r = await memberRpc<{ inviter?: string }>("claim_referral", { p_code: code });
  // Keep the code if they haven't finished joining yet; drop it once the server has decided.
  if (r.error === "Join first.") return null;
  try { localStorage.removeItem(INVITE_KEY); } catch {}
  return r.ok && r.data?.inviter ? String(r.data.inviter) : null;
}

/** The signed-in member's invite code, if we've seen it on this device. Used by share links. */
export function myInviteCode(): string | null {
  try { return localStorage.getItem(MYCODE_KEY); } catch { return null; }
}

export const inviteLink = (code: string) =>
  `${typeof window !== "undefined" ? window.location.origin : "https://catscandance.com"}/points?i=${encodeURIComponent(code)}`;

export const tierColour = (t: string) => (t === "resident" ? "bg-magenta text-cream" : t === "regular" ? "bg-electric-blue text-cream" : "bg-acid-yellow text-ink");
