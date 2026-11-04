"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Act = (fd: FormData) => Promise<void>;

/** Staff upload: the file goes to the artist-media bucket with the staff member's own sign-in, then the link and rights are saved with a server action. */
export default function Uploader({ slug, action }: { slug: string; action: Act }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function pick(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMsg("Use JPG, PNG or WebP."); return; }
    if (file.size > 8 * 1024 * 1024) { setMsg("Over 8 MB."); return; }
    const { data } = await supabase.auth.getSession();
    if (!data.session) { setMsg("Sign in as staff on /me in this browser first, or paste a link below."); return; }
    setBusy(true); setMsg("");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${slug}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("artist-media").upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (up.error) { setMsg("Upload failed: " + up.error.message); return; }
    setUrl(supabase.storage.from("artist-media").getPublicUrl(path).data.publicUrl);
    setMsg("Uploaded. Fill in the rights and save.");
  }

  return (
    <details>
      <summary>Add a photo</summary>
      <form action={action} className="up">
        <input type="hidden" name="slug" value={slug} />
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
        <input name="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="or paste an https:// image link" required />
        <input name="author" placeholder="Photographer or credit" />
        <input name="license" placeholder="Licence or permission, e.g. Press kit, OK'd by artist" required />
        <input name="license_url" placeholder="Licence link (optional)" />
        <input name="source_url" placeholder="Where it came from (optional)" />
        <label><input type="checkbox" name="profile" /> use as profile photo</label>
        {msg && <span className="muted">{msg}</span>}
        <button type="submit" disabled={busy}>Save photo</button>
      </form>
    </details>
  );
}
