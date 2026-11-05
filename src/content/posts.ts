// Edit this file to add/edit blog posts. Each post supports a slug, title,
// excerpt, cover color, category, optional brief coverTitle, tag, date,
// author, body and optional human-readable structure.

export type CoverColor =
  | "cream"
  | "acid-yellow"
  | "lime"
  | "magenta"
  | "electric-blue"
  | "orange";

export type Category = "GUIDES" | "CULTURE" | "ARTISTS" | "JOURNAL" | "DROPS";

export type QuickPicks = {
  title: string;
  items: string[];
};

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  coverColor: CoverColor;
  /** High-level category — drives the cover chip */
  category?: Category;
  /** Brief 4-7 word version of the title shown on the cover tile */
  coverTitle?: string;
  /** Optional explicit issue number; otherwise derived from index */
  issue?: number;
  tag: string;
  date: string;
  author: string;
  /** TL;DR bullets — shown at top of post */
  tldr?: string[];
  /** Sidebar quick picks block (3 named things) */
  quickPicks?: QuickPicks;
  /** Big pull-quote rendered mid-post */
  pullQuote?: string;
  /** Honest "what we'd skip" near the end */
  whatWedSkip?: string;
  body: string[];
};

const rawPosts: Post[] = [
  {
    slug: "best-underground-parties-bangalore-2026",
    title: "Underground Parties in Bangalore",
    coverTitle: "Underground Parties in Bangalore",
    category: "GUIDES",
    excerpt:
      "How we find good nights in Bangalore, and where to look for them on this site.",
    coverColor: "magenta",
    tag: "GUIDE",
    date: "JAN 14, 2026",
    author: "Cats Can Dance",
    body: [
      "We are a Bengaluru crew. Param (Merman) and Satwik (Sartdawg) run it. We throw our own nights, called Episodes, and we keep a list of other nights in the city that we think are worth going to.",
      "Our own nights are at /nights. Four Episodes have happened so far. Episode 5 is on Wednesday 25 November 2026 at The Humming Tree. It is on a free list and the lineup is still to be announced.",
      "Everything else we rate is at /whats-on. We only put a night up there when someone credible is behind it: an artist we know, a touring act, or a promoter with a track record. A good venue on its own is not enough for us.",
      "Some plain advice. Follow promoters and DJs, not just venues. Get there early and catch the opening set. If you say you are going, go.",
    ],
  },
  {
    slug: "where-to-find-electronic-music-events-bangalore",
    title: "Where to Find Electronic Music Events in Bangalore",
    coverTitle: "Find Electronic Events in Bangalore",
    category: "GUIDES",
    excerpt:
      "Ticket sites, Instagram, friends, and the list we keep at /whats-on.",
    coverColor: "acid-yellow",
    tag: "GUIDE",
    date: "JAN 21, 2026",
    author: "Cats Can Dance",
    body: [
      "Search results for electronic events in Bangalore are often out of date. Here is what we actually use.",
      "Ticket sites such as District and Resident Advisor list a lot of paid nights. Check the date and the venue before you go, because listings do go stale.",
      "Instagram is where promoters and DJs post first. Follow the people who book the music, not only the clubs. Ask friends who go out. Small nights often get passed around by word of mouth.",
      "We keep our own list at /whats-on. Our own nights, the Episodes, are at /nights.",
    ],
  },
  {
    slug: "top-event-organisers-india-dance-music",
    title: "Finding Good Dance Music Promoters in India",
    coverTitle: "Event Organisers in India",
    category: "GUIDES",
    excerpt:
      "We are not going to rank anyone. Here is how we judge a promoter, and where to find the ones we trust.",
    coverColor: "electric-blue",
    tag: "FEATURE",
    date: "JAN 28, 2026",
    author: "Cats Can Dance",
    body: [
      "We don't rank promoters. We don't know every scene in every city well enough to do it fairly.",
      "What we look at instead is simple. Who is on the lineup. Whether the promoter books openers properly and not just a headliner. Whether past nights matched what was promised.",
      "In Bangalore, the nights that pass that test go on /whats-on. Artists we work with are at /artists, and our own nights are at /nights.",
    ],
  },
  {
    slug: "rsvp-culture-bangalore-party-scene",
    title: "RSVP Nights: How They Work",
    coverTitle: "RSVP Nights in Bangalore",
    category: "CULTURE",
    excerpt:
      "What a free list or RSVP means, and how to use one without messing it up for everyone else.",
    coverColor: "lime",
    tag: "ESSAY",
    date: "FEB 4, 2026",
    author: "Cats Can Dance",
    body: [
      "Some nights in Bangalore run on a list instead of a ticket. You put your name down, and the promoter knows roughly who is coming before doors. Some lists are free. Some still charge at the door, so read the details.",
      "If you RSVP, show up. If your plans change, take your name off so someone else can come. Bring the number of friends the list allows, not more.",
      "We do both. Some of our nights have tickets and some are on a free list. Episode 5, on Wednesday 25 November 2026 at The Humming Tree, is a free list. You can put your name down at /nights.",
    ],
  },
  {
    slug: "guide-techno-house-nights-bangalore",
    title: "Techno and House Nights in Bangalore",
    coverTitle: "Techno & House Nights, Bangalore",
    category: "GUIDES",
    excerpt:
      "Where we list them, and a few plain tips for getting the most out of a night.",
    coverColor: "orange",
    tag: "GUIDE",
    date: "FEB 11, 2026",
    author: "Cats Can Dance",
    body: [
      "We list techno and house nights we rate at /whats-on. Each listing shows the venue, the date and the lineup, so you can judge for yourself.",
      "We leave out hard techno and psy. That is a taste call, not a judgement on anyone who likes them.",
      "Our own Episodes are not one genre. Episode 3 at Indiranagar Social, for example, was breakbeat, UK garage, house and bass. Past and upcoming Episodes are at /nights.",
      "Plain tips: check the start time, get there for the opener, and drink water.",
    ],
  },
  {
    slug: "behind-the-decks-bangalore-rising-djs",
    title: "Behind the Decks: Bangalore DJs",
    coverTitle: "Bangalore DJs",
    category: "ARTISTS",
    excerpt:
      "Who has played our Episodes, and where to find more artists on this site.",
    coverColor: "cream",
    tag: "ARTISTS",
    date: "FEB 18, 2026",
    author: "Cats Can Dance",
    body: [
      "Episode 2 at Indiranagar Social on 28 June 2026 had our open deck winners, Agent Bugs, Groovier, Sartdawg and Shantam. Episode 4 at Bar Wild on 26 September 2026 had Bombie, Dwell, Sartdawg and Merman.",
      "We keep pages for Indian and South Asian artists at /artists, with their mixes, releases and upcoming gigs. Artists on tour are at /tour.",
    ],
  },
  {
    slug: "inside-episode-01",
    title: "Episode 01",
    coverTitle: "Episode 01",
    category: "JOURNAL",
    excerpt:
      "Our first night, on a Wednesday at Bar Wild in Indiranagar.",
    coverColor: "magenta",
    tag: "JOURNAL",
    date: "MAY 12, 2025",
    author: "Cats Can Dance",
    body: [
      "Episode 01 was on Wednesday 2 April 2025 at Bar Wild in Indiranagar, Bengaluru. It was the first Cats Can Dance night.",
      "Since then we have done three more. Episode 2 on 28 June 2026 and Episode 3 on 16 August 2026 were both daytime editions at Indiranagar Social, with pets outdoors and music indoors. Episode 4 was back at Bar Wild on 26 September 2026.",
      "Episode 5 is on Wednesday 25 November 2026 at The Humming Tree. It is a free list and the lineup is still to be announced. Details are at /nights.",
    ],
  },
  {
    slug: "streetwear-drop-cats-can-dance",
    title: "Cats Can Dance Merch",
    coverTitle: "Cats Can Dance Merch",
    category: "DROPS",
    excerpt: "Where our merch lives when we have some.",
    coverColor: "electric-blue",
    tag: "STREETWEAR",
    date: "FEB 25, 2026",
    author: "Cats Can Dance",
    body: [
      "When we make merch, it goes on /shop, and you can order it there. If the shop is empty, there is nothing on sale right now.",
    ],
  },
  {
    slug: "music-merch-collectibles-india",
    title: "Music Merch in India",
    coverTitle: "Music Merch in India",
    category: "CULTURE",
    excerpt:
      "A short take on buying music merch.",
    coverColor: "acid-yellow",
    tag: "CULTURE",
    date: "MAR 4, 2026",
    author: "Cats Can Dance",
    body: [
      "Our view is simple. Buy merch because you like the artist or the night, not as an investment. Buying straight from an artist or a label usually puts more of the money in their hands.",
      "If you want to support Indian artists, start at /artists. Our own merch, when we have some, is at /shop.",
    ],
  },
  {
    slug: "bangalore-underground-brands-cult",
    title: "Building a Following, Slowly",
    coverTitle: "Building a Following",
    category: "CULTURE",
    excerpt:
      "What we try to do as a small Bangalore crew. Not a playbook.",
    coverColor: "lime",
    tag: "CULTURE",
    date: "MAR 11, 2026",
    author: "Cats Can Dance",
    body: [
      "Throw nights we would go to ourselves. Put the people who play them on the site. Answer messages. Keep doing it.",
      "We have done four Episodes so far, and the fifth is on 25 November 2026 at The Humming Tree. If you want to see how it goes, the nights are at /nights.",
    ],
  },
  {
    slug: "limited-drops-101-scarcity-sells",
    title: "Limited Drops: A Short Note",
    coverTitle: "Limited Drops",
    category: "DROPS",
    excerpt: "What a drop is, and the one rule that matters.",
    coverColor: "orange",
    tag: "STREETWEAR",
    date: "MAR 18, 2026",
    author: "Cats Can Dance",
    body: [
      "A drop is a small run of something, released on a set day. When it is gone, it is gone.",
      "The one rule: if you say it is limited, keep it limited. If you quietly restock, people notice and stop believing you.",
      "Anything we release goes on /shop.",
    ],
  },
];

