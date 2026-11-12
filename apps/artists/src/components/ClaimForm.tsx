"use client";
/** The claim form. One call to submit_artist; the database throttles and checks the honeypot. */
import { useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";

export default function ClaimForm({ slug }: { slug: string }) {
  const [kind, setKind] = useState<"claim" | "add">("claim");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (String(fd.get("website") ?? "")) { setState("done"); return; }
    const v = (k: string) => String(fd.get(k) ?? "").trim() || null;
    setState("busy"); setErr(null);
    const { data, error } = await supabaseBrowser().rpc("submit_artist", {
      p_kind: kind === "add" ? "new" : "claim", p_artist_slug: kind === "claim" ? v("slug") : null, p_name: v("name"), p_email: v("email"), p_city: v("city"),
      p_genres: v("genres"), p_instagram: v("instagram"), p_soundcloud: v("soundcloud"), p_mix_url: null, p_bio: v("note"),
    });
    const d = data as { ok?: boolean; error?: string } | null;
    if (error || (d && d.ok === false)) { setErr(d?.error ?? error?.message ?? "Could not send. Try again."); setState("idle"); return; }
    setState("done");
  };
  if (state === "done") {
    return (
      <div role="status" className="grid gap-3">
        <span className="k-m" style={{ color: "var(--k-pc)" }}>Sent</span>
        <h2 className="k-d m-0 text-[36px]">Thanks. We will check and write back.</h2>
        <p className="k-b m-0">Usually within a day, to the email you gave. Then sign in with that email to open your page.</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div role="radiogroup" aria-label="What do you want to do" className="flex gap-2">
        {(["claim", "add"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className="k-keycap flex-1" data-on={kind === k}>{k === "claim" ? "Claim my page" : "Add a missing artist"}</button>
        ))}
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {kind === "claim" && <label className="k-label">Your page <small>the part after artists.catscandance.com/</small><input className="k-field" name="slug" defaultValue={slug} pattern="[a-z0-9-]{1,80}" required /></label>}
      <label className="k-label">Artist name<input className="k-field" name="name" required maxLength={120} /></label>
      <label className="k-label">Email <small>we write back here</small><input className="k-field" type="email" name="email" required autoComplete="email" maxLength={200} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="k-label">City<input className="k-field" name="city" maxLength={60} /></label>
        <label className="k-label">Instagram <small>or a SoundCloud link below</small><input className="k-field" name="instagram" placeholder="@handle" maxLength={80} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {kind === "add" && <label className="k-label">Sound<input className="k-field" name="genres" placeholder="House, techno" maxLength={120} /></label>}
        <label className="k-label">SoundCloud or Spotify<input className="k-field" name="soundcloud" maxLength={200} /></label>
      </div>
      <label className="k-label">How we can tell it is you <small>optional</small><textarea className="k-field" name="note" maxLength={800} placeholder="DM us from the artist Instagram, or tell us your management contact." /></label>
      {err && <p className="k-note k-note--warn m-0" role="alert">{err}</p>}
      <button type="submit" className="k-btn k-btn--key k-btn--l" disabled={state === "busy"}>{state === "busy" ? "Sending" : kind === "claim" ? "Claim this page" : "Add the artist"}</button>
    </form>
  );
}
