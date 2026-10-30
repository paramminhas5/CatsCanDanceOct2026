import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

const field = "w-full bg-cream text-ink border-4 border-ink px-3 py-2 font-medium focus:outline-none focus:ring-4 focus:ring-electric-blue";

/** Add yourself to the Litter, or claim an existing profile. Staff review in /ops. */
export default function ArtistSubmitForm() {
  const router = useRouter();
  const [kind, setKind] = useState<"new" | "claim">("new");
  const [slug, setSlug] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");

  // /for-artists?claim=<slug> opens the claim tab with the profile filled in.
  useEffect(() => {
    const c = router.query.claim;
    if (typeof c === "string" && c) { setKind("claim"); setSlug(c); }
  }, [router.query.claim]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("company")) { setState("done"); return; }
    setState("busy"); setErr("");
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    const { error } = await supabase.rpc("submit_artist", {
      p_kind: kind,
      p_artist_slug: kind === "claim" ? slug.trim() || null : null,
      p_name: v("name"), p_email: v("email"), p_city: v("city"), p_genres: v("genres"),
      p_instagram: v("instagram"), p_soundcloud: v("soundcloud"), p_mix_url: v("mix"), p_bio: v("bio"),
    });
    if (error) { setErr(error.message); setState("idle"); return; }
    setState("done");
  };

  if (state === "done") {
    return (
      <p className="bg-ink text-cream font-display text-xl p-6 border-4 border-ink chunk-shadow">
        Received. We check every profile by hand and email you when it is live.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 bg-cream border-4 border-ink p-5 chunk-shadow text-ink">
      <div className="grid grid-cols-2 gap-3">
        {(["new", "claim"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`font-display text-sm px-3 py-2 border-4 border-ink ${kind === k ? "bg-ink text-cream" : "bg-cream hover:bg-acid-yellow"}`}
          >
            {k === "new" ? "ADD ME" : "CLAIM MY PROFILE"}
          </button>
        ))}
      </div>
      {kind === "claim" && (
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          placeholder="Your profile link name, e.g. djazz (from /litter/djazz)"
          className={field}
        />
      )}
      <input name="name" required placeholder="Artist name" className={field} />
      <input name="email" type="email" required placeholder="Email (private)" className={field} />
      <div className="grid grid-cols-2 gap-3">
        <input name="city" placeholder="Based in" className={field} />
        <input name="genres" placeholder="Genres, comma separated" className={field} />
      </div>
      <input name="instagram" placeholder="Instagram link or @handle" className={field} />
      <div className="grid grid-cols-2 gap-3">
        <input name="soundcloud" placeholder="SoundCloud link" className={field} />
        <input name="mix" placeholder="A mix we can listen to" className={field} />
      </div>
      <textarea name="bio" rows={3} maxLength={1200} placeholder="One short paragraph about you" className={field} />
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0" />
      <p className="text-xs font-medium text-ink/60">Add at least one link: Instagram, SoundCloud or a mix.</p>
      {err && <p className="text-magenta font-bold">{err}</p>}
      <button
        disabled={state === "busy"}
        className="bg-ink text-cream font-display px-6 py-3 border-4 border-ink chunk-shadow hover:-translate-y-0.5 transition-transform disabled:opacity-60"
      >
        {state === "busy" ? "SENDING..." : kind === "new" ? "SEND MY PROFILE →" : "SEND CLAIM →"}
      </button>
    </form>
  );
}
