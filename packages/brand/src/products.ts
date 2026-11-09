/**
 * The Cats Can Dance product registry.
 *
 * One place that says which products exist, what they are called today, how they link
 * to each other and what colour each one owns. Every app imports this. Renaming a
 * product is a one-line change here (the `name` field); slugs, env names and folders
 * stay stable so nothing else moves.
 *
 * Names marked `working: true` are working names. Param picks the final ones.
 * 9 Nov 2026: Headliner is now Artists, Ustad is now School, and Gate shows as Host
 * (the `gate` id, folder, env and URL stay, so nothing else moves).
 */

export type ProductId = "ccd" | "artists" | "gate" | "school";

export type Product = {
  id: ProductId;
  /** Display name used in UI, titles and the banner. */
  name: string;
  /** Short label in the suite nav and footer (the ccd product shows as Nights there). */
  navLabel: string;
  /** True while the name is a working name. */
  working: boolean;
  /** One line that says what the product does. Function first. */
  promise: string;
  /** Verb-first label for the banner (Param, 3 Nov 2026: nav leads with verbs). */
  verb: string;
  /** Colloquial nicknames, never in URLs or nav (Param, 3 Nov 2026). */
  nicknames: { cat: string; music: string };
  /** Product colour, used as the accent in that product and as its dot in the banner. */
  colour: string;
  /** Env var that overrides the URL (previews), and the production URL. */
  urlEnv: string;
  url: string;
};

export const PRODUCTS: Record<ProductId, Product> = {
  ccd: {
    id: "ccd",
    name: "Cats Can Dance",
    navLabel: "Nights",
    working: false,
    promise: "Find a night, find your crew, come to ours.",
    verb: "Go out",
    nicknames: { cat: "the prowl", music: "the gig guide" },
    colour: "#2563eb",
    urlEnv: "NEXT_PUBLIC_CCD_URL",
    url: "https://catscandance.com",
  },
  artists: {
    id: "artists",
    name: "Artists",
    navLabel: "Artists",
    working: true,
    promise: "Every artist, and everything they put out. Follow, buy, go to the show, or book them.",
    verb: "Find and book",
    nicknames: { cat: "top cat", music: "the bill" },
    colour: "#b6ef36",
    urlEnv: "NEXT_PUBLIC_ARTISTS_URL",
    url: "https://artists.catscandance.com",
  },
  gate: {
    id: "gate",
    name: "Host",
    navLabel: "Host",
    working: true,
    promise: "Throw a party and run it from one app: the page, artists, gear, tickets, the door, the money.",
    verb: "Host",
    nicknames: { cat: "the cat flap", music: "doors" },
    colour: "#ffe600",
    urlEnv: "NEXT_PUBLIC_GATE_URL",
    url: "https://gate.catscandance.com",
  },
  school: {
    id: "school",
    name: "School",
    navLabel: "School",
    working: false,
    promise: "Learn production and DJing by making real music on a real instrument.",
    verb: "Learn",
    nicknames: { cat: "big cat", music: "riyaz" },
    colour: "#ff4d8d",
    urlEnv: "NEXT_PUBLIC_SCHOOL_URL",
    url: "https://school.catscandance.com",
  },
};

export const PRODUCT_ORDER: ProductId[] = ["ccd", "artists", "gate", "school"];

/**
 * Resolve a product's base URL. Reads the env override first so Vercel previews can
 * point at preview URLs, then falls back to the production URL. Works in server and
 * client code (NEXT_PUBLIC_ vars are inlined at build time).
 */
export function productUrl(id: ProductId, env: Record<string, string | undefined> = defaultEnv()): string {
  const p = PRODUCTS[id];
  const fromEnv = env[p.urlEnv];
  return (fromEnv && fromEnv.replace(/\/$/, "")) || p.url;
}

function defaultEnv(): Record<string, string | undefined> {
  // Each key is written out so Next.js can inline it on the client.
  return {
    NEXT_PUBLIC_CCD_URL: process.env.NEXT_PUBLIC_CCD_URL,
    NEXT_PUBLIC_ARTISTS_URL: process.env.NEXT_PUBLIC_ARTISTS_URL,
    NEXT_PUBLIC_GATE_URL: process.env.NEXT_PUBLIC_GATE_URL,
    NEXT_PUBLIC_SCHOOL_URL: process.env.NEXT_PUBLIC_SCHOOL_URL,
  };
}

/** Links each product owns, used by the other products. Keep these stable. */
export const LINKS = {
  ccd: {
    home: "/",
    nights: "/nights",
    whatsOn: "/whats-on",
    night: (slug: string) => `/nights/${slug}`,
    tickets: (slug: string) => `/tickets/${slug}`,
    account: "/me",
    signIn: "/join",
  },
  artists: {
    home: "/",
    index: "/artists",
    artist: (slug: string) => `/${slug}`,
    tour: "/tour",
    book: (slug: string) => `/${slug}/book`,
    bookings: "/bookings",
    claim: (token: string) => `/claim/${token}`,
  },
  gate: {
    home: "/",
    door: "/door",
    doorNight: (slug: string) => `/door/${slug}`,
    promote: "/promote",
    promoter: (slug: string) => `/promote/${slug}`,
    live: (key: string) => `/live/${key}`,
  },
  school: {
    home: "/",
    learn: "/learn",
    studio: "/studio",
    sso: "/api/auth/ccd",
  },
} as const;

/** Absolute URL into another product. */
export function productLink(id: ProductId, path: string): string {
  return `${productUrl(id)}${path.startsWith("/") ? path : `/${path}`}`;
}
