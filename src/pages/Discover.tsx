/**
 * Find (Prowl): the scene calendar. One job: find a night this week, in your city, and go.
 *
 *   Hero      count of nights and cities, one line on how listings are checked
 *   Filters   sticky bar: city, when, type, genre, search, saved. Kept in the URL so a filtered view can be shared.
 *   From us   CCD's next Episode, pinned
 *   Agenda    nights grouped by day, with tickets, save, calendar and Litter artist links
 *   Below     Pass it on, send a night, then compact links to the city, sound and origin guides
 *
 * Data comes in through getStaticProps (pages/discover.tsx), so the list is in the HTML for search engines.
 */
import { track } from "@/lib/track";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PassItOn from "@/components/PassItOn";
import { CITY_SCENES, GLOBAL_SCENES, GENRE_PAGES } from "@/content/scenes";
import { dayStamp, inWhen, kindLabel, SOURCE_LABEL, type FindEvent, type Kind, type When } from "@/lib/find";
import { displayTime, googleCalendarUrl, todayIST } from "@/lib/nights";
import Going from "@/components/going/Going";
import { type Crowd, crowdLine, loadCrowd, sceneKey, useMe } from "@/lib/plans";

export type FindProps = {
  events: FindEvent[];
  ours: { slug: string; title: string; event_date: string | null; date: string | null; venue: string | null; city: string | null; start_time: string | null } | null;
  updated: string;
};

const WHEN: { key: When; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "tonight", label: "Tonight" },
  { key: "weekend", label: "This weekend" },
  { key: "week", label: "Next 7 days" },
];
const SAVED_KEY = "ccd:saved-nights";

const chip = (on: boolean) =>
  `shrink-0 font-display text-sm px-3 py-1.5 min-h-[38px] border-2 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-acid-yellow/60 ${
    on ? "bg-acid-yellow text-ink border-acid-yellow" : "bg-transparent text-cream border-cream/40 hover:border-cream"
  }`;