// Auto-assign issue numbers based on order so covers always show "№ 01"…"№ 11"
const staticPosts: Post[] = rawPosts.map((p, i) => ({
  ...p,
  issue: p.issue ?? i + 1,
}));

// ============================================================================
// AI-published posts (loaded from Lovable Cloud at runtime). The static posts
// above always render; published posts are merged in by the loader hook below.
// ============================================================================

let dynamicPosts: Post[] = [];
let mergedPosts: Post[] = staticPosts;
let dynamicLoaded = false;
const subscribers = new Set<() => void>();

/** True once the database posts have been fetched (or the fetch failed). */
export const dynamicPostsLoaded = (): boolean => dynamicLoaded;

export const markDynamicPostsLoaded = () => {
  if (dynamicLoaded) return;
  dynamicLoaded = true;
  for (const fn of subscribers) fn();
};

const rebuildMergedPosts = () => {
  mergedPosts = dynamicPosts.length > 0 ? [...dynamicPosts, ...staticPosts] : staticPosts;
};

const notify = () => {
  for (const fn of subscribers) fn();
};

/** Subscribe to dynamic-post changes. Returns an unsubscribe function. */
export const subscribePosts = (fn: () => void): (() => void) => {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
};

export const setDynamicPosts = (next: Post[]) => {
  // Newest first; assign continuing issue numbers after the static ones.
  const baseIssue = staticPosts.length;
  const nextDynamicPosts = next.map((p, i) => ({
    ...p,
    issue: p.issue ?? baseIssue + next.length - i,
  }));

  const hasChanged = JSON.stringify(nextDynamicPosts) !== JSON.stringify(dynamicPosts);
  if (!hasChanged) return;

  dynamicPosts = nextDynamicPosts;
  rebuildMergedPosts();
  notify();
};

export const getAllPosts = (): Post[] => {
  return mergedPosts;
};

// Backwards-compatible default export — current code uses `posts`.
// We expose a Proxy-like getter via a function to avoid mutation issues.
export const posts: Post[] = new Proxy([] as Post[], {
  get(_t, prop) {
    const all = getAllPosts();
    return (all as any)[prop];
  },
  has(_t, prop) {
    const all = getAllPosts();
    return prop in all;
  },
  ownKeys() {
    return Reflect.ownKeys(getAllPosts());
  },
  getOwnPropertyDescriptor(_t, prop) {
    const all = getAllPosts();
    return Reflect.getOwnPropertyDescriptor(all, prop);
  },
}) as Post[];

export const getPost = (slug: string) => getAllPosts().find((p) => p.slug === slug);

export const getRelatedPosts = (slug: string, limit = 3) =>
  getAllPosts().filter((p) => p.slug !== slug).slice(0, limit);
