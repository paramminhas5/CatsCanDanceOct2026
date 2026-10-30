/**
 * Per-event editorial content + static fallback rows.
 *
 * Two halves:
 *
 * CCD × SOCIAL — Season 1 show structure:
 *   Show 01 · 28 Jun 2026 → BANGALORE   (broad, welcoming, first impression)
 *   Show 02 · Jul 2026    → BOMBAY      (style, midsummer energy)
 *   Show 03 · Aug 2026    → HYDERABAD   (the third chapter)
 *   Show 04 · Oct 2026    → DELHI       (fourth and largest show)
 *
 * Past episodes:
 *   CCD AT BAR WILD · 2 Apr 2025 → Bar Wild, Indiranagar
 */

import type {
  EventContent,
  EventRow,
  EventViewModel,
  VibePillar,
} from "@/types/events";

// ──────────────────── Defaults by event_type ────────────────────

const DEFAULT_VIBE_PILLARS_STANDARD: VibePillar[] = [
  { icon: "🎧", label: "MUSIC",     desc: "Underground house, disco, garage, jungle, and D&B — curated, never random." },
  { icon: "🪩", label: "FLOOR",     desc: "Intimate room, real sound, no dress code beyond move." },
  { icon: "🐾", label: "COMMUNITY", desc: "RSVP-only. Capacity controlled. The pack moves together." },
];

const DEFAULT_VIBE_PILLARS_CCDXSOCIAL: VibePillar[] = [
  { icon: "🎧", label: "MUSIC",   desc: "Underground selectors from each city — open decks, residents, and guests carrying the floor." },
  { icon: "🪩", label: "FLOOR",   desc: "Outdoor afternoon into the evening. Easy format, no dress code, real sound." },
  { icon: "🐾", label: "PETS",    desc: "Dogs and cats welcome. Pet-friendly all afternoon." },
];

// ──────────────────── Static fallback rows ────────────────────
// Mirrors public/ccdxsocial-seed.sql — used by EventDetail when the DB row
// for a slug isn't available yet (env var missing, seed not run, etc.).

export const EVENT_ROWS: Record<string, EventRow> = {
  "episode-1": {
    slug: "episode-1", title: "EPISODE 1", date: "Wed, Apr 2, 2025", city: "Bengaluru", venue: "Bar Wild",
    blurb: "Where it started. A Wednesday at Bar Wild in Indiranagar. House, disco and garage, and a floor that stayed full until close.",
    lineup: ["Sartdawg", "Merman"], status: "past", poster_url: null, sort_order: 1,
    series: null, series_label: null, event_type: "standard", pet_friendly: false, series_tagline: null, is_finale: false,
  },
  "ccdxsocial-01": {
    slug: "ccdxsocial-01", title: "EPISODE 2", date: "Sun, Jun 28, 2026", city: "Bengaluru", venue: "Indiranagar Social",
    blurb: "The first daytime Episode. Outdoor pet zone from 4 PM, dance floor from 8.",
    lineup: ["Agent Bugs", "Groovier", "Sartdawg", "Shantam"], status: "past", poster_url: "/posters/ep02.jpg", sort_order: 2,
    series: null, series_label: null, event_type: "standard", pet_friendly: true, series_tagline: null, is_finale: false,
  },
  "episode-3": {
    slug: "episode-3", title: "EPISODE 3", date: "Sun, Aug 16, 2026", city: "Bengaluru", venue: "Indiranagar Social",
    blurb: "Breakbeat, UKG, house and bass. Pets outdoors, music indoors, merch and activities.",
    lineup: [], status: "past", poster_url: "/posters/ep03.jpg", sort_order: 3,
    series: null, series_label: null, event_type: "standard", pet_friendly: true, series_tagline: null, is_finale: false,
  },
  "episode-4": {
    slug: "episode-4", title: "EPISODE 4", date: "Sat, Sep 26, 2026", city: "Bengaluru", venue: "Bar Wild",
    blurb: "Back to Bar Wild. 7 PM till late.",
    lineup: ["Bombie", "Dwell", "Sartdawg", "Merman"], status: "past", poster_url: "/posters/ep04.jpg", sort_order: 4,
    series: null, series_label: null, event_type: "standard", pet_friendly: false, series_tagline: null, is_finale: false,
  },
};