export default function DiscoverPage({ events = [], ours = null, updated = "" }: Partial<FindProps>) {
  const router = useRouter();
  const today = todayIST();
  const [city, setCity] = useState("");
  const [when, setWhen] = useState<When>("all");
  const [kind, setKind] = useState<Kind>("all");
  const [genre, setGenre] = useState("");
  const [q, setQ] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);

  // Filters live in the URL: read once on load, write back on change.
  useEffect(() => {
    if (!router.isReady) return;
    const g = (k: string) => (typeof router.query[k] === "string" ? (router.query[k] as string) : "");
    setCity(g("city"));
    if (["tonight", "weekend", "week", "all"].includes(g("when"))) setWhen(g("when") as When);
    if (["club", "big"].includes(g("type"))) setKind(g("type") as Kind);
    setGenre(g("genre"));
    setQ(g("q"));
    try { setSaved(JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]")); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  useEffect(() => {
    if (!router.isReady) return;
    const query: Record<string, string> = {};
    if (city) query.city = city;
    if (when !== "all") query.when = when;
    if (kind !== "all") query.type = kind;
    if (genre) query.genre = genre;
    if (q.trim()) query.q = q.trim();
    const t = setTimeout(() => router.replace({ pathname: "/whats-on", query }, undefined, { shallow: true, scroll: false }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, when, kind, genre, q]);

  const toggleSave = (id: string) => {
    const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
  };

  const upcoming = useMemo(() => events.filter((e) => !e.event_date || e.event_date >= today), [events, today]);
  const cities = useMemo(() => countBy(upcoming.map((e) => e.city ?? "").filter(Boolean)), [upcoming]);
  const genres = useMemo(() => countBy(upcoming.flatMap((e) => e.genres ?? [])), [upcoming]);
  const kinds = new Set(upcoming.map((e) => (e.kind === "club" ? "club" : "big")));

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return upcoming.filter((e) =>
      (!city || e.city === city) &&
      inWhen(e, when, today) &&
      (kind === "all" || (kind === "club" ? e.kind === "club" : e.kind !== "club")) &&
      (!genre || (e.genres ?? []).includes(genre)) &&
      (!savedOnly || saved.includes(e.id)) &&
      (!needle || [e.title, e.venue, e.city, ...(e.lineup ?? []), ...(e.genres ?? []), ...e.artists.map((a) => a.name)].join(" ").toLowerCase().includes(needle)),
    ).sort((a, b) => (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999") || Number(b.featured) - Number(a.featured));
  }, [upcoming, city, when, kind, genre, q, savedOnly, saved, today]);

  // Who's going: one call for every night on the page.
  const [crowd, setCrowd] = useState<Record<string, Crowd>>({});
  useEffect(() => { track("find_night", { shared: !!router.query.n }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const sharedId = router.isReady && typeof router.query.n === "string" ? router.query.n : "";
  const shared = sharedId ? events.find((e) => e.id === sharedId) ?? null : null;
  const me = useMe();
  const keysSig = upcoming.map((e) => e.id).join(",");
  const refreshCrowd = () => { loadCrowd(upcoming.map((e) => sceneKey(e.id))).then(setCrowd).catch(() => {}); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refreshCrowd(); }, [keysSig]);
  const goingCount = Object.values(me.plans).filter((p) => p.state === "going").length;

  const days = useMemo(() => {
    const m = new Map<string, FindEvent[]>();
    for (const e of shown) m.set(e.event_date ?? "tba", [...(m.get(e.event_date ?? "tba") ?? []), e]);
    return [...m.entries()];
  }, [shown]);

  const filtered = !!(city || when !== "all" || kind !== "all" || genre || q.trim() || savedOnly);
  const reset = () => { setCity(""); setWhen("all"); setKind("all"); setGenre(""); setQ(""); setSavedOnly(false); };
  const showOurs = ours && (!city || city === ours.city) && inWhen(ours, when, today) && !savedOnly && !q.trim();

  const summary = upcoming.length
    ? `${upcoming.length} night${upcoming.length > 1 ? "s" : ""} across ${cities.length} cit${cities.length > 1 ? "ies" : "y"}, checked by hand before they go up.`
    : "Underground and electronic nights across India, checked by hand before they go up.";

  const jsonLd = [{
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Underground and electronic music nights in India",
    dateModified: updated || undefined,
    itemListElement: upcoming.slice(0, 50).map((e, i) => ({
      "@type": "ListItem", position: i + 1,
      item: {
        "@type": "MusicEvent", name: e.title,
        startDate: e.event_date ?? undefined,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: { "@type": "Place", name: e.venue ?? e.city ?? "India", address: { "@type": "PostalAddress", addressLocality: e.city ?? undefined, addressCountry: "IN" } },
        performer: [...(e.lineup ?? []), ...e.artists.map((a) => a.name)].slice(0, 10).map((n) => ({ "@type": "PerformingGroup", name: n })),
        url: e.ticket_url ?? e.url,
      },
    })),
  }];

  return (
    <main className="bg-background text-ink min-h-screen">
      <SEO
        title="What's on: underground and electronic nights in India · Cats Can Dance"
        description={`${summary} House, techno, garage, jungle and more in Bengaluru, Mumbai, Delhi, Goa and beyond.`}
        path="/whats-on"
        jsonLd={jsonLd}
      />
      <Nav />

      {/* HERO */}
      <section className="bg-electric-blue text-cream pt-28 md:pt-36 pb-8 md:pb-10">
        <div className="container">
          <p className="font-bold text-acid-yellow mb-3">What&apos;s on · the gig guide</p>
          <h1 className="font-display text-6xl sm:text-7xl md:text-9xl leading-[0.82]" style={{ filter: "drop-shadow(6px 6px 0 hsl(var(--ink)))" }}>
            FIND A NIGHT.
          </h1>
          <p className="mt-5 text-lg md:text-xl font-medium max-w-[46ch]">{summary}</p>
        </div>
      </section>

      {/* A night someone shared with you sits on top */}
      {shared && (
        <section className="bg-acid-yellow border-b-4 border-ink py-6 md:py-8">
          <div className="container">
            <p className="font-display text-sm uppercase tracking-[0.14em] mb-3">Shared with you</p>
            <ul><NightCard e={shared} saved={saved.includes(shared.id)} onSave={() => toggleSave(shared.id)} crowd={crowd[sceneKey(shared.id)]} onPlan={refreshCrowd} /></ul>
          </div>
        </section>
      )}

      {/* FILTERS */}
      <div className="sticky top-[64px] md:top-[76px] z-30 bg-ink text-cream border-y-4 border-ink">
        <div className="container py-3 grid gap-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="group" aria-label="When">
            {WHEN.map((w) => (
              <button key={w.key} type="button" aria-pressed={when === w.key} onClick={() => setWhen(w.key)} className={chip(when === w.key)}>{w.label}</button>
            ))}
            <span className="w-px h-6 bg-cream/25 shrink-0 mx-1" aria-hidden />
            <button type="button" aria-pressed={savedOnly} aria-label={`Show saved nights${saved.length ? ` (${saved.length})` : ""}`} onClick={() => setSavedOnly(!savedOnly)} className={chip(savedOnly)}>
              Saved{saved.length ? ` ${saved.length}` : ""}
            </button>
            {goingCount > 0 && <Link href="/me" className={chip(false)}>Going {goingCount}</Link>}
            <label className="ml-auto shrink-0 hidden md:flex items-center border-2 border-cream/40 focus-within:border-acid-yellow">
              <span className="sr-only">Search nights</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search artist, venue, sound"
                className="bg-transparent px-3 py-1.5 w-64 text-cream placeholder:text-cream/50 focus:outline-none" />
              {q && <button type="button" onClick={() => setQ("")} className="px-2 text-cream/70 hover:text-cream" aria-label="Clear search">×</button>}
            </label>
          </div>
          {(cities.length > 1 || kinds.size > 1 || genres.length > 1) && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="group" aria-label="City, type and sound">
              {cities.length > 1 && (<>
                <button type="button" aria-pressed={!city} onClick={() => setCity("")} className={chip(!city)}>All cities</button>
                {cities.map(([c, n]) => (
                  <button key={c} type="button" aria-pressed={city === c} onClick={() => setCity(city === c ? "" : c)} className={chip(city === c)}>
                    {c} <span className="opacity-60 tabular">{n}</span>
                  </button>
                ))}
              </>)}
              {kinds.size > 1 && (<>
                <span className="w-px h-6 bg-cream/25 shrink-0 mx-1" aria-hidden />
                <button type="button" aria-pressed={kind === "club"} onClick={() => setKind(kind === "club" ? "all" : "club")} className={chip(kind === "club")}>Club nights</button>
                <button type="button" aria-pressed={kind === "big"} onClick={() => setKind(kind === "big" ? "all" : "big")} className={chip(kind === "big")}>Concerts and festivals</button>
              </>)}
              {genres.length > 1 && (<>
                <span className="w-px h-6 bg-cream/25 shrink-0 mx-1" aria-hidden />
                {genres.slice(0, 10).map(([g]) => (
                  <button key={g} type="button" aria-pressed={genre === g} onClick={() => setGenre(genre === g ? "" : g)} className={chip(genre === g)}>{g}</button>
                ))}
              </>)}
            </div>
          )}
          <label className="md:hidden flex items-center border-2 border-cream/40 focus-within:border-acid-yellow">
            <span className="sr-only">Search nights</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search artist, venue, sound" inputMode="search"
              className="bg-transparent px-3 py-2 w-full text-cream placeholder:text-cream/50 focus:outline-none" />
            {q && <button type="button" onClick={() => setQ("")} className="px-3 text-cream/70" aria-label="Clear search">×</button>}
          </label>
        </div>
      </div>

      <div className="container py-10 md:py-14">
        {/* FROM US */}
        {showOurs && ours && (
          <Link href={`/nights/${ours.slug}`} className="group block mb-12 border-4 border-ink bg-magenta text-cream chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform">
            <div className="grid md:grid-cols-[180px_1fr_auto] gap-4 md:gap-8 items-center p-5 md:p-7">
              <DayBlock iso={ours.event_date} today={today} tone="ours" />
              <div className="min-w-0">
                <p className="font-bold text-acid-yellow mb-1">From us</p>
                <p className="font-display text-4xl md:text-5xl leading-[0.85]">Cats Can Dance {ours.title}</p>
                <p className="mt-2 font-bold">{[ours.venue, ours.city].filter(Boolean).join(", ")}{displayTime(ours.start_time) ? ` · ${displayTime(ours.start_time)}` : ""}</p>
              </div>
              <span className="justify-self-start md:justify-self-end font-display text-lg px-5 py-3 border-4 border-ink bg-acid-yellow text-ink">Get tickets</span>
            </div>
          </Link>
        )}

        {/* AGENDA */}
        <div className="flex items-baseline justify-between gap-4 mb-6">
          <h2 className="font-display text-3xl md:text-5xl leading-none">
            {savedOnly ? "Your saved nights" : city ? `In ${city}` : "Across India"}
          </h2>
          <p className="text-ink/70 tabular shrink-0">{shown.length} night{shown.length === 1 ? "" : "s"}</p>
        </div>

        {shown.length === 0 ? (
          <div className="border-4 border-dashed border-ink/40 p-6 md:p-8 max-w-2xl">
            <p className="font-display text-2xl leading-tight mb-2">
              {savedOnly ? "Nothing saved yet." : `Nothing ${when === "tonight" ? "tonight" : when === "weekend" ? "this weekend" : when === "week" ? "in the next 7 days" : "listed"}${city ? ` in ${city}` : ""}${genre ? ` for ${genre}` : ""}${q.trim() ? ` matching "${q.trim()}"` : ""}.`}
            </p>
            <p className="text-ink/75 mb-5">{savedOnly ? "Tap Save on any night to keep it here. Saved nights stay on this device." : "We only list nights we've checked, so some weeks are quiet."}</p>
            <div className="flex flex-wrap gap-3">
              {filtered && <button type="button" onClick={reset} className="font-display px-5 py-3 border-4 border-ink bg-acid-yellow">Show every night</button>}
              <Link href="/submit-event/event" className="font-display px-5 py-3 border-4 border-ink bg-cream">Send us a night</Link>
            </div>
          </div>
        ) : (
          <ol className="grid gap-10">
            {days.map(([iso, list]) => (
              <li key={iso} className="grid md:grid-cols-[180px_1fr] gap-4 md:gap-8">
                <div className="md:sticky md:top-[200px] self-start">
                  <DayBlock iso={iso === "tba" ? null : iso} today={today} />
                </div>
                <ul className="grid gap-4">
                  {list.map((e) => (
                    <NightCard key={e.id} e={e} saved={saved.includes(e.id)} onSave={() => toggleSave(e.id)} crowd={crowd[sceneKey(e.id)]} onPlan={refreshCrowd} />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-14 border-4 border-ink bg-cream p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <p className="font-display text-2xl leading-tight">Know a night we missed?</p>
            <p className="text-ink/75">Send it in. We check every listing by hand before it goes up.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/submit-event/event" className="font-display px-5 py-3 border-4 border-ink bg-acid-yellow">Send a night</Link>
            <Link href="/promoters" className="font-display px-5 py-3 border-4 border-ink bg-cream">For promoters</Link>
          </div>
        </div>
      </div>

      <div className="border-t-4 border-ink"><PassItOn /></div>

      {/* GUIDES */}
      <section className="bg-ink text-cream border-t-4 border-ink py-14 md:py-20">
        <div className="container grid gap-12 grid-cols-[minmax(0,1fr)] md:grid-cols-3">
          <GuideList title="Cities" note="Where to go, who runs it, what it sounds like." items={CITY_SCENES.map((c) => ({ href: `/scene/${c.slug}`, label: c.name, sub: c.tagline }))} />
          <GuideList title="Sounds" note="Each sound explained, with starter tracks." items={GENRE_PAGES.map((g) => ({ href: `/genres/${g.slug}`, label: g.name, sub: `${g.bpm} BPM` }))} />
          <GuideList title="Where it started" note="The scenes behind the music in India's clubs." items={GLOBAL_SCENES.map((s) => ({ href: `/scenes/${s.slug}`, label: s.name, sub: `${s.city}, ${s.decade}` }))} />
        </div>
      </section>

      <Footer />
    </main>
  );
}

function countBy(xs: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function DayBlock({ iso, today, tone }: { iso: string | null; today: string; tone?: "ours" }) {
  const s = dayStamp(iso, today);
  const hot = s.label === "Tonight" || s.label === "Tomorrow";
  return (
    <div className="flex md:block items-baseline gap-3 leading-none">
      <p className={`font-display text-lg md:text-xl ${tone === "ours" ? "text-acid-yellow" : hot ? "text-magenta" : "text-ink/70"}`}>{s.label}</p>
      <p className="font-display text-5xl md:text-7xl tabular md:mt-1">{s.day}</p>
      <p className="font-display text-lg md:text-xl">{s.month}</p>
    </div>
  );
}

function NightCard({ e, saved, onSave, crowd, onPlan }: { e: FindEvent; saved: boolean; onSave: () => void; crowd?: Crowd; onPlan: () => void }) {
  const me = useMe();
  const line = crowdLine(crowd, me.plans[sceneKey(e.id)]?.state ?? null);
  const href = e.ticket_url || e.url;
  const cal = googleCalendarUrl({ slug: e.id, title: e.title, event_date: e.event_date, venue: e.venue, city: e.city }, { time: e.event_time, url: href });
  const lineup = (e.lineup ?? []).filter((n) => !e.artists.some((a) => a.name.toLowerCase() === n.toLowerCase()));
  return (
    <li className={`border-4 border-ink bg-cream ${e.featured ? "chunk-shadow" : ""}`}>
      <article className="p-5 md:p-6 grid gap-3 md:grid-cols-[1fr_auto] md:gap-6">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink/70">
            {kindLabel(e.kind)}{e.event_time ? ` · ${displayTime(e.event_time) ?? e.event_time}` : ""}{e.featured ? <span className="ml-2 text-magenta">Our pick</span> : null}
          </p>
          <h3 title={e.title} className={`font-display ${e.title.length > 55 ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"} leading-[0.95] mt-1 break-words line-clamp-3`}>{e.title}</h3>
          <p className="mt-2 font-bold">{[e.venue, e.city].filter(Boolean).join(", ") || "Venue to be announced"}</p>
          {(e.artists.length > 0 || lineup.length > 0) && (
            <p className="mt-2 text-ink/85">
              {e.artists.map((a, i) => (
                <span key={a.slug}>
                  {i > 0 && ", "}
                  <Link href={`/artists/${a.slug}`} className="font-bold underline underline-offset-4 decoration-2 decoration-electric-blue hover:text-electric-blue">{a.name}</Link>
                </span>
              ))}
              {e.artists.length > 0 && lineup.length > 0 && ", "}
              {lineup.slice(0, 8).join(", ")}{lineup.length > 8 ? ` and ${lineup.length - 8} more` : ""}
            </p>
          )}
          {e.genres && e.genres.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Sounds">
              {e.genres.slice(0, 4).map((g) => <li key={g} className="text-xs font-bold px-2 py-0.5 border-2 border-ink">{g}</li>)}
            </ul>
          )}
          {line && <p className="mt-3 text-sm font-bold text-electric-blue">{line}</p>}
        </div>
        <div className="flex md:flex-col md:items-end gap-2 flex-wrap">
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="font-display px-4 py-2.5 border-4 border-ink bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors">
            {e.ticket_url ? "Tickets" : "Details"} <span aria-hidden>↗</span>
          </a>
          <Going nightKey={sceneKey(e.id)} title={e.title} crowd={crowd} onChange={onPlan} />
          <button type="button" onClick={onSave} aria-pressed={saved} aria-label={saved ? `Saved: ${e.title}. Remove` : `Save ${e.title}`}
            className={`font-display text-sm px-3 py-2 border-2 border-ink transition-colors ${saved ? "bg-ink text-cream" : "bg-cream hover:bg-acid-yellow"}`}>
            {saved ? "Saved" : "Save"}
          </button>
          {cal && <a href={cal} target="_blank" rel="noopener noreferrer" className="text-sm font-bold underline underline-offset-4 self-center md:self-end py-1.5">Add to calendar</a>}
          <p className="text-xs text-ink/55 self-center md:self-end w-full md:w-auto md:text-right">via {SOURCE_LABEL[e.source] ?? e.source}</p>
        </div>
      </article>
    </li>
  );
}

function GuideList({ title, note, items }: { title: string; note: string; items: { href: string; label: string; sub?: string }[] }) {
  return (
    <div>
      <h2 className="font-display text-3xl leading-none mb-2">{title}</h2>
      <p className="text-cream/70 mb-5">{note}</p>
      <ul className="border-t-2 border-cream/20">
        {items.map((it) => (
          <li key={it.href} className="border-b-2 border-cream/20">
            <Link href={it.href} className="flex items-baseline justify-between gap-3 py-3 hover:text-acid-yellow focus:outline-none focus-visible:text-acid-yellow">
              <span className="font-display text-lg leading-tight min-w-0 break-words">{it.label}</span>
              {it.sub && <span className="text-sm text-cream/60 text-right truncate max-w-[50%]">{it.sub}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

