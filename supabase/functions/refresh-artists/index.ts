// Nightly artist data refresh. Supabase Edge (Deno), triggered by pg_cron. No AI.
// Sources: MusicBrainz (links, genres, area), Wikidata (links, free-licence photo), Wikipedia (summary),
// Deezer and Apple Music search (candidates only, flagged by confidence).
// Only empty fields are filled. Existing values are never overwritten. Every fill is recorded in enrich_sources.

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UA = "CatsCanDance/1.0 (https://catscandance.com; hello@catscandance.com)";
const BATCH = 15;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errs: string[] = [];
const note = (e: unknown) => { if (errs.length < 30) errs.push(String(e).slice(0, 140)); };

async function sb(path: string, init: RequestInit = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

let lastMb = 0;
async function getJson(url: string, mb = false): Promise<any> {
  if (mb) { const wait = 1100 - (Date.now() - lastMb); if (wait > 0) await sleep(wait); lastMb = Date.now(); }
  let res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  if (res.status === 503 || res.status === 429) {
    await sleep(2500);
    res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  }
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
const INDIA = /india|mumbai|delhi|bengal|bangalore|bengaluru|goa|pune|chennai|kolkata|hyderabad|kerala|gujarat|maharashtra|karnataka/;

type Artist = {
  id: string; slug: string; name: string; based_city: string | null; bio: string | null; genres: string[] | null;
  instagram: string | null; website: string | null; soundcloud: string | null; spotify: string | null; photo_url: string | null; mbid: string | null;
};

// Exact name, high score, and the place has to fit. No area on the candidate means we skip it.
function confident(a: Artist, c: any): boolean {
  if (norm(c.name ?? "") !== norm(a.name) || (c.score ?? 0) < 95) return false;
  const areas = [c.area?.name, c["begin-area"]?.name, c.country].filter(Boolean).join(" ").toLowerCase();
  // Touring acts based abroad: accept only a perfect score plus a dance-music tag or disambiguation.
  const scene = /techno|house|electronic|dance|club|dj|bass|garage|disco|ambient|drum/i;
  const tagText = [(c.disambiguation ?? ""), ...(c.tags ?? []).map((t: any) => t.name)].join(" ");
  if ((c.score ?? 0) >= 100 && scene.test(tagText) && (!a.based_city || !INDIA.test(a.based_city.toLowerCase()))) return true;
  if (!areas) return false;
  const tokens = (a.based_city ?? "").toLowerCase().split(/[ ,]+/).filter((t) => t.length > 2 && t !== "india");
  if (tokens.some((t) => areas.includes(t))) return true;
  return (c.country === "IN" || INDIA.test(areas)) && (!a.based_city || INDIA.test(a.based_city.toLowerCase()) || tokens.length === 0);
}

const title = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());

async function enrich(a: Artist) {
  const patch: Record<string, unknown> = {};
  const src: Record<string, unknown> = { fetched: new Date().toISOString() };

  let mbid = a.mbid;
  if (!mbid) {
    const s = await getJson(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${a.name}"`)}&fmt=json&limit=5`, true);
    const hit = (s.artists ?? []).filter((c: any) => confident(a, c));
    if (hit.length === 1) mbid = hit[0].id;
    else src.musicbrainz = hit.length > 1 ? "ambiguous, skipped" : "no confident match";
  }

  // No MusicBrainz match: look for streaming profiles. Name-only matches are kept as candidates, not facts.
  if (!mbid) {
    try {
      const dz = (await getJson(`https://api.deezer.com/search/artist?q=${encodeURIComponent(a.name)}&limit=5`)).data ?? [];
      const dzExact = dz.filter((x: any) => norm(x.name ?? "") === norm(a.name));
      const ap = (await getJson(`https://itunes.apple.com/search?term=${encodeURIComponent(a.name)}&entity=musicArtist&limit=5&country=IN`)).results ?? [];
      const apExact = ap.filter((x: any) => norm(x.artistName ?? "") === norm(a.name));
      const cand: Record<string, unknown> = {};
      if (dzExact.length) cand.deezer = { id: dzExact[0].id, link: dzExact[0].link, fans: dzExact[0].nb_fan ?? null, matches: dzExact.length };
      if (apExact.length) cand.apple = { id: apExact[0].artistId, link: String(apExact[0].artistLinkUrl ?? "").split("?")[0], genre: apExact[0].primaryGenreName ?? null, matches: apExact.length };
      if (Object.keys(cand).length) {
        src.candidates = cand;
        const likely = dzExact.length === 1 && apExact.length === 1;
        src.confidence = likely ? "likely (unique exact name on Deezer and Apple Music)" : "name only, needs a human check";
        if (likely && (!a.genres || a.genres.length === 0) && apExact[0].primaryGenreName) patch.genres = [apExact[0].primaryGenreName];
      }
    } catch (e) { note(`${a.name} (streaming): ${e}`); }
  }

  let wikidata: string | null = null;
  if (mbid) {
    patch.mbid = mbid;
    const d = await getJson(`https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels+genres&fmt=json`, true);
    src.musicbrainz = `https://musicbrainz.org/artist/${mbid}`;
    for (const r of d.relations ?? []) {
      const u: string | undefined = r.url?.resource;
      if (!u) continue;
      if (!a.instagram && !patch.instagram && /instagram\.com\/([A-Za-z0-9._]+)/.test(u)) patch.instagram = u.match(/instagram\.com\/([A-Za-z0-9._]+)/)![1];
      else if (!a.soundcloud && !patch.soundcloud && /soundcloud\.com\//.test(u)) patch.soundcloud = u;
      else if (!a.spotify && !patch.spotify && /open\.spotify\.com\/artist\//.test(u)) patch.spotify = u;
      else if (!a.website && !patch.website && r.type === "official homepage") patch.website = u;
      else if (r.type === "wikidata") wikidata = u.match(/(Q\d+)/)?.[1] ?? null;
    }
    const g = (d.genres ?? []).sort((x: any, y: any) => (y.count ?? 0) - (x.count ?? 0)).slice(0, 4).map((x: any) => title(x.name));
    if ((!a.genres || a.genres.length === 0) && g.length) patch.genres = g;
  }

  if (wikidata) {
    const w = (await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${wikidata}.json`)).entities?.[wikidata];
    const claim = (p: string) => w?.claims?.[p]?.[0]?.mainsnak?.datavalue?.value;
    src.wikidata = `https://www.wikidata.org/wiki/${wikidata}`;
    if (!a.instagram && !patch.instagram && typeof claim("P2003") === "string") patch.instagram = claim("P2003");
    if (!a.soundcloud && !patch.soundcloud && typeof claim("P3040") === "string") patch.soundcloud = `https://soundcloud.com/${claim("P3040")}`;
    if (!a.spotify && !patch.spotify && typeof claim("P1902") === "string") patch.spotify = `https://open.spotify.com/artist/${claim("P1902")}`;
    if (!a.website && !patch.website && typeof claim("P856") === "string") patch.website = claim("P856");
    const img = claim("P18");
    if (!a.photo_url && typeof img === "string") {
      patch.photo_url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(img)}?width=800`;
      src.photo = { source: "Wikimedia Commons", page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(img.replace(/ /g, "_"))}` };
    }
    const wiki = w?.sitelinks?.enwiki?.title;
    if (!a.bio && wiki) {
      const s = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki.replace(/ /g, "_"))}`);
      if (s.type === "standard" && s.extract) {
        const text = String(s.extract).split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 420);
        if (text.length > 40) { patch.bio = text; src.bio = { source: "Wikipedia", page: s.content_urls?.desktop?.page ?? null, licence: "CC BY-SA" }; }
      }
    }
  }
  return { patch, src, filled: Object.keys(patch).filter((k) => k !== "mbid") };
}

Deno.serve(async (req) => {
  const token = req.headers.get("x-cron-token") ?? "";
  const cfg = await (await sb("ops_config?id=eq.1&select=token")).json();
  if (!token || token !== cfg?.[0]?.token) return new Response("unauthorized", { status: 401 });

  const run = await (await sb("cron_runs", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ job: "refresh-artists" }) })).json();
  const runId = run?.[0]?.id;

  const rows: Artist[] = await (await sb(
    `artists?status=eq.approved&select=id,slug,name,based_city,bio,genres,instagram,website,soundcloud,spotify,photo_url,mbid&order=enriched_at.asc.nullsfirst&limit=${BATCH}`,
  )).json();

  const filled: Record<string, string[]> = {};
  let matched = 0;
  for (const a of rows) {
    try {
      const { patch, src, filled: f } = await enrich(a);
      if (patch.mbid) matched++;
      if (f.length) filled[a.name] = f;
      await sb(`artists?id=eq.${a.id}`, { method: "PATCH", body: JSON.stringify({ ...patch, enriched_at: new Date().toISOString(), enrich_sources: src }) });
    } catch (e) {
      note(`${a.name}: ${e}`);
      await sb(`artists?id=eq.${a.id}`, { method: "PATCH", body: JSON.stringify({ enriched_at: new Date().toISOString() }) });
    }
  }

  const stats = { checked: rows.length, matched, filled, errors: errs };
  if (runId) await sb(`cron_runs?id=eq.${runId}`, { method: "PATCH", body: JSON.stringify({ finished_at: new Date().toISOString(), ok: true, stats }) });
  return Response.json(stats);
});
