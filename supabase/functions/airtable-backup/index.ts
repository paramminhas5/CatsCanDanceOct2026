// Mirrors live artists and their profile facts into the Airtable base "CCD Artist Profiles" (backup, no AI).
// Needs secrets: AIRTABLE_TOKEN (data.records:write on that base). Caller must send the ops token in the body: {"token":"..."}.
const SB = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AT = Deno.env.get("AIRTABLE_TOKEN") ?? "";
const BASE = Deno.env.get("AIRTABLE_BASE") ?? "appqn9a7JSGrykanr";
const sbh = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(path: string) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: sbh });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function upsert(table: string, mergeOn: string, rows: Record<string, unknown>[]) {
  let done = 0; const errors: string[] = [];
  for (let i = 0; i < rows.length; i += 10) {
    const chunk = rows.slice(i, i + 10);
    const r = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${AT}`, "Content-Type": "application/json" },
      body: JSON.stringify({ performUpsert: { fieldsToMergeOn: [mergeOn] }, typecast: true, records: chunk.map((fields) => ({ fields })) }),
    });
    if (!r.ok) errors.push(`${table} ${i}: ${r.status} ${(await r.text()).slice(0, 200)}`); else done += chunk.length;
    await sleep(230);
  }
  return { table, sent: rows.length, done, errors: errors.slice(0, 3) };
}

Deno.serve(async (req) => {
  try {
    if (!AT) return Response.json({ ok: false, error: "Set the AIRTABLE_TOKEN secret first." }, { status: 400 });
    const { token } = await req.json().catch(() => ({}));
    const chk = await fetch(`${SB}/rest/v1/rpc/ops_check`, { method: "POST", headers: sbh, body: JSON.stringify({ p_token: token ?? "" }) });
    if (!chk.ok) return Response.json({ ok: false, error: "Bad ops token." }, { status: 403 });

    const artists = await get("artists?status=eq.approved&select=slug,name,based_city,from_city,genres,instagram,website,owner_member,bio,photo_url&order=name");
    const facts = await get("artist_facts?status=neq.rejected&select=id,artist_slug,section,label,detail,url,source,confidence,status&order=artist_slug");
    const counts: Record<string, { p: number; a: number }> = {};
    for (const f of facts) { const c = (counts[f.artist_slug] ??= { p: 0, a: 0 }); if (f.status === "approved") c.a++; else c.p++; }

    const aRows = artists.map((a: any) => ({
      Artist: a.name, Slug: a.slug, City: a.based_city ?? a.from_city ?? "", Genres: (a.genres ?? []).join(", "), Instagram: a.instagram ?? "", Website: a.website ?? "",
      "Profile page": `https://catscandance.com/artists/${a.slug}`, "Claimed by artist": !!a.owner_member,
      "Proposed facts": counts[a.slug]?.p ?? 0, "Approved facts": counts[a.slug]?.a ?? 0,
    }));
    const fRows = facts.map((f: any) => ({
      Fact: f.label, "Artist slug": f.artist_slug, Section: f.section, Detail: f.detail ?? "", URL: f.url ?? "", Source: f.source, Confidence: f.confidence, Status: f.status, "Fact ID": f.id,
    }));
    const out = [await upsert("Artists", "Slug", aRows), await upsert("Profile facts", "Fact ID", fRows)];
    return Response.json({ ok: out.every((o) => o.errors.length === 0), results: out });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
