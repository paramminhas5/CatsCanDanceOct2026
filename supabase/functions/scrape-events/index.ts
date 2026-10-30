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
  s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

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
// Not covered: Insider and Skillbox (single-page apps with no data in the HTML) and BookMyShow (blocks us).
const PAGES: [string, string, string | null][] = [
  ["https://www.district.in/events/", "district", null],
  ...["bangalore", "mumbai", "delhi", "goa", "pune", "hyderabad"].map((c): [string, string, string | null] => [`https://www.highape.com/${c}`, "highape", city(c)]),
  ...["bangalore", "mumbai", "delhi", "goa", "hyderabad", "chennai", "kolkata"].map((c): [string, string, string | null] => [`https://allevents.in/${c}/music`, "allevents", city(c)]),
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
      if (n === 0) note(source, `0 relevant events at ${url}`);
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
  const home = await get("https://gigscalendar.com/", 20000);
  const slugs = [...new Set([...home.matchAll(/href="\/events\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
  if (!slugs.length) { note("gigscalendar", "no event links on homepage"); return []; }
  const known = new Set<string>();
  const kr = await sb("scraped_events?select=url&source=eq.gigscalendar&limit=2000");
  if (kr.ok) for (const r of await kr.json()) known.add(r.url);
  const fresh = slugs.map((x) => `https://gigscalendar.com/events/${x}`).filter((u) => !known.has(u)).slice(0, 100);
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

// ---- main ------------------------------------------------------------------

Deno.serve(async (req) => {
  // Only pg_cron (or Claude via the token) may trigger this.
  const token = req.headers.get("x-cron-token") ?? "";
  const cfg = await (await sb("ops_config?id=eq.1&select=token")).json();
  if (!token || token !== cfg?.[0]?.token) return new Response("unauthorized", { status: 401 });

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

  let inserted = 0;
  let error: string | null = null;
  for (let i = 0; i < rows.length; i += 100) {
    const res = await sb("scraped_events?on_conflict=url", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(rows.slice(i, i + 100)),
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
