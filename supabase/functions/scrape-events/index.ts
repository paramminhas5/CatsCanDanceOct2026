// Nightly scene scraper. Runs on Supabase Edge (Deno), triggered by pg_cron.
// No AI calls: scoring happens in Postgres (score_scraped_event trigger).
// New rows land as status='pending' (or 'rejected' if they score below 0). Existing URLs are left alone.

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UA = "Mozilla/5.0 (compatible; CCDBot/2.0; +https://catscandance.com)";

type Raw = {
  title: string;
  url: string;
  source: string;
  city: string | null;
  venue: string | null;
  event_date: string | null;
  event_time: string | null;
  image_url: string | null;
  description: string | null;
  ticket_url?: string | null;
  lineup?: string[] | null;
  kind?: "club" | "concert" | "festival";
  source_url?: string | null;
  genres?: string[] | null;
};

const errs: string[] = [];
const note = (src: string, e: unknown) => { if (errs.length < 40) errs.push(`${src}: ${String(e).slice(0, 120)}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sb(path: string, init: RequestInit = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function get(url: string, ms = 10000) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xml" }, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

function meta(html: string, prop: string) {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
  const v = a?.[1] ?? b?.[1];
  return v ? decode(v) : null;
}

const CITY_MAP: [RegExp, string][] = [
  [/bangalore|bengaluru|\bblr\b|indiranagar|koramangala|whitefield/i, "Bengaluru"],
  [/mumbai|bombay|bandra|lower parel|andheri/i, "Mumbai"],
  [/delhi|\bncr\b|gurgaon|gurugram|noida/i, "Delhi NCR"],
  [/\bgoa\b|vagator|anjuna|panjim|assagao/i, "Goa"],
  [/pune/i, "Pune"],
  [/hyderabad/i, "Hyderabad"],
  [/chennai/i, "Chennai"],
  [/kolkata|calcutta/i, "Kolkata"],
];
function city(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const [re, c] of CITY_MAP) if (re.test(text)) return c;
  return null;
}

function* jsonLdEvents(html: string): Generator<Record<string, any>> {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    let data: any;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const items = Array.isArray(data) ? data : data["@graph"] ?? [data];
    for (const it of items.flatMap((x: any) => (x?.["@type"] === "ItemList" ? (x.itemListElement ?? []).map((l: any) => l.item ?? l) : [x]))) {
      const t = it?.["@type"];
      if (t === "Event" || t === "MusicEvent" || (Array.isArray(t) && t.some((x: string) => /Event$/.test(x)))) yield it;
    }
  }
}

// Dates in UTC (trailing Z or +00:00) are shifted to IST so the day is right for India.
function istParts(start: string | null): { date: string | null; time: string | null } {
  if (!start) return { date: null, time: null };
  if (/(Z|\+00:?00)$/.test(start)) {
    const d = new Date(new Date(start).getTime() + 5.5 * 3600 * 1000);
    if (isNaN(d.getTime())) return { date: null, time: null };
    const iso = d.toISOString();
    return { date: iso.slice(0, 10), time: start.length > 10 ? iso.slice(11, 16) : null };
  }
  return { date: /^\d{4}-\d{2}-\d{2}/.test(start) ? start.slice(0, 10) : null, time: start.length >= 16 ? start.slice(11, 16) : null };
}

const kindOf = (blob: string): "club" | "concert" | "festival" =>
  /\b(festival|fest)\b/i.test(blob) ? "festival" : /world tour|concert|arena|stadium|grounds|india 20\d\d|\btour\b/i.test(blob) ? "concert" : "club";

const MUSIC = /techno|house|\bdj\b|rave|club|night|party|bass|electronic|disco|music|festival|\bfest\b|dnb|drum|jungle|trance|afro|garage|concert|tour|beats|sound|session|\blive\b|boiler|sunburn|dgtl|ambient|set\b/i;
const NOT_MUSIC = /comedy|stand-?up|workshop|healthcare|conference|summit|expo|yoga|painting|trek|quiz|seminar|networking|webinar|kids|pottery|startup|marathon|cricket|screening|package|holiday|food fest|brunch|buffet|trip\b/i;
// allevents /music pages are music-only already, so they skip the keyword requirement and only get the exclusion list.
const relevant = (r: Raw) => { const t = `${r.title} ${r.venue ?? ""}`; return (r.source === "allevents" || MUSIC.test(t)) && !NOT_MUSIC.test(t); };

function fromLd(it: Record<string, any>, source: string, fallbackUrl: string, fallbackCity: string | null): Raw | null {
  const title = it.name ? decode(String(it.name)) : null;
  if (!title) return null;
  const { date, time } = istParts(typeof it.startDate === "string" ? it.startDate : null);
  const loc = Array.isArray(it.location) ? it.location[0] : it.location;
  const addr = loc?.address;
  const addrText = typeof addr === "string" ? addr : [addr?.streetAddress, addr?.addressLocality, addr?.addressRegion].filter(Boolean).join(", ");
  const offers = Array.isArray(it.offers) ? it.offers[0] : it.offers;
  const perf = (Array.isArray(it.performer) ? it.performer : it.performer ? [it.performer] : []).map((x: any) => decode(String(x?.name ?? ""))).filter(Boolean).slice(0, 30);
  const url = String(it.url ?? it["@id"] ?? fallbackUrl);
  const venue = loc?.name ? decode(String(loc.name)).slice(0, 120) : null;
  // Facts only: no images, no copied descriptions.
  return {
    title, url, source, source_url: url,
    city: city(addrText) ?? city(loc?.name) ?? city(title) ?? fallbackCity,
    venue, event_date: date, event_time: time, image_url: null, description: null,
    ticket_url: offers?.url ? String(offers.url) : null, lineup: perf.length ? perf : null,
    kind: kindOf(`${title} ${venue ?? ""}`),
  };
}

// ---- sources -------------------------------------------------------------

// Listing pages that ship Event JSON-LD in the HTML (no browser needed). Failures are logged per page in stats.errors.
// Not covered: Insider and Skillbox (single-page apps with no data in the HTML), BookMyShow and Resident Advisor (both block us).
// Promoters on those sites send their nights through /submit-event instead.
// allevents paginates 15 at a time, so the first three pages of music and parties are read per city.
// allevents moved Pune to /pune-in (the old /pune pages 404 since early Nov 2026).
const AE_CITIES = ["bangalore", "mumbai", "delhi", "goa", "pune-in", "hyderabad", "chennai", "kolkata"];
const PAGES: [string, string, string | null][] = [
  ["https://www.district.in/events/", "district", null],
  // HighApe no longer lists Delhi or Pune events (both pages came back empty every night), so they are left out.
  ...["bangalore", "mumbai", "goa", "hyderabad"].map((c): [string, string, string | null] => [`https://www.highape.com/${c}`, "highape", city(c)]),
  ...AE_CITIES.flatMap((c) =>
    ["music", "parties"].flatMap((cat) =>
      [1, 2, 3].map((pg): [string, string, string | null] => [`https://allevents.in/${c}/${cat}${pg > 1 ? `?page=${pg}` : ""}`, "allevents", city(c)]))),
];

async function listings(): Promise<Raw[]> {
  const out: Raw[] = [];
  for (const [url, source, c] of PAGES) {
    try {
      const html = await get(url, 15000);
      let n = 0;
      for (const it of jsonLdEvents(html)) {
        const r = fromLd(it, source, url, c);
        if (r && relevant(r)) { out.push(r); n++; }
      }
      if (n === 0 && !url.includes("page=")) note(source, `0 relevant events at ${url}`);
    } catch (e) { note(source, e); }
    await sleep(400);
  }
  return out;
}

// Gigs Calendar (gigscalendar.com): India electronic and underground aggregator, server-rendered.
// Homepage lists /events/<slug> cards; each detail page has date, venue, city, lineup, genres and an outbound ticket link.
// We store facts only (no images, no copied descriptions) and link back to the source and the ticket seller.
const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const strip = (s: string) => decode(s.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));

