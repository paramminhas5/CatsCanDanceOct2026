// Proposes artist profile facts from outside sources. Supabase Edge (Deno). No AI.
// Deezer (no key): top tracks -> "plays", related artists -> "listens", fan count -> "fans".
// Bandsintown (only if BANDSINTOWN_APP_ID is set): upcoming dates -> "upcoming".
// Everything is written as status 'proposed'. Nothing is public until the artist or the owner approves it.
// Safe to call often: it works through artists that have not been run, a few at a time, with a cooldown.

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BIT = Deno.env.get("BANDSINTOWN_APP_ID") ?? "";
const UA = "CatsCanDance/1.0 (https://catscandance.com; hello@catscandance.com)";
const BATCH = 12;
const COOLDOWN_MS = 45_000;

const sb = (path: string, init: RequestInit = {}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
async function getJson(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

type Fact = { artist_slug: string; section: string; label: string; detail?: string; url?: string; event_date?: string; source: string; confidence: string; dedupe: string };

async function forArtist(a: { slug: string; name: string }): Promise<{ facts: Fact[]; note: string }> {
  const facts: Fact[] = [];
  let note = "";
  const hits = ((await getJson(`https://api.deezer.com/search/artist?q=${encodeURIComponent(`artist:"${a.name}"`)}&limit=5`)).data ?? []).filter((x: any) => norm(x.name ?? "") === norm(a.name));
  if (hits.length === 1) {
    const d = hits[0];
    const [top, rel] = await Promise.all([
      getJson(`https://api.deezer.com/artist/${d.id}/top?limit=5`).catch(() => ({ data: [] })),
      getJson(`https://api.deezer.com/artist/${d.id}/related?limit=8`).catch(() => ({ data: [] })),
    ]);
    for (const t of top.data ?? []) {
      if (!t.title) continue;
      facts.push({ artist_slug: a.slug, section: "plays", label: `Track: ${t.title}`, detail: t.album?.title ? `From ${t.album.title}` : undefined, url: t.link, source: "Deezer", confidence: "medium", dedupe: `deezer-track-${t.id}` });
    }
    for (const r of rel.data ?? []) {
      if (!r.name) continue;
      facts.push({ artist_slug: a.slug, section: "listens", label: r.name, detail: "Listeners of this artist also listen to", url: r.link, source: "Deezer related artists", confidence: "medium", dedupe: `deezer-rel-${r.id}` });
    }
    if ((d.nb_fan ?? 0) > 0) facts.push({ artist_slug: a.slug, section: "fans", label: `${Number(d.nb_fan).toLocaleString("en-US")} fans on Deezer`, url: d.link, source: "Deezer", confidence: "medium", dedupe: "deezer-fans" });
    note = `deezer ${d.id}`;
  } else note = hits.length > 1 ? "deezer ambiguous, skipped" : "deezer no exact match";

  if (BIT) {
    try {
      const ev = await getJson(`https://rest.bandsintown.com/artists/${encodeURIComponent(a.name)}/events?app_id=${encodeURIComponent(BIT)}&date=upcoming`);
      for (const e of Array.isArray(ev) ? ev.slice(0, 15) : []) {
        facts.push({ artist_slug: a.slug, section: "upcoming", label: e.title || e.venue?.name || "Show", detail: [e.venue?.name, e.venue?.city, e.venue?.country].filter(Boolean).join(", "), url: e.url, event_date: String(e.datetime ?? "").slice(0, 10) || undefined, source: "Bandsintown", confidence: "medium", dedupe: `bit-${e.id}` });
      }
    } catch (_e) { /* optional source */ }
  }
  return { facts, note };
}

Deno.serve(async (_req) => {
  const last = await (await sb("artist_fact_runs?select=last_run&order=last_run.desc&limit=1")).json();
  if (last?.[0] && Date.now() - new Date(last[0].last_run).getTime() < COOLDOWN_MS) return new Response(JSON.stringify({ ok: true, skipped: "cooldown" }), { status: 429, headers: { "Content-Type": "application/json" } });

  const done = new Set(((await (await sb("artist_fact_runs?select=artist_slug")).json()) ?? []).map((r: any) => r.artist_slug));
  const all = await (await sb("artists?select=slug,name&status=eq.approved&order=rank.asc.nullslast,name.asc&limit=500")).json();
  const todo = (all ?? []).filter((a: any) => !done.has(a.slug)).slice(0, BATCH);

  let proposed = 0; const errors: string[] = []; const notes: Record<string, string> = {};
  for (const a of todo) {
    try {
      const { facts, note } = await forArtist(a);
      notes[a.slug] = note;
      if (facts.length) {
        const r = await sb("artist_facts?on_conflict=artist_slug,section,dedupe", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(facts.map((f) => ({ artist_slug: f.artist_slug, section: f.section, label: f.label, detail: f.detail ?? null, url: f.url ?? null, event_date: f.event_date ?? null, source: f.source, confidence: f.confidence, dedupe: f.dedupe }))) });
        if (!r.ok) errors.push(`${a.slug}: insert ${r.status} ${(await r.text()).slice(0, 80)}`); else proposed += facts.length;
      }
      await sb("artist_fact_runs?on_conflict=artist_slug", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ artist_slug: a.slug, last_run: new Date().toISOString(), note }) });
    } catch (e) { errors.push(`${a.slug}: ${String(e).slice(0, 80)}`); }
  }
  return new Response(JSON.stringify({ ok: true, artists: todo.length, proposed, remaining: Math.max((all ?? []).length - done.size - todo.length, 0), errors, notes }), { headers: { "Content-Type": "application/json" } });
});
