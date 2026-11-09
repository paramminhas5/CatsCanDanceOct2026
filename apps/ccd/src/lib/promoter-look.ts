/**
 * The look of a promoter night on the Cats Can Dance site.
 * Promoters run their nights from Gate (apps/gate). Their public pages (/promoters/<slug>) and their
 * nights (/nights/<slug>) still render here, in their accent from the CCD palette (migration 056).
 */

export type Accent = "blue" | "red" | "acid" | "pink" | "orange" | "lime" | "cream";

/** Tailwind classes per accent: the block colour, the text that reads on it, and a matching border. ("pink" is allowed in the database but the brand has no pink, so it shows as red.) */
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

/** Public night URL. Promoter nights live next to CCD's own under /nights. */
export const nightPath = (slug: string) => `/nights/${slug}`;
export const promoterPath = (slug: string) => `/promoters/${slug}`;
