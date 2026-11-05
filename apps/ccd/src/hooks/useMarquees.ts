/**
 * useMarquees — returns marquee items for a given slot.
 * Previously fetched from site_settings. Now returns static defaults.
 * Can be wired to Supabase/admin later.
 */

export type MarqueeSlotId = "above-about" | "above-events" | "above-videos" | "above-playlist" | "above-drops" | string;

const DEFAULT_MARQUEES: Record<string, string[] | null> = {
  "above-about": null, // null = don't show
  "above-events": null,
  "above-videos": null,
  "above-playlist": null,
  "above-drops": null,
};

export function useMarquees(slotId: MarqueeSlotId): string[] | null {
  return DEFAULT_MARQUEES[slotId] ?? null;
}
