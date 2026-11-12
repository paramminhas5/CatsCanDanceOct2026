// Standalone host for the preview page (Vercel project ccd-home-preview). Same logic as pages/api/deezer/find.ts:
// our own artist data first (checked Deezer track, checked Deezer artist, newest Bandcamp, SoundCloud),
// a Deezer name search only for names we do not have. Reads with the public anon key; nothing stored.
const SB = process.env.SUPABASE_URL || "", KEY = process.env.SUPABASE_ANON_KEY || "";
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const when = (d) => d.release_date || (d.year ? `${d.year}-06-30` : "0000");
async function sel(path) {
  if (!SB || !KEY) return [];
  try { const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }); return r.ok ? await r.json() : []; } catch { return []; }
}
async function dz(path, signal) {
  try { const r = await fetch(`https://api.deezer.com/${path}`, { signal }); if (!r.ok) return null; const j = await r.json(); return j && j.error ? null : j; } catch { return null; }
}
async function top(id, signal) {
  const j = await dz(`artist/${id}/top?limit=5`, signal); const t = ((j && j.data) || []).find((x) => x.preview);
  return t ? { kind: "audio", url: t.preview, title: t.title || "", from: "Deezer" } : null;
}
async function ours(name, signal) {
  const a = (await sel(`artists?name=ilike.${encodeURIComponent(name)}&status=eq.approved&select=slug,soundcloud&limit=1`))[0];
  if (!a) return null;
  const s = encodeURIComponent(a.slug);
  const [disc, ext] = await Promise.all([
    sel(`artist_discography?artist_slug=eq.${s}&select=title,release_type,release_date,year,deezer_track_id,bandcamp_item_id,bandcamp_item_type&limit=200`),
    sel(`artist_external_ids?artist_slug=eq.${s}&scheme=eq.deezer&select=value&limit=1`),
  ]);
  const newest = disc.slice().sort((x, y) => (when(y) > when(x) ? 1 : when(y) < when(x) ? -1 : 0));
  for (const d of newest.filter((x) => x.deezer_track_id).slice(0, 4)) {
    const t = await dz(`track/${d.deezer_track_id}`, signal);
    if (t && t.preview) return { kind: "audio", url: t.preview, title: t.title || d.title || "", from: "Deezer" };
  }
  if (ext[0] && /^\d+$/.test(ext[0].value)) { const t = await top(ext[0].value, signal); if (t) return t; }
  const bc = newest.find((d) => d.bandcamp_item_id && (d.bandcamp_item_type === "track" || (d.bandcamp_item_type === "album" && String(d.release_type || "").toLowerCase() !== "compilation")));
  if (bc) return { kind: "bandcamp", type: bc.bandcamp_item_type, id: Number(bc.bandcamp_item_id), title: bc.title || "" };
  if (a.soundcloud && /^https:\/\/(www\.)?soundcloud\.com\/[\w-]+/.test(a.soundcloud)) return { kind: "soundcloud", url: a.soundcloud };
  return "none";
}
module.exports = async (req, res) => {
  const q = String((req.query && req.query.q) || "").trim();
  if (!q || q.length > 80 || !/^[\p{L}\p{N} .&'-]+$/u.test(q)) return res.status(400).json({ error: "bad name" });
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const o = await ours(q, ctl.signal);
    if (o === "none") return res.status(404).json({ error: "nothing on file" });
    let hit = o;
    if (!hit) {
      const j = await dz(`search/artist?q=${encodeURIComponent(q)}&limit=8`, ctl.signal);
      const ar = ((j && j.data) || []).find((x) => norm(x.name) === norm(q));
      if (!ar) return res.status(404).json({ error: "no artist" });
      hit = await top(ar.id, ctl.signal);
      if (!hit) return res.status(404).json({ error: "no preview" });
    }
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=300");
    return res.status(200).json(hit);
  } catch { return res.status(502).json({ error: "lookup failed" }); } finally { clearTimeout(timer); }
};
