import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";

type TourDate = { id: string; artist_slug: string; artist_name: string; city: string; from_date: string; to_date: string; note: string | null };
type Promoter = { slug: string; name: string; city: string | null; blurb: string | null; genres: string[]; instagram: string | null; website: string | null };

const fmt = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const field = "w-full bg-cream border-4 border-ink px-3 py-2 font-medium focus:outline-none focus:ring-4 focus:ring-electric-blue";

const Tour = () => {
  const [dates, setDates] = useState<TourDate[] | null>(null);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.from("touring_now").select("*").order("from_date").then(({ data }) => setDates((data as TourDate[]) ?? []));
    supabase.from("promoters").select("slug,name,city,blurb,genres,instagram,website").order("name").then(({ data }) => setPromoters((data as Promoter[]) ?? []));
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("company")) { setState("done"); return; }
    setState("busy"); setErr("");
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    const { error } = await supabase.rpc("submit_dates", {
      p_artist_name: v("name"), p_email: v("email"), p_city: v("city"),
      p_from: v("from"), p_to: v("to"), p_note: v("note"),
    });
    if (error) { setErr(error.message); setState("idle"); return; }
    setState("done");
  };

  return (
    <>
      <SEO
        title="Tour — who is touring where in India | Cats Can Dance"
        description="See which artists are passing through your city and when. Artists post their dates, promoters book them."
        path="/tour"
      />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <PageHero eyebrow="TOUR" title="WHO'S COMING THROUGH." bg="bg-orange" textColor="text-cream" eyebrowColor="text-ink">
          <p className="text-cream font-medium text-lg max-w-xl">
            Artists post the cities and dates they are free. Promoters see who is passing through and book them.
          </p>
          <a href="#post" className="inline-block mt-6 bg-ink text-cream font-display px-6 py-3 border-4 border-ink chunk-shadow hover:-translate-y-0.5 transition-transform">
            POST YOUR DATES →
          </a>
        </PageHero>

        <section className="container py-6 md:py-8">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Tour" }]} />
        </section>

        <section className="container pb-16">
          <p className="font-display text-magenta text-base md:text-lg mb-3">/ COMING THROUGH</p>
          <h2 className="font-display text-ink text-3xl md:text-5xl mb-8">NEXT 60 DAYS.</h2>
          {dates === null ? (
            <div className="border-4 border-ink bg-cream h-32 animate-pulse" aria-hidden />
          ) : dates.length === 0 ? (
            <div className="border-4 border-ink bg-cream p-8 chunk-shadow">
              <p className="font-display text-2xl mb-2">NOTHING POSTED YET.</p>
              <p className="font-medium">Be the first. Post your dates below and promoters will see them.</p>
            </div>
          ) : (
            <div className="border-4 border-ink bg-cream chunk-shadow divide-y-4 divide-ink">
              {dates.map((d) => (
                <div key={d.id} className="grid md:grid-cols-[180px_1fr_auto] gap-2 md:gap-6 p-4 md:p-5 items-center">
                  <p className="font-display text-magenta">{fmt(d.from_date)} – {fmt(d.to_date)}</p>
                  <p><span className="font-display text-xl">{d.artist_name}</span> <span className="font-bold">· {d.city}</span>{d.note && <span className="text-muted-foreground"> · {d.note}</span>}</p>
                  <Link href={`/litter/${d.artist_slug}#book`} className="font-display text-sm bg-acid-yellow border-4 border-ink px-4 py-2 hover:-translate-y-0.5 transition-transform text-center">BOOK →</Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="post" className="bg-acid-yellow border-y-4 border-ink py-14 md:py-20">
          <div className="container grid md:grid-cols-2 gap-10">
            <div>
              <p className="font-display text-ink text-base md:text-lg mb-3">/ ARTISTS</p>
              <h2 className="font-display text-ink text-3xl md:text-5xl mb-4">POST TOUR DATES.</h2>
              <p className="font-medium max-w-md">One city and one window per post, up to 60 days. Post again for each city. Dates drop off once they pass. We check every post before it shows.</p>
            </div>
            {state === "done" ? (
              <p className="bg-ink text-cream font-display text-xl p-6 border-4 border-ink chunk-shadow self-start">Received. We check it and it goes up on Tour.</p>
            ) : (
              <form onSubmit={submit} className="grid gap-3 bg-cream border-4 border-ink p-5 chunk-shadow">
                <input name="name" required placeholder="Artist name" className={field} />
                <input name="email" type="email" required placeholder="Email (private)" className={field} />
                <input name="city" required placeholder="City" className={field} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-display">FROM<input name="from" type="date" required className={field} /></label>
                  <label className="text-xs font-display">TO<input name="to" type="date" required className={field} /></label>
                </div>
                <input name="note" placeholder="Note for promoters (club nights, B2B, afters)" className={field} />
                <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0" />
                {err && <p className="text-magenta font-bold">{err}</p>}
                <button disabled={state === "busy"} className="bg-ink text-cream font-display px-6 py-3 border-4 border-ink chunk-shadow hover:-translate-y-0.5 transition-transform disabled:opacity-60">
                  {state === "busy" ? "SENDING…" : "POST DATES →"}
                </button>
              </form>
            )}
          </div>
        </section>

        {promoters.length > 0 && (
          <section className="container py-16">
            <p className="font-display text-magenta text-base md:text-lg mb-3">/ PROMOTERS</p>
            <h2 className="font-display text-ink text-3xl md:text-5xl mb-8">WHO BOOKS IN INDIA.</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {promoters.map((p) => (
                <article key={p.slug} className="border-4 border-ink bg-cream p-5 chunk-shadow flex flex-col gap-3">
                  <h3 className="font-display text-xl">{p.name}</h3>
                  {p.city && <p className="font-bold">{p.city}</p>}
                  {p.blurb && <p className="text-sm">{p.blurb}</p>}
                  <div className="flex flex-wrap gap-2">
                    {p.genres.slice(0, 4).map((g) => <span key={g} className="text-xs font-bold border-2 border-ink px-2 py-0.5 uppercase">{g}</span>)}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    {p.instagram && <a className="font-display text-xs border-4 border-ink px-3 py-1.5 hover:bg-acid-yellow" target="_blank" rel="noreferrer" href={p.instagram.startsWith("http") ? p.instagram : `https://instagram.com/${p.instagram.replace(/^@/, "")}`}>INSTAGRAM</a>}
                    {p.website && <a className="font-display text-xs border-4 border-ink px-3 py-1.5 hover:bg-acid-yellow" target="_blank" rel="noreferrer" href={p.website}>WEBSITE</a>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        <Footer />
      </main>
    </>
  );
};

export default Tour;
