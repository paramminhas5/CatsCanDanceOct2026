// Uploads one artist image into the public artist-media bucket. Guarded by the ops token. Supabase Edge (Deno). No AI.
// POST { token, slug, name, content_type, data_base64 } -> { ok, url }
// The service key never leaves Supabase: it is the platform-provided env var of this function.
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
const rest = (path: string) => fetch(`${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }).then((r) => r.json());

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b: any;
  try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const cfg = await rest("ops_config?select=token&id=eq.1");
  if (!b.token || b.token !== cfg?.[0]?.token) return json({ error: "unauthorized" }, 401);
  const slug = String(b.slug ?? "");
  const ext = TYPES[String(b.content_type ?? "")];
  const name = String(b.name ?? "");
  if (!/^[a-z0-9-]{1,80}$/.test(slug) || !ext || !/^[a-z0-9_-]{1,60}$/.test(name)) return json({ error: "bad slug, type or name" }, 400);
  const a = await rest(`artists?select=slug&slug=eq.${slug}`);
  if (!a?.length) return json({ error: "unknown slug" }, 404);
  const bytes = Uint8Array.from(atob(String(b.data_base64 ?? "")), (c) => c.charCodeAt(0));
  if (bytes.length < 500 || bytes.length > 8 * 1024 * 1024) return json({ error: "size" }, 400);
  const path = `${slug}/${name}.${ext}`;
  const r = await fetch(`${SB_URL}/storage/v1/object/artist-media/${path}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": b.content_type, "x-upsert": "true", "cache-control": "max-age=31536000" },
    body: bytes,
  });
  if (!r.ok) return json({ error: "storage", detail: await r.text() }, 502);
  return json({ ok: true, url: `${SB_URL}/storage/v1/object/public/artist-media/${path}` });
});
