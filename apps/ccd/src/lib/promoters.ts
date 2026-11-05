/**
 * Promoters on CCD (Param, 5 Nov 2026; migration 056).
 * Anyone can apply; CCD approves. An approved promoter makes nights that CCD approves before they go public.
 * A promoter night is an `events` row with promoter_id set, so tickets (free for now), going, crews and the door work on it.
 * Promoters get their own look inside the CCD site: one accent from the CCD palette, a logo and a cover image.
 */
import { memberRpc } from "@/lib/member";

export type Accent = "blue" | "red" | "acid" | "pink" | "orange" | "lime" | "cream";
/** The colours a promoter can pick. All from the CCD palette. ("pink" is allowed in the database but the brand has no pink, so it shows as red.) */
export const ACCENTS: Accent[] = ["blue", "red", "acid", "orange", "lime", "cream"];

/** Tailwind classes per accent: the block colour, the text that reads on it, and a matching border. */
export const ACCENT: Record<Accent, { bg: string; on: string; text: string; border: string; label: string }> = {
  blue: { bg: "bg-electric-blue", on: "text-cream", text: "text-electric-blue", border: "border-electric-blue", label: "Blue" },
  red: { bg: "bg-magenta", on: "text-cream", text: "text-magenta", border: "border-magenta", label: "Red" },
  acid: { bg: "bg-acid-yellow", on: "text-ink", text: "text-ink", border: "border-acid-yellow", label: "Acid" },
  pink: { bg: "bg-magenta", on: "text-cream", text: "text-magenta", border: "border-magenta", label: "Red" },
  orange: { bg: "bg-orange", on: "text-ink", text: "text-orange", border: "border-orange", label: "Orange" },
  lime: { bg: "bg-lime", on: "text-ink", text: "text-ink", border: "border-lime", label: "Lime" },
  cream: { bg: "bg-cream", on: "text-ink", text: "text-ink", border: "border-ink", label: "Cream" },
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

export async function myPromoters() {
  const r = await memberRpc<{ promoters: MyPromoter[] }>("my_promoters");
  return r.ok ? ((r.data as any).promoters as MyPromoter[]) : [];
}
export const apply = (f: { name: string; city: string; instagram: string; website: string; blurb: string; genres: string[] }) =>
  memberRpc<{ slug: string }>("promoter_apply", { p_name: f.name, p_city: f.city, p_instagram: f.instagram || null, p_website: f.website || null, p_blurb: f.blurb || null, p_genres: f.genres });
export async function getDashboard(slug: string) {
  const r = await memberRpc<Dashboard>("promoter_get", { p_slug: slug });
  return r.ok ? { ok: true as const, data: r.data as Dashboard } : { ok: false as const, error: r.error };
}
export const saveBrand = (slug: string, data: Partial<Promoter> & { genres?: string[] }) => memberRpc("promoter_save", { p_slug: slug, p_data: data });
export const setTeam = (slug: string, email: string, role: "owner" | "admin", remove = false) =>
  memberRpc("promoter_team_set", { p_slug: slug, p_email: email, p_role: role, p_remove: remove });
export const saveNight = (promoter: string, night: string | null, data: Record<string, unknown>) =>
  memberRpc<{ slug: string; published: boolean }>("promoter_night_save", { p_slug: promoter, p_night: night, p_data: data });
export const nightStatus = (night: string, action: "submit" | "withdraw") => memberRpc("promoter_night_status", { p_night: night, p_action: action });

/** Where a night stands, in one line a promoter understands. */
export function stateOf(n: Pick<PNight, "published" | "review_status" | "review_note">): { label: string; tone: string; next: string } {
  if (n.published) return { label: "Live", tone: "bg-acid-yellow text-ink", next: "It is on CCD. Edits go live straight away." };
  if (n.review_status === "pending") return { label: "With CCD", tone: "bg-electric-blue text-cream", next: "We check every night before it goes up, usually within a day." };
  if (n.review_status === "rejected") return { label: "Not approved", tone: "bg-magenta text-cream", next: n.review_note ? `CCD said: ${n.review_note}` : "Change it and send it again." };
  return { label: "Draft", tone: "bg-cream text-ink", next: "Only your team can see it. Send it to CCD when it is ready." };
}

/** Public night URL. Promoter nights live next to CCD's own under /nights. */
export const nightPath = (slug: string) => `/nights/${slug}`;
export const promoterPath = (slug: string) => `/promoters/${slug}`;
