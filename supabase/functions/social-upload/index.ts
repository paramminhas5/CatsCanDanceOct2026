// social-upload: stores one Instagram slide image for a social_posts row.
// POST /functions/v1/social-upload?post=<id>&slot=<1-10>&key=<upload_key>
// Body: the image bytes (image/jpeg or image/png). Auth: the row's upload_key,
// which only SQL / the service role can read. Saves to artist-media/social/<id>/<slot>.jpg|png
// (public bucket, so Instagram can fetch it) and records the URL on the row.
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX = 8 * 1024 * 1024;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const u = new URL(req.url);
  const post = u.searchParams.get("post") ?? "";
  const slot = Number(u.searchParams.get("slot"));
  const key = u.searchParams.get("key") ?? "";
  if (!/^[a-z0-9-]{3,80}$/.test(post) || !Number.isInteger(slot) || slot < 1 || slot > 10 || !/^[0-9a-f-]{36}$/.test(key)) {
    return json({ error: "bad params" }, 400);
  }
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : null;
  if (!ext) return json({ error: "image/jpeg or image/png only" }, 415);
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX) return json({ error: "size" }, 413);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row, error } = await db.from("social_posts").select("id, upload_key, media").eq("id", post).maybeSingle();
  if (error) return json({ error: "lookup failed" }, 500);
  if (!row || !row.upload_key || row.upload_key !== key) return json({ error: "not allowed" }, 403);

  const objectPath = `social/${post}/${String(slot).padStart(2, "0")}.${ext}`;
  const up = await db.storage.from("artist-media").upload(objectPath, bytes, { contentType: type, upsert: true, cacheControl: "60" });
  if (up.error) return json({ error: "upload failed", detail: up.error.message }, 500);
  const url = db.storage.from("artist-media").getPublicUrl(objectPath).data.publicUrl;

  const media = (Array.isArray(row.media) ? row.media : []).filter((m: { slot: number }) => m.slot !== slot);
  media.push({ slot, url });
  media.sort((a: { slot: number }, b: { slot: number }) => a.slot - b.slot);
  await db.from("social_posts").update({ media, updated_at: new Date().toISOString() }).eq("id", post);
  return json({ url });
});
