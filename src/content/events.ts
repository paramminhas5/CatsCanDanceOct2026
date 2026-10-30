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
  // ─── Past episodes ───────────────────────────────────────────────────────
  "episode-1": {
    slug: "episode-1",
    title: "CCD AT BAR WILD",
    date: "Wed, Apr 2, 2025",
    city: "Bangalore",
    venue: "Bar Wild",
    blurb:
      "The first Cats Can Dance episode. Bar Wild, Indiranagar. The room that started it — house, disco, garage, and the kind of floor that makes you forget what time it is. Startdawg and Merman held it down from open to close.",
    lineup: ["Startdawg", "Merman"],
    status: "past",
    poster_url: null,
    sort_order: 0,
    series: null,
    series_label: null,
    event_type: "standard",
    pet_friendly: false,
    series_tagline: null,
    is_finale: false,
  },

  "ccdxsocial-01": {
    slug: "ccdxsocial-01",
    title: "BANGALORE",
    date: "Sun, Jun 28, 2026",
    city: "Bangalore",
    venue: "Indiranagar Social",
    blurb:
      "Taking over the ground floor at Indiranagar Social from 4 PM — dogs and cats welcome, good people, the kind of day you don't plan around. Open deck winners kick things off, then Agent Bugs, Groovier, Sartdawg, and Shantam carry it all the way through to close. RSVP only.",
    lineup: ["Open Deck Winners", "Agent Bugs", "Groovier", "Sartdawg", "Shantam"],
    status: "upcoming",
    poster_url: "/posters/ccdxsocial-blr.jpg",
    sort_order: 1,
    series: "ccdxsocial",
    series_label: "CCD × SOCIAL",
    event_type: "ccdxsocial",
    pet_friendly: true,
    series_tagline: "BROAD · WELCOMING · FIRST IMPRESSION",
    is_finale: false,
  },

  "ccdxsocial-02": {
    slug: "ccdxsocial-02",
    title: "BOMBAY",
    date: "July 2026",
    city: "Bombay",
    venue: "Social, Bombay (TBC)",
    blurb:
      "The second chapter. Bombay brings its own energy. Dogs and cats welcome, vendor market, an easy afternoon before the floor opens up for the night.",
    lineup: ["TBA"],
    status: "upcoming",
    poster_url: null,
    sort_order: 2,
    series: "ccdxsocial",
    series_label: "CCD × SOCIAL",
    event_type: "ccdxsocial",
    pet_friendly: true,
    series_tagline: "BOMBAY · CCD × SOCIAL",
    is_finale: false,
  },

  "ccdxsocial-03": {
    slug: "ccdxsocial-03",
    title: "HYDERABAD",
    date: "August 2026",
    city: "Hyderabad",
    venue: "Social, Hyderabad (TBC)",
    blurb:
      "The third chapter. Hyderabad's turn. Same easy format — outdoor afternoon, pets welcome, the floor opens after dark.",
    lineup: ["TBA"],
    status: "upcoming",
    poster_url: null,
    sort_order: 3,
    series: "ccdxsocial",
    series_label: "CCD × SOCIAL",
    event_type: "ccdxsocial",
    pet_friendly: true,
    series_tagline: "HYDERABAD · CCD × SOCIAL",
    is_finale: false,
  },

  "ccdxsocial-mega": {
    slug: "ccdxsocial-mega",
    title: "DELHI",
    date: "October 2026",
    city: "Delhi",
    venue: "Venue TBA",
    blurb:
      "The fourth show and the biggest one yet. Delhi, large format. Dogs and cats welcome. Full lineup TBA.",
    lineup: ["TBA"],
    status: "upcoming",
    poster_url: "/posters/ccdxsocial-del.jpg",
    sort_order: 4,
    series: "ccdxsocial",
    series_label: "CCD × SOCIAL",
    event_type: "ccdxsocial",
    pet_friendly: true,
    series_tagline: "DELHI · CCD × SOCIAL",
    is_finale: false,
  },
};

