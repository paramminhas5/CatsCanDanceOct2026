import { useState } from "react";
import { useRouter } from "next/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { useMember, memberRpc } from "@/lib/member";

const CITIES = ["Bengaluru", "Mumbai", "Delhi NCR", "Goa", "Pune", "Hyderabad", "Chennai", "Kolkata"];
const GENRES = ["Techno", "House", "Disco", "Drum & Bass", "Jungle", "Garage", "Ambient", "Hip-Hop", "Experimental"];
const inp = "w-full border-4 border-ink bg-cream p-3 text-ink";

export default function Join() {
  const router = useRouter();
  const { loading, signedIn, member, reload } = useMember();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [wantArtist, setWantArtist] = useState(false);
  const [wantHost, setWantHost] = useState(false);
  const [wantPromoter, setWantPromoter] = useState(false);
  const [link, setLink] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/join` } });
    if (error) setMsg("Could not send the link. Try again in a minute."); else setSent(true);
  }

  const [pw, setPw] = useState("");
  async function signInPw(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setMsg("Wrong email or password."); else { await reload(); router.push("/club"); }
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    const r = await memberRpc("join_member", { p_name: name, p_city: city, p_genres: genres });
    if (!r.ok) return setMsg(r.error ?? "Something went wrong.");
    // Any page or application already waiting for this email is handed over by the join trigger.
    const isUrlOrHandle = link.trim();
    if (wantArtist) {
      const a = await memberRpc("become_artist", { p_name: name, p_city: city, p_genres: genres.join(", "), p_instagram: isUrlOrHandle || null, p_soundcloud: null, p_mix_url: null });
      if (!a.ok && !(a.data as any)?.slug) setMsg(a.error ?? "Joined, but the artist page needs a link. Add it in your club page.");
    }
    if (wantHost) await memberRpc("become_host", {});
    if (wantPromoter) await memberRpc("become_promoter", { p_name: name, p_city: city, p_instagram: isUrlOrHandle || null, p_bio: null });
    await reload();
    router.push("/club");
  }

  return (
    <>
      <SEO title="Join the Cats Can Dance club" description="Join for a feed of nights in your city, the artists you follow, and who else is going." path="/join" />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <PageHero eyebrow="CLUB · JOIN" title="JOIN THE CLUB." bg="bg-hot-red" textColor="text-cream" eyebrowColor="text-acid-yellow">
          <p className="text-cream font-medium text-lg max-w-xl">A feed of nights in your city and the artists you follow. See who is going. Host your own night.</p>
        </PageHero>
        <section className="container py-12 max-w-xl">
          {loading ? null : member ? (
            <p className="font-display uppercase">You are in. <a className="underline" href="/club">Go to the club</a>.</p>
          ) : signedIn ? (
            <form onSubmit={finish} className="grid gap-4 border-4 border-ink p-6 bg-cream chunk-shadow">
              <p className="font-display uppercase">One more step</p>
              <input className={inp} placeholder="Name (shown only if you choose)" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
              <select className={inp} value={city} onChange={(e) => setCity(e.target.value)} required>
                <option value="">Your city</option>
                {CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button type="button" key={g} onClick={() => setGenres((x) => x.includes(g) ? x.filter((y) => y !== g) : [...x, g])}
                    className={`font-display text-xs uppercase px-3 py-2 border-2 border-ink ${genres.includes(g) ? "bg-ink text-cream" : "bg-cream text-ink"}`}>{g}</button>
                ))}
              </div>
              <fieldset className="grid gap-2 border-2 border-ink p-3">
                <legend className="font-display text-xs uppercase px-1">Also, do you</legend>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wantArtist} onChange={(e) => setWantArtist(e.target.checked)} /> Make or play music? Get an artist page.</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wantHost} onChange={(e) => setWantHost(e.target.checked)} /> Host nights?</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wantPromoter} onChange={(e) => setWantPromoter(e.target.checked)} /> Promote events?</label>
                {(wantArtist || wantPromoter) && <input className={inp} placeholder="Instagram handle or link" value={link} onChange={(e) => setLink(e.target.value)} required={wantArtist} />}
                <p className="text-xs text-ink/60">If we already have a page or application for your email, it is linked to you now. You can add any of these later from your club page.</p>
              </fieldset>
              <button className="font-display uppercase px-5 py-3 border-4 border-ink bg-acid-yellow text-ink">Join</button>
              {msg && <p className="text-sm text-red-600">{msg}</p>}
            </form>
          ) : sent ? (
            <p className="border-4 border-ink p-6 font-display uppercase">Check your email for the sign in link.</p>
          ) : (
            <form onSubmit={sendLink} className="grid gap-4 border-4 border-ink p-6 bg-cream chunk-shadow">
              <input className={inp} type="email" required placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="font-display uppercase px-5 py-3 border-4 border-ink bg-acid-yellow text-ink">Email me a sign in link</button>
              <p className="text-xs text-ink/60">No password. We only use your email to sign you in and to tell you about nights you asked for.</p>
              {msg && <p className="text-sm text-red-600">{msg}</p>}
              <details className="text-sm">
                <summary className="cursor-pointer font-display uppercase">CCD team sign in</summary>
                <div className="grid gap-2 mt-3">
                  <input className={inp} type="password" placeholder="Password (team accounts only)" value={pw} onChange={(e) => setPw(e.target.value)} />
                  <button type="button" onClick={signInPw} className="font-display uppercase px-4 py-2 border-4 border-ink bg-cream text-ink">Sign in with password</button>
                </div>
              </details>
            </form>
          )}
        </section>
        <Footer />
      </main>
    </>
  );
}