export function getStaticEventRow(slug: string): EventRow | null {
  return EVENT_ROWS[slug] ?? null;
}

/** All static rows that share a series — for the SeriesStrip fallback. */
export function getStaticEventsBySeries(series: string): EventRow[] {
  return Object.values(EVENT_ROWS)
    .filter((e) => e.series === series)
    .sort((a, b) => a.sort_order - b.sort_order);
}

// ──────────────────── Per-slug rich content ────────────────────

export const EVENT_CONTENT: Record<string, EventContent> = {
  "episode-1": {
    narrative: "The first Cats Can Dance Episode, at Bar Wild in Indiranagar. House, disco and garage from open to close.",
    vibe_pillars: DEFAULT_VIBE_PILLARS_STANDARD,
    venue_address: "Bar Wild, 1st Cross, Stage 2, Indiranagar, Bengaluru 560038",
    venue_map_url: "https://maps.app.goo.gl/kE9Nar1e54tEhCyd6",
    price_text: "Free, RSVP only",
  },
  "ccdxsocial-01": {
    narrative: "The first daytime Episode, on the ground floor of Indiranagar Social. Doors at 4 PM with an outdoor pet zone, then the floor opens up into the night.",
    vibe_pillars: [
      { icon: "🎧", label: "MUSIC", desc: "Open decks, then Agent Bugs, Groovier, Sartdawg and Shantam through to close." },
      { icon: "🪩", label: "FLOOR", desc: "Ground floor at Indiranagar Social. No dress code." },
      { icon: "🐾", label: "PETS", desc: "Dogs and cats welcome all afternoon." },
    ],
    doors_time: "4 PM",
    price_text: "Free, RSVP only",
  },
  "episode-3": {
    narrative: "Back at Indiranagar Social. Breakbeat, UKG, house and bass, pets outdoors, music indoors, with merch and activities.",
    vibe_pillars: DEFAULT_VIBE_PILLARS_STANDARD,
    doors_time: "4 PM",
    price_text: "Free, RSVP only",
  },
  "episode-4": {
    narrative: "Back to where it began. Bar Wild, 7 PM till late, with Bombie, Dwell, Sartdawg and Merman.",
    vibe_pillars: DEFAULT_VIBE_PILLARS_STANDARD,
    venue_address: "Bar Wild, 1st Cross, Stage 2, Indiranagar, Bengaluru 560038",
    venue_map_url: "https://maps.app.goo.gl/kE9Nar1e54tEhCyd6",
    doors_time: "7 PM",
    price_text: "Free, RSVP only",
  },
};

// ──────────────────── Resolution helpers ────────────────────

/**
 * Pick sensible default vibe pillars based on event_type / series.
 */
function defaultsFor(row: Pick<EventRow, "event_type" | "series">): EventContent {
  const type = row.event_type ?? row.series ?? "standard";
  return {
    vibe_pillars:
      type === "ccdxsocial"
        ? DEFAULT_VIBE_PILLARS_CCDXSOCIAL
        : DEFAULT_VIBE_PILLARS_STANDARD,
    price_text: "FREE — RSVP only",
  };
}

/** Merge per-slug content with sensible defaults. Always returns a value. */
export function getEventContent(row: EventRow): EventContent {
  const explicit = EVENT_CONTENT[row.slug] ?? {};
  const fallback = defaultsFor(row);
  return { ...fallback, ...explicit };
}

/** Convenience: build the merged ViewModel for a row. */
export function toViewModel(row: EventRow): EventViewModel {
  return { ...row, content: getEventContent(row) };
}
