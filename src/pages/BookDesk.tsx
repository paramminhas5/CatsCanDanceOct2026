/**
 * Book (/book): the artist booking desk.
 *
 *   Hero      date + city first, like any booking site
 *   Filters   sticky ink bar: budget, act type, sound, search. All kept in the URL.
 *   Results   free that date first, then no gig listed, then has a gig. Each card says why.
 *   Tray      pick up to 3 artists, then one night brief goes to each
 *   Below     how it works for organisers and for artists
 *
 * Data comes from getStaticProps (pages/book.tsx). No prices are invented: rates only show when
 * an artist set one in their booking settings.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useLenis } from "lenis/react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import ArtistListing from "@/components/booking/ArtistListing";
import RequestDrawer from "@/components/booking/RequestDrawer";
import { todayIST } from "@/lib/nights";
import { ACT_FILTERS, BUDGETS, DESK_CITIES, dayShort, isIsoDay, normCity, rankArtists, toMini, type Brief, type DeskArtist, type Ranked } from "@/lib/desk";
import { ARTISTS_BASE, ARTIST_DESK, BOOKINGS_BASE } from "@/lib/routes";

export type BookDeskProps = { artists: DeskArtist[]; live: boolean; updated: string };

const chip = (on: boolean) =>
  `shrink-0 font-display text-sm px-3 py-1.5 min-h-[38px] border-2 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-acid-yellow/60 ${
    on ? "bg-acid-yellow text-ink border-acid-yellow" : "bg-transparent text-cream border-cream/40 hover:border-cream"
  }`;
const EMPTY: Brief = { date: "", city: "", budget: "", act: "", sound: "", q: "" };

export default function BookDesk({ artists = [], live = false }: Partial<BookDeskProps>) {
  const router = useRouter();
  const lenis = useLenis();
  const today = todayIST();
  const [brief, setBrief] = useState<Brief>(EMPTY);
  const [draft, setDraft] = useState({ date: "", city: "" });
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [showBusy, setShowBusy] = useState(false);
  const [hint, setHint] = useState("");

  // Brief lives in the URL: read once, write back on change.
  useEffect(() => {
    if (!router.isReady) return;
    const g = (k: string) => (typeof router.query[k] === "string" ? (router.query[k] as string) : "");
    const b: Brief = {
      date: isIsoDay(g("date")) && g("date") >= today ? g("date") : "",
      city: g("city").slice(0, 60), budget: BUDGETS.some((x) => x.key === g("budget")) ? g("budget") : "",
      act: ACT_FILTERS.some((x) => x.key === g("act")) ? g("act") : "", sound: g("sound").slice(0, 40), q: g("q").slice(0, 60),
    };
    setBrief(b);
    setDraft({ date: b.date, city: b.city });
    const p = g("pick").split(",").filter((s) => artists.some((a) => a.slug === s)).slice(0, 3);
    if (p.length) setPicked(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  useEffect(() => {
    if (!router.isReady) return;
    const query: Record<string, string> = {};
    (Object.keys(brief) as (keyof Brief)[]).forEach((k) => { if (brief[k].trim()) query[k] = brief[k].trim(); });
    const t = setTimeout(() => router.replace({ pathname: "/book", query }, undefined, { shallow: true, scroll: false }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief]);

  const ranked = useMemo(() => rankArtists(artists, brief, today), [artists, brief, today]);
  const groups = useMemo(() => {
    const by = (g: Ranked["group"]) => ranked.filter((r) => r.group === g);
    return { free: by("free"), clear: [...by("clear"), ...by("all")], busy: by("busy") };
  }, [ranked]);
  const sounds = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of artists) for (const g of a.genres) m.set(g, (m.get(g) ?? 0) + 1);
    return [...m.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([g]) => g);
  }, [artists]);
  const cityList = useMemo(() => {
    const s = new Set(DESK_CITIES);
    for (const a of artists) for (const w of a.windows) { const c = normCity(w.city); if (c) s.add(c); }
    return [...s];
  }, [artists]);

  const pickedArtists = picked.map((s) => artists.find((a) => a.slug === s)).filter(Boolean) as DeskArtist[];
  const toggle = (slug: string) => {
    setHint("");
    setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : p.length >= 3 ? p : [...p, slug]));
  };
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.date && !draft.city) { setHint("Pick a date and a city to see who is free first."); return; }
    setHint("");
    setBrief({ ...brief, date: draft.date, city: draft.city.trim() });
    const el = document.getElementById("results");
    if (el && lenis) lenis.scrollTo(el, { offset: -150 });
    else if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 150, behavior: "smooth" });
  };
  const filtered = !!(brief.budget || brief.act || brief.sound || brief.q);
  const resetFilters = () => setBrief({ ...brief, budget: "", act: "", sound: "", q: "" });
  const city = normCity(brief.city) ?? brief.city;
  const when = brief.date ? dayShort(brief.date) : "";

  return (
    <main className="bg-background text-ink min-h-screen">
      <SEO
        title="Book an artist: DJs, live acts, bands and VJs in India · Cats Can Dance"
        description="Pick a date and a city and see which underground and electronic artists are free first. Send one night brief to up to 3 artists. No fee to ask."
        path="/book"
        keywords="book dj india, book live electronic act, hire dj bengaluru, hire dj mumbai, book artist delhi, underground music booking"
      />
      <Nav />

      {/* HERO */}
      <section className="bg-electric-blue text-cream pt-28 md:pt-36 pb-10 md:pb-14">
        <div className="container">
          <h1 className="font-display text-6xl sm:text-7xl md:text-9xl leading-[0.82]" style={{ filter: "drop-shadow(6px 6px 0 hsl(var(--ink)))" }}>
            BOOK AN ARTIST.
          </h1>
          <p className="mt-5 text-lg md:text-xl font-medium max-w-[50ch]">
            {artists.length} DJs, live acts, bands and VJs. Tell us the date and the city and we show who is free first. Send one brief to up to 3 of them.
          </p>

          <form onSubmit={search} className="mt-8 max-w-3xl border-4 border-ink bg-cream text-ink chunk-shadow grid sm:grid-cols-[1fr_1fr_auto]" role="search" aria-label="Find artists by date and city">
            <label className="grid gap-1 px-4 py-3 border-b-4 sm:border-b-0 sm:border-r-4 border-ink">
              <span className="text-xs font-bold uppercase tracking-widest">When</span>
              <input type="date" min={today} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="bg-transparent text-lg font-bold focus:outline-none w-full" aria-label="Date of the night" />
            </label>
            <label className="grid gap-1 px-4 py-3 border-b-4 sm:border-b-0 sm:border-r-4 border-ink">
              <span className="text-xs font-bold uppercase tracking-widest">Where</span>
              <input list="desk-cities" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="City"
                className="bg-transparent text-lg font-bold focus:outline-none w-full placeholder:text-ink/40" aria-label="City" />
              <datalist id="desk-cities">{cityList.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <button className="font-display text-xl px-6 py-4 bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors">Search</button>
          </form>
          {hint && <p className="mt-3 font-bold" role="status">{hint}</p>}
        </div>
      </section>

      {/* FILTERS */}
      <div className="sticky top-[64px] md:top-[76px] z-30 bg-ink text-cream border-y-4 border-ink">
        <div className="container py-3 grid gap-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="group" aria-label="Budget and act">
            {BUDGETS.map((b) => (
              <button key={b.key || "any"} type="button" aria-pressed={brief.budget === b.key} onClick={() => setBrief({ ...brief, budget: b.key })} className={chip(brief.budget === b.key)}>{b.label}</button>
            ))}
            <span className="w-px h-6 bg-cream/25 shrink-0 mx-1" aria-hidden />
            {ACT_FILTERS.map((x) => (
              <button key={x.key || "any"} type="button" aria-pressed={brief.act === x.key} onClick={() => setBrief({ ...brief, act: x.key })} className={chip(brief.act === x.key)}>{x.label}</button>
            ))}
            <label className="ml-auto shrink-0 hidden md:flex items-center border-2 border-cream/40 focus-within:border-acid-yellow">
              <span className="sr-only">Search artists</span>
              <input value={brief.q} onChange={(e) => setBrief({ ...brief, q: e.target.value })} placeholder="Search"
                className="bg-transparent px-3 py-1.5 w-32 xl:w-48 text-cream placeholder:text-cream/50 focus:outline-none" />
              {brief.q && <button type="button" onClick={() => setBrief({ ...brief, q: "" })} className="px-2 text-cream/70 hover:text-cream" aria-label="Clear search">×</button>}
            </label>
          </div>
          {sounds.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="group" aria-label="Sound">
              <button type="button" aria-pressed={!brief.sound} onClick={() => setBrief({ ...brief, sound: "" })} className={chip(!brief.sound)}>Any sound</button>
              {sounds.map((g) => (
                <button key={g} type="button" aria-pressed={brief.sound.toLowerCase() === g.toLowerCase()} onClick={() => setBrief({ ...brief, sound: brief.sound.toLowerCase() === g.toLowerCase() ? "" : g })} className={chip(brief.sound.toLowerCase() === g.toLowerCase())}>{g}</button>
              ))}
            </div>
          )}
          <label className="md:hidden flex items-center border-2 border-cream/40 focus-within:border-acid-yellow">
            <span className="sr-only">Search artists</span>
            <input value={brief.q} onChange={(e) => setBrief({ ...brief, q: e.target.value })} placeholder="Search name or sound" inputMode="search"
              className="bg-transparent px-3 py-2 w-full text-cream placeholder:text-cream/50 focus:outline-none" />
            {brief.q && <button type="button" onClick={() => setBrief({ ...brief, q: "" })} className="px-3 text-cream/70" aria-label="Clear search">×</button>}
          </label>
        </div>
      </div>

      {/* RESULTS */}
      <div id="results" className="container py-10 md:py-14 scroll-mt-40">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
          <h2 className="font-display text-3xl md:text-5xl leading-none">
            {brief.date && city ? `${when} in ${city}` : brief.date ? `On ${when}` : city ? `For ${city}` : "Every artist"}
          </h2>
          <p className="text-ink/70 tabular">
            {ranked.length} artist{ranked.length === 1 ? "" : "s"}
            {(brief.date || brief.city) && <button type="button" onClick={() => { setBrief({ ...brief, date: "", city: "" }); setDraft({ date: "", city: "" }); }} className="ml-3 font-bold underline underline-offset-4">Clear date and city</button>}
          </p>
        </div>

        {!brief.date && (
          <p className="mb-8 border-4 border-ink bg-acid-yellow px-4 py-3 font-bold max-w-2xl">Pick a date above and the artists free that night move to the top.</p>
        )}

        {ranked.length === 0 ? (
          <div className="border-4 border-dashed border-ink/40 p-6 md:p-8 max-w-2xl">
            <p className="font-display text-2xl leading-tight mb-2">No artists match these filters.</p>
            <p className="text-ink/75 mb-5">Most artists have not set a rate yet, so budget only hides those who did. Try another sound or act type.</p>
            {filtered && <button type="button" onClick={resetFilters} className="font-display px-5 py-3 border-4 border-ink bg-acid-yellow">Clear filters</button>}
          </div>
        ) : (
          <div className="grid gap-14">
            {brief.date && (
              groups.free.length > 0
                ? <Section title={`Free on ${when}`} note="They marked the day open, or are touring your city then." list={groups.free} picked={picked} toggle={toggle} />
                : <p className="border-l-4 border-electric-blue pl-3 text-ink/80 max-w-2xl -mb-6"><b>Nobody has marked {when} open yet.</b> Artists fill in their calendars as they join, so for now ask and they confirm.</p>
            )}
            <Section
              title={brief.date ? `No gig listed on ${when}` : ""}
              note={brief.date ? "We know of no gig for them that night. Ask and they confirm." : ""}
              list={groups.clear} picked={picked} toggle={toggle}
            />
            {groups.busy.length > 0 && (
              <div>
                <button type="button" onClick={() => setShowBusy(!showBusy)} aria-expanded={showBusy} className="font-display text-2xl md:text-3xl leading-none underline underline-offset-8 decoration-4 decoration-magenta">
                  {showBusy ? "Hide" : "Show"} {groups.busy.length} with a gig that night
                </button>
                {showBusy && <div className="mt-6"><Section title="" note="" list={groups.busy} picked={picked} toggle={toggle} /></div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* HOW IT WORKS */}
      <section className="bg-ink text-cream border-t-4 border-ink py-14 md:py-20">
        <div className="container grid gap-12 grid-cols-[minmax(0,1fr)] md:grid-cols-2">
          <div>
            <h2 className="font-display text-4xl leading-none mb-6">If you are booking</h2>
            <ol className="grid gap-4">
              {[
                ["Date and city first", "We show who is free that night, who plays your city, and who fits the sound."],
                ["One brief, up to 3 artists", "Date, venue, room size, set length, budget and other acts. Each artist gets their own thread."],
                ["Answers in the thread", "Interested, a counter offer with a fee or set, or a no with a reason."],
                ["Accept, then confirmed", "You accept the terms, the artist confirms, and you get a receipt you can print."],
              ].map(([t, d], i) => (
                <li key={t} className="grid grid-cols-[auto_1fr] gap-4 items-baseline">
                  <span className="font-display text-3xl text-acid-yellow tabular">{i + 1}</span>
                  <span><b className="font-display text-xl block leading-tight">{t}</b><span className="text-cream/75">{d}</span></span>
                </li>
              ))}
            </ol>
            <Link href={BOOKINGS_BASE} className="inline-block mt-8 font-display px-5 py-3 border-4 border-cream text-cream hover:bg-cream hover:text-ink">Your requests</Link>
          </div>
          <div>
            <h2 className="font-display text-4xl leading-none mb-6">If you play</h2>
            <ul className="grid gap-3 text-cream/85">
              <li><b className="text-cream">Your calendar.</b> Mark days open, booked or playing. Open days put you at the top for that date.</li>
              <li><b className="text-cream">Your terms.</b> Rate from per format, minimum notice, cities you travel to, travel terms and rider basics.</li>
              <li><b className="text-cream">Fit at a glance.</b> Every request shows room size, budget against your rate, venue and notice.</li>
              <li><b className="text-cream">Accept, counter or decline.</b> With saved replies. Below a budget you set, requests decline themselves.</li>
              <li><b className="text-cream">Verified.</b> Claim your page and you get the Verified mark.</li>
            </ul>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href={ARTIST_DESK} className="font-display px-5 py-3 border-4 border-ink bg-acid-yellow text-ink hover:bg-cream">Your booking desk</Link>
              <Link href={ARTISTS_BASE} className="font-display px-5 py-3 border-4 border-cream text-cream hover:bg-cream hover:text-ink">All artists</Link>
            </div>
            {!live && <p className="mt-4 text-sm text-cream/60">Calendars, counters and threads switch on with the next database update. Requests work now.</p>}
          </div>
        </div>
      </section>

      <Footer />

      {/* TRAY */}
      {picked.length > 0 && !open && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-ink text-cream border-t-4 border-acid-yellow">
          <div className="container py-3 flex items-center gap-3">
            <ul className="flex -space-x-2 shrink-0" aria-hidden>
              {pickedArtists.map((a) => (
                <li key={a.slug}>{a.photo_url ? <img src={a.photo_url} alt="" className="w-10 h-10 object-cover border-2 border-cream" /> : <span className="w-10 h-10 border-2 border-cream bg-electric-blue font-display grid place-items-center">{a.name.slice(0, 1)}</span>}</li>
              ))}
            </ul>
            <p className="min-w-0 flex-1 text-sm leading-tight">
              <b className="hidden sm:block truncate">{pickedArtists.map((a) => a.name).join(", ")}</b>
              <span className="sm:text-cream/70 font-bold sm:font-normal whitespace-nowrap">{picked.length} of 3 picked</span>
            </p>
            <button type="button" onClick={() => setPicked([])} className="hidden sm:block text-sm font-bold underline underline-offset-4">Clear</button>
            <button type="button" onClick={() => setOpen(true)} className="font-display px-4 sm:px-6 py-3 border-4 border-acid-yellow bg-acid-yellow text-ink hover:bg-cream shrink-0"><span className="sm:hidden">Send brief</span><span className="hidden sm:inline">Request to book</span></button>
          </div>
        </div>
      )}
      {picked.length > 0 && <div className="h-20" aria-hidden />}

      <RequestDrawer
        open={open}
        onClose={() => setOpen(false)}
        artists={pickedArtists.map(toMini)}
        onRemove={(s) => setPicked((p) => p.filter((x) => x !== s))}
        initial={{ date: brief.date, city: brief.city ? (normCity(brief.city) ?? brief.city) : "", budget: brief.budget }}
      />
    </main>
  );

}

function Section({ title, note, list, picked, toggle }: { title: string; note: string; list: Ranked[]; picked: string[]; toggle: (s: string) => void }) {
  return (
    <section>
      {title && <h3 className="font-display text-2xl md:text-3xl leading-none">{title} <span className="text-ink/50 tabular">{list.length}</span></h3>}
      {note && <p className="mt-2 mb-6 text-ink/70">{note}</p>}
      {list.length > 0 && (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <ArtistListing key={r.a.slug} a={r.a} reasons={r.reasons} rate={r.rate} selected={picked.includes(r.a.slug)} disabled={picked.length >= 3} onToggle={() => toggle(r.a.slug)} />
          ))}
        </ul>
      )}
    </section>
  );
}
