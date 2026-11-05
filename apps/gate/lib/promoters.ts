/**
 * Promoters (Param, 5 Nov 2026; migration 056). Ported from apps/ccd/src/lib/promoters.ts; RPC names unchanged.
 * Anyone can apply; CCD approves. An approved promoter makes nights that CCD approves before they go public.
 * A promoter night is an `events` row with promoter_id set, so tickets (free for now), going, crews and the door work on it.
 * The night itself renders on the CCD site at /nights/<slug> in the promoter's look; Gate owns the dashboard.
 */
import { productUrl } from "@ccd/brand";
import { memberRpc } from "@/lib/member";

export type Accent = "blue" | "red" | "acid" | "pink" | "orange" | "lime" | "cream";
/** The colours a promoter can pick, all from the CCD palette ("pink" is allowed in the database but shows as red). */
export const ACCENTS: Accent[] = ["blue", "red", "acid", "orange", "lime", "cream"];

/** Hex per accent so Gate's dark UI can show a promoter's colour as a swatch and a preview of their CCD page. */
export const ACCENT: Record<Accent, { hex: string; on: string; label: string }> = {
  blue: { hex: "#2563eb", on: "#fffdf5", label: "Blue" },
  red: { hex: "#dc2626", on: "#fffdf5", label: "Red" },
  acid: { hex: "#b6ef36", on: "#050a14", label: "Acid" },
  pink: { hex: "#dc2626", on: "#fffdf5", label: "Red" },
  orange: { hex: "#f97316", on: "#050a14", label: "Orange" },
  lime: { hex: "#86efac", on: "#050a14", label: "Lime" },
  cream: { hex: "#e8e6e3", on: "#050a14", label: "Cream" },
};
export const accentOf = (a?: string | null) => ACCENT[((a && a in ACCENT) ? a : "blue") as Accent];

export type Promoter = {
  id: string; slug: string; name: string; status: "pending" | "approved" | "hidden"; city: string | null; genres: string[];
  blurb: string | null; tagline: string | null; instagram: string | null; website: string | null;
  accent: Accent; logo_url: string | null; cover_url: string | null; review_note: string | null;
};
export type Tier = { name: string; capacity: number | null; max_per_order: number | null };
export type PNight = {
  slug: string; title: string; event_date: string | null; start_time: string | null; venue: string | null; city: string | null; capacity: number | null;
  blurb: string | null; lineup: string[]; genres: string[]; poster_url: string | null; ticket_url: string | null; rsvp_open: boolean | null;
  published: boolean | null; review_status: "draft" | "pending" | "approved" | "rejected" | null; review_note: string | null;
  tiers: Tier[]; tickets: number; rsvps: number; going: number; inside: number;
};
export type Dashboard = { role: "owner" | "admin" | "staff"; promoter: Promoter; team: { email: string; role: "owner" | "admin" }[]; nights: PNight[] };
export type MyPromoter = { slug: string; name: string; status: string; city: string | null; accent: Accent; role: string; nights: number };

export async function myPromoters(): Promise<MyPromoter[]> {
  const r = await memberRpc<{ promoters: MyPromoter[] }>("my_promoters");
  return r.ok ? (r.data?.promoters ?? []) : [];
}
export const apply = (f: { name: string; city: string; instagram: string; website: string; blurb: string; genres: string[] }) =>
  memberRpc<{ slug: string }>("promoter_apply", { p_name: f.name, p_city: f.city, p_instagram: f.instagram || null, p_website: f.website || null, p_blurb: f.blurb || null, p_genres: f.genres });
export async function getDashboard(slug: string) {
  const r = await memberRpc<Dashboard>("promoter_get", { p_slug: slug });
  return r.ok && r.data ? { ok: true as const, data: r.data } : { ok: false as const, error: r.error ?? "Could not load." };
}
export const saveBrand = (slug: string, data: Partial<Promoter> & { genres?: string[] }) => memberRpc("promoter_save", { p_slug: slug, p_data: data });
export const setTeam = (slug: string, email: string, role: "owner" | "admin", remove = false) =>
  memberRpc("promoter_team_set", { p_slug: slug, p_email: email, p_role: role, p_remove: remove });
export const saveNight = (promoter: string, night: string | null, data: Record<string, unknown>) =>
  memberRpc<{ slug: string; published: boolean }>("promoter_night_save", { p_slug: promoter, p_night: night, p_data: data });
export const nightStatus = (night: string, action: "submit" | "withdraw") => memberRpc("promoter_night_status", { p_night: night, p_action: action });

/** Where a night stands, in one line a promoter understands. `tone` is a Gate status class. */
export function stateOf(n: Pick<PNight, "published" | "review_status" | "review_note">): { label: string; tone: "in" | "out" | "no" | "idle"; next: string } {
  if (n.published) return { label: "Live", tone: "in", next: "It is on Cats Can Dance. Edits go live straight away." };
  if (n.review_status === "pending") return { label: "With CCD", tone: "out", next: "Every night is checked before it goes up, usually within a day." };
  if (n.review_status === "rejected") return { label: "Not approved", tone: "no", next: n.review_note ? `CCD said: ${n.review_note}` : "Change it and send it again." };
  return { label: "Draft", tone: "idle", next: "Only your team can see it. Send it to CCD when it is ready." };
}

/** Public night URL: nights render on the CCD site. */
export const nightUrl = (slug: string) => `${productUrl("ccd")}/nights/${slug}`;
/** Public promoter page: served here and readable on the CCD site too. */
export const promoterPath = (slug: string) => `/promoters/${slug}`;