/** Static fallback lookup — used by EventDetail when Supabase is empty. */
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

  // ─── Past Episodes ───────────────────────────────────────────────

  "episode-1": {
    narrative:
      "The first Cats Can Dance episode. Bar Wild, Indiranagar. The room that started it — house, disco, garage, and the kind of floor that makes you forget what time it is. Startdawg and Merman held it down from open to close.",
    vibe_pillars: DEFAULT_VIBE_PILLARS_STANDARD,
    venue_address: "Bar Wild, 1st Cross, Stage 2, Indiranagar, Bengaluru 560038",
    venue_map_url: "https://maps.app.goo.gl/kE9Nar1e54tEhCyd6",
    price_text: "FREE — RSVP only",
  },

  // ─── CCD × SOCIAL — Show 01: CCDXSOCIAL 01 ───────────────────────

  "ccdxsocial-01": {
    cta_label: "RSVP →",

    narrative:
      "We're taking over the ground floor at Indiranagar Social on Sunday, June 28. Doors open at 4 PM — bring your dog, grab a drink, and ease into it. Open deck winners kick things off at 4:30, then Agent Bugs, Groovier, Sartdawg, and Shantam carries it all the way to close. Just RSVP so we have your name at the door.",

    vibe_pillars: [
      { icon: "🎧", label: "MUSIC",  desc: "Open decks at 4:30, then Agent Bugs, Groovier, Sartdawg, and Shantam carrying the night through to close." },
      { icon: "🪩", label: "FLOOR",  desc: "Ground floor at Indiranagar Social. No dress code — just show up." },
      { icon: "🐾", label: "PETS",   desc: "Dogs and cats welcome all afternoon. Come with the pack." },
    ],

    doors_time: "4 PM",
    peak_time:  "9 PM — close",

    schedule: [
      { time: "4:00 PM",  what: "Gates open · outdoor floor" },
      { time: "4:30 PM",  what: "Open deck winners", highlight: true },
      { time: "6:00 PM",  what: "Agent Bugs", highlight: true },
      { time: "7:30 PM",  what: "Groovier", highlight: true },
      { time: "9:00 PM",  what: "Sartdawg", highlight: true },
      { time: "10:30 PM", what: "Shantam — to close", highlight: true },
    ],

    artist_details: {
      "Open Deck Winners": {
        name: "Open Deck Winners",
        role: "Open Decks",
        set_time: "4:30 PM – 6:00 PM",
        blurb: "Selected from the open deck submission. First up, setting the tone.",
      },
      "Agent Bugs": {
        name: "Agent Bugs",
        role: "DJ",
        set_time: "6:00 PM – 7:30 PM",
        blurb: "",
      },
      "Groovier": {
        name: "Groovier",
        role: "DJ",
        set_time: "7:30 PM – 9:00 PM",
        blurb: "",
      },
      "Sartdawg": {
        name: "Sartdawg",
        role: "DJ",
        set_time: "9:00 PM – 10:30 PM",
        blurb: "",
      },
      "Shantam": {
        name: "Shantam",
        role: "DJ",
        set_time: "10:30 PM – close",
        blurb: "Closing the night.",
      },
    },

    venue_address:    "Indiranagar Social, 100 Feet Rd, Indiranagar, Bengaluru 560038",
    venue_map_url:    "https://maps.app.goo.gl/kE9Nar1e54tEhCyd6",
    venue_geo:        { lat: 12.9707654, lng: 77.6476266 },
    venue_embed_url:  "https://www.google.com/maps?q=Indiranagar+Social+Bengaluru&output=embed",
    capacity:         250,
    dress_code:       "Wear what dances.",
    price_text:       "FREE — RSVP only",

    partners: [
      { name: "Social", role: "Series Partner", href: "/ccdxsocial" },
    ],

    marquee_items: [
      "BANGALORE · 28 JUN",
      "INDIRANAGAR SOCIAL",
      "AGENT BUGS · GROOVIER · SARTDAWG · SHANTAM",
      "DOORS 4 PM",
      "RSVP ONLY",
    ],
  },

  // ─── CCD × SOCIAL — Show 02: CCDXSOCIAL 02 ───────────────────────

  "ccdxsocial-02": {
    cta_label: "RSVP →",
    narrative:
      "The second chapter. Bombay. Same easy format — outdoor afternoon, vendor market, pets welcome all day, the floor opens after dark. Lineup to be announced.",
    vibe_pillars: DEFAULT_VIBE_PILLARS_CCDXSOCIAL,
    doors_time: "4 PM",
    peak_time:  "Late",
    price_text: "FREE — RSVP only",
    partners: [{ name: "Social", role: "Series Partner", href: "/ccdxsocial" }],
    marquee_items: ["BOMBAY · JULY 2026", "CCD × SOCIAL 02", "LINEUP TBA", "FREE ENTRY"],
  },

  "ccdxsocial-03": {
    cta_label: "RSVP →",
    narrative:
      "The third chapter. Hyderabad. Outdoor afternoon, pets welcome, the underground takes the late slot. Lineup to be announced.",
    vibe_pillars: DEFAULT_VIBE_PILLARS_CCDXSOCIAL,
    doors_time: "4 PM",
    peak_time:  "Late",
    price_text: "FREE — RSVP only",
    partners: [{ name: "Social", role: "Series Partner", href: "/ccdxsocial" }],
    marquee_items: ["HYDERABAD · AUGUST 2026", "CCD × SOCIAL 03", "LINEUP TBA", "FREE ENTRY"],
  },

  "ccdxsocial-mega": {
    cta_label: "RSVP →",
    narrative:
      "The fourth and largest show. Delhi, large format. Outdoor floor, full lineup TBA, pets welcome. Details to follow.",
    vibe_pillars: [
      { icon: "🎧", label: "MUSIC",  desc: "Full lineup to be announced. The biggest bill of the series." },
      { icon: "🪩", label: "FLOOR",  desc: "Large format outdoor stage. Delhi." },
      { icon: "🐾", label: "PETS",   desc: "Dogs and cats welcome." },
    ],
    doors_time: "TBA",
    peak_time:  "TBA",
    price_text: "Free — RSVP only",
    capacity:   2000,
    partners: [{ name: "Social", role: "Series Partner", href: "/ccdxsocial" }],
    marquee_items: ["DELHI · OCTOBER 2026", "CCD × SOCIAL 04", "LINEUP TBA", "FREE ENTRY"],
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