function parseGigsDetail(html: string, url: string): Raw | null {
  const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
  if (!title) return null;
  const when = strip(html.match(/<header[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "");
  const dm = when.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s*·\s*(\d{2}:\d{2}))?/);
  const mi = dm ? MONTHS.indexOf(dm[2].toLowerCase()) : -1;
  const date = dm && mi >= 0 ? `${dm[3]}-${String(mi + 1).padStart(2, "0")}-${dm[1].padStart(2, "0")}` : null;
  const venueP = html.match(/<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
  const venue = strip(venueP.split(/<span/)[0]) || null;
  const cityTxt = strip(venueP.match(/<span[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "").replace(/^·\s*/, "");
  const lineupHtml = html.match(/Lineup<\/h2>\s*<ul[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? "";
  const lineup = [...lineupHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1])).filter(Boolean).slice(0, 40);
  const pills = html.match(/<\/ul><\/section><section class="mb-10 flex flex-wrap gap-2">([\s\S]*?)<\/section>/)?.[1] ?? html.match(/<section class="mb-10 flex flex-wrap gap-2">([\s\S]*?)<\/section>/)?.[1] ?? "";
  const genres = [...pills.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) => strip(m[1])).filter(Boolean).slice(0, 8);
  const ticket = [...html.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>\s*Tickets/g)][0]?.[1] ?? null;
  // Conservative: only title and venue decide. Param can change kind in /ops when approving.
  const blob = `${strip(title)} ${venue ?? ""}`;
  const kind = /\b(festival|fest)\b/i.test(blob) ? "festival" : /world tour|\btour\b.*\b20\d\d\b|concert|arena|stadium|grounds/i.test(blob) ? "concert" : "club";
  return {
    title: strip(title), url, source: "gigscalendar", source_url: url,
    city: city(`${cityTxt} ${venue ?? ""}`) ?? (cityTxt || null), venue, event_date: date, event_time: dm?.[4] ?? null,
    image_url: null, description: null, ticket_url: ticket, lineup, genres, kind,
  };
}

async function gigscalendar(): Promise<Raw[]> {
  // The homepage shows the next few weeks; the sitemap lists every event page, so both are read.
  const home = await get("https://gigscalendar.com/", 20000);
  let map = "";
  try { map = await get("https://gigscalendar.com/sitemap.xml", 20000); } catch (e) { note("gigscalendar-sitemap", e); }
  const slugs = [...new Set([
    ...[...home.matchAll(/href="\/events\/([a-z0-9-]+)"/g)].map((m) => m[1]),
    ...[...map.matchAll(/gigscalendar\.com\/events\/([a-z0-9-]+)</g)].map((m) => m[1]),
  ])];
  if (!slugs.length) { note("gigscalendar", "no event links on homepage"); return []; }
  const known = new Set<string>();
  const kr = await sb("scraped_events?select=url&source=eq.gigscalendar&limit=2000");
  if (kr.ok) for (const r of await kr.json()) known.add(r.url);
  const fresh = slugs.map((x) => `https://gigscalendar.com/events/${x}`).filter((u) => !known.has(u)).slice(0, 150);
  const out: Raw[] = [];
  for (const u of fresh) {
    try {
      const r = parseGigsDetail(await get(u, 8000), u);
      if (r) out.push(r); else note("gigscalendar", `unparsed ${u}`);
    } catch (e) { note("gigscalendar-page", e); }
    await sleep(250);
  }
  return out;
}


// ---- detail pages (9 Nov 2026) ---------------------------------------------
// Listing pages from allevents and District carry no lineup. Each event's own page has the
// organiser's write-up in its Event JSON-LD. We read it once, keep only facts and never store the text:
//   genres   sound words found in it (so blocks like hard techno, psy trance and Bollywood can act)
//   lineup   performers it lists, plus acts on our credible list that it mentions
//   description  "Promoter: <name>" when a promoter on our list is named in it
const GENRE_WORDS: [RegExp, string][] = [
  [/\bhard[\s-]?techno\b|\bschranz\b|\bhard[\s-]?groove\b|\bindustrial techno\b/i, "hard techno"],
  [/\bpsy[\s-]?trance\b|\bgoa trance\b|\bforest psy\b|\bdark psy\b/i, "psy trance"],
  [/\bmelodic (techno|house)\b/i, "melodic"],
  [/\bafro[\s-]?house\b/i, "afro house"],
  [/\btech[\s-]?house\b/i, "tech house"],
  [/\bdeep house\b/i, "deep house"],
  [/\b(nu[\s-]?)?disco\b/i, "disco"],
  [/\buk garage\b|\bukg\b|\b2[\s-]?step\b/i, "garage"],
  [/\bbreakbeat\b|\bbreaks\b/i, "breaks"],
  [/\bdrum (?:and|&|n'?) ?bass\b|\bdnb\b|\bjungle music\b/i, "drum and bass"],
  [/\bdub techno\b/i, "dub techno"],
  [/\btechno\b/i, "techno"],
  [/\bhouse music\b/i, "house"],
  [/\bbollywood\b|\bbollytech\b/i, "bollywood"],
  [/\bpunjabi\b/i, "punjabi"],
  [/\bhip[\s-]?hop\b/i, "hip-hop"],
  [/\bjazz\b/i, "jazz"],
];
// Roster names are not matched in free text: many are ordinary words or common names ("Girls Night Out",
// "Green Park", "Anushka", "Stain"). Roster artists still match through real lineups in Postgres.
type Names = { acts: string[]; promoters: string[] };
async function loadNames(): Promise<Names> {
  const out: Names = { acts: [], promoters: [] };
  try {
    const t = await (await sb("curation_trust?select=kind,pattern&kind=in.(act,promoter)")).json();
    for (const r of t) (r.kind === "act" ? out.acts : out.promoters).push(String(r.pattern));
  } catch (e) { note("names", e); }
  return out;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Finds a name in the text as a whole word and returns it as written there.
function found(text: string, name: string): string | null {
  const m = text.match(new RegExp(`(?<![\\p{L}\\p{N}])${esc(name)}(?![\\p{L}\\p{N}])`, "iu"));
  return m ? m[0] : null;
}

type Facts = { genres: string[]; lineup: string[]; promoters: string[] };
function factsFrom(text: string, perf: string[], names: Names): Facts {
  const genres = GENRE_WORDS.filter(([re]) => re.test(text)).map(([, g]) => g);
  if (genres.includes("hard techno") || genres.includes("melodic") || genres.includes("dub techno")) {
    const i = genres.indexOf("techno"); if (i >= 0) genres.splice(i, 1);
  }
  const lineup = [...perf];
  const have = (n: string) => lineup.some((x) => x.toLowerCase() === n.toLowerCase());
  for (const a of names.acts) { const f = found(text, a); if (f && !have(f)) lineup.push(f); }
  const promoters: string[] = [];
  for (const p of names.promoters) { const f = found(text, p); if (f && !promoters.some((x) => x.toLowerCase() === f.toLowerCase())) promoters.push(f); }
  return { genres, lineup: lineup.slice(0, 30), promoters };
}

async function detailFacts(url: string, names: Names): Promise<Facts | null> {
  const html = await get(url, 8000);
  for (const it of jsonLdEvents(html)) {
    const text = it.description ? decode(String(it.description)) : "";
    const perf = (Array.isArray(it.performer) ? it.performer : it.performer ? [it.performer] : [])
      .map((x: any) => decode(String(x?.name ?? ""))).filter(Boolean);
    const org = (Array.isArray(it.organizer) ? it.organizer : it.organizer ? [it.organizer] : [])
      .map((x: any) => decode(String(x?.name ?? ""))).filter(Boolean).join(" ");
    return factsFrom(`${text} ${org}`, perf, names);
  }
  return null;
}

const mergeGenres = (a: string[] | null | undefined, b: string[]) => {
  const out = [...(a ?? [])];
  for (const g of b) if (!out.some((x) => x.toLowerCase() === g)) out.push(g);
  return out.length ? out.slice(0, 10) : null;
};

// Details pass (mode=backfill, its own pg_cron job ccd-scrape-details at 02:20 IST, before the 02:45 curate pass).
// Reads the event page of upcoming allevents and District rows not read yet (newest first), one at a time with a pause,
// and stops for the night if the site says too many requests. Writes go through PATCH, so the credibility,
// scoring and artist-link triggers run again. Every row read gets detail_checked_at so it is never read twice.
async function backfill(names: Names, cap: number) {
  const today = new Date().toISOString().slice(0, 10);
  const q = `scraped_events?select=id,url,source,genres,lineup,description&event_date=gte.${today}` +
    `&source=in.(allevents,district)&detail_checked_at=is.null&lineup=is.null` +
    `&or=(status.eq.pending,curation.eq.%22no%20credible%20name%20found%22)&order=created_at.desc&limit=${cap}`;
  const rows = await (await sb(q)).json();
  let n = 0, changed = 0, stopped = false;
  for (const r of rows) {
    if (r.lineup?.length) continue;
    let f: Facts | null = null;
    try { f = await detailFacts(r.url, names); }
    catch (e) {
      note(`${r.source}-page`, e);
      if (String(e).includes("-> 429")) { stopped = true; break; }
    }
    n++;
    const patch: Record<string, unknown> = { detail_checked_at: new Date().toISOString() };
    if (f) {
      if (f.lineup.length) patch.lineup = f.lineup;
      const g = mergeGenres(r.genres, f.genres);
      if (g && JSON.stringify(g) !== JSON.stringify(r.genres ?? [])) patch.genres = g;
      if (f.promoters.length && !r.description) patch.description = `Promoter: ${f.promoters.join(", ")}`;
    }
    const res = await sb(`scraped_events?id=eq.${r.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    if (!res.ok) note("backfill", `${res.status} ${r.id}`);
    else if (Object.keys(patch).length > 1) changed++;
    await sleep(1500);
  }
  return { read: n, changed, stopped_on_429: stopped };
}

// ---- main ------------------------------------------------------------------

Deno.serve(async (req) => {
  // Only pg_cron (or Claude via the token) may trigger this.
  const token = req.headers.get("x-cron-token") ?? "";
  const cfg = await (await sb("ops_config?id=eq.1&select=token")).json();
  if (!token || token !== cfg?.[0]?.token) return new Response("unauthorized", { status: 401 });

  const names = await loadNames();
  const mode = new URL(req.url).searchParams.get("mode");
  if (mode === "backfill") {
    const cap = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? 50), 60);
    const b = await backfill(names, cap);
    await sb("cron_runs", { method: "POST", body: JSON.stringify({ job: "scrape-backfill", finished_at: new Date().toISOString(), ok: true, stats: { ...b, errors: errs } }) });
    return Response.json({ ...b, errors: errs });
  }

  const run = await (await sb("cron_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ job: "scrape-events" }),
  })).json();
  const runId = run?.[0]?.id;

  const sources = { listings, gigscalendar };
  const perSource: Record<string, number | string> = {};
  const all: Raw[] = [];
  const results = await Promise.allSettled(Object.values(sources).map((f) => f()));
  Object.keys(sources).forEach((k, i) => {
    const r = results[i];
    if (r.status === "fulfilled") { perSource[k] = r.value.length; all.push(...r.value); }
    else perSource[k] = `error: ${String(r.reason).slice(0, 80)}`;
  });

  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set<string>();
  const key = (e: { title: string; event_date: string | null }) => `${e.title.toLowerCase().replace(/[^a-z0-9]/g, "")}|${e.event_date ?? ""}`;
  const have = new Set<string>();
  const er = await sb(`scraped_events?select=title,event_date&event_date=gte.${today}&limit=5000`);
  if (er.ok) for (const r of await er.json()) have.add(key(r));
  const rows = all.filter((e) => {
    if (!e.url || !e.title || seen.has(e.url)) return false;
    seen.add(e.url);
    if (e.event_date && have.has(key(e))) return false;
    have.add(key(e));
    return !e.event_date || e.event_date >= today;
  });

  // PostgREST bulk inserts need every object to have the same keys (PGRST102).
  // Listing rows have no genres and gigscalendar rows do, so fill every optional key.
  const norm = (r: Raw) => ({
    title: r.title, url: r.url, source: r.source, city: r.city, venue: r.venue,
    event_date: r.event_date, event_time: r.event_time, image_url: r.image_url, description: r.description,
    ticket_url: r.ticket_url ?? null, lineup: r.lineup ?? null, kind: r.kind ?? "club",
    source_url: r.source_url ?? null, genres: r.genres ?? null,
  });

  let inserted = 0;
  let error: string | null = null;
  for (let i = 0; i < rows.length; i += 100) {
    const res = await sb("scraped_events?on_conflict=url", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(rows.slice(i, i + 100).map(norm)),
    });
    if (res.ok) inserted += (await res.json()).length;
    else error = `${res.status} ${(await res.text()).slice(0, 200)}`;
  }

  const stats = { found: all.length, candidates: rows.length, inserted, sources: perSource, errors: errs };
  if (runId) {
    await sb(`cron_runs?id=eq.${runId}`, {
      method: "PATCH",
      body: JSON.stringify({ finished_at: new Date().toISOString(), ok: !error, stats, error }),
    });
  }
  return Response.json(stats);
});
