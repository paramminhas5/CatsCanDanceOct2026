/**
 * On tour (Strays): who is playing where and when, and which dates are still open.
 *
 *   Hero      what this is in one line, Playing vs Open legend, post button
 *   Bar       sticky: Fans / Promoters view, city chips. Both kept in the URL (?view=fans|promoters&city=Goa)
 *   Fans      "Coming to your city": weeks ahead, artist by artist, Playing dates link to tickets, Follow
 *   Promoters "Open dates": free windows with Request to book, then acts already travelling
 *   Post      two kinds of post, one or more stops, goes to review
 *
 * Data comes from getStaticProps (pages/tour.tsx) through loadTourBoard(), so the list is in the HTML.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import FollowButton from "@/components/FollowButton";
import PostTourForm from "@/components/tour/PostTourForm";
import { todayIST } from "@/lib/nights";
import {
  addDays, bookUrl, connectUrl, dayParts, instagramUrl, weekLabel, weekStart, windowLabel,
  type TourKind, type TourStop,
} from "@/lib/tour";

export type TourProps = { stops: TourStop[]; live: boolean; updated: string };
type View = "fans" | "promoters";

const CITY_KEY = "ccd:tour-city";

const chip = (on: boolean) =>
  `shrink-0 font-display text-sm px-3 py-1.5 min-h-[38px] border-2 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-acid-yellow/60 ${
    on ? "bg-acid-yellow text-ink border-acid-yellow" : "bg-transparent text-cream border-cream/40 hover:border-cream"
  }`;

const kindLabel = (k: TourKind | null, src: TourStop["src"]) =>
  k === "touring" ? "Touring India" : k === "away" ? "Away from home" : src === "ccd" ? "On a CCD night" : "On the road";

type ActGroup = {
  key: string; name: string; slug: string | null; kind: TourKind | null; src: TourStop["src"]; home: string | null;
  genres: string[]; instagram: string | null; ra: string | null; spotify: string | null; note: string | null; stops: TourStop[];
};

function byAct(stops: TourStop[]): ActGroup[] {
  const m = new Map<string, ActGroup>();
  for (const s of stops) {
    const key = s.artist_slug ?? s.artist_name.toLowerCase();
    const g = m.get(key);
    if (g) {
      g.stops.push(s);
      g.kind = g.kind ?? s.kind;
      g.instagram = g.instagram ?? s.instagram; g.ra = g.ra ?? s.ra; g.spotify = g.spotify ?? s.spotify; g.note = g.note ?? s.note;
    } else {
      m.set(key, { key, name: s.artist_name, slug: s.artist_slug, kind: s.kind, src: s.src, home: s.home, genres: s.genres,
        instagram: s.instagram, ra: s.ra, spotify: s.spotify, note: s.note, stops: [s] });
    }
  }
  return [...m.values()];
}

const prettyName = (n: string) => (n === n.toUpperCase() && /[A-Z]/.test(n) ? n.toLowerCase().replace(/(^|[\s\-.])([a-z])/g, (_, a, b) => a + b.toUpperCase()) : n);

export default function Tour({ stops = [], live = false, updated = "" }: Partial<TourProps>) {
  const router = useRouter();
  const today = todayIST();
  const [view, setView] = useState<View>("fans");
  const [city, setCity] = useState("");

  // View and city live in the URL. A city picked before is remembered on this device.
  useEffect(() => {
    if (!router.isReady) return;
    const g = (k: string) => (typeof router.query[k] === "string" ? (router.query[k] as string) : "");
    if (g("view") === "promoters") setView("promoters");
    let c = g("city");
    if (!c) { try { c = localStorage.getItem(CITY_KEY) ?? ""; } catch {} }
    setCity(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  useEffect(() => {
    if (!router.isReady) return;
    const query: Record<string, string> = {};
    if (view !== "fans") query.view = view;
    if (city) query.city = city;
    try { city ? localStorage.setItem(CITY_KEY, city) : localStorage.removeItem(CITY_KEY); } catch {}
    router.replace({ pathname: "/tour", query, hash: undefined }, undefined, { shallow: true, scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, city]);

  const upcoming = useMemo(() => stops.filter((s) => s.to_date >= today), [stops, today]);
  const acts = useMemo(() => byAct(upcoming), [upcoming]);
  const openAll = useMemo(() => upcoming.filter((s) => s.state === "open"), [upcoming]);

  // City chips: cities with something on, by number of acts. A city from the URL stays even when empty.
  const cities = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const s of upcoming) {
      if (view === "promoters" && s.state === "playing" && !s.kind) continue;
      m.set(s.city, (m.get(s.city) ?? new Set()).add(s.artist_slug ?? s.artist_name));
    }
    const list = [...m.entries()].map(([c, set]) => [c, set.size] as [string, number]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (city && !m.has(city)) list.push([city, 0]);
    return list;
  }, [upcoming, view, city]);

  const inCity = (s: TourStop) => !city || s.city === city;
  const cityStops = upcoming.filter(inCity);

  const playing = upcoming.filter((s) => s.state === "playing");
  const jsonLd = [{
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Artists touring India and playing away from home",
    dateModified: updated || undefined,
    itemListElement: playing.slice(0, 50).map((s, i) => ({
      "@type": "ListItem", position: i + 1,
      item: {
        "@type": "MusicEvent",
        name: s.title ?? `${prettyName(s.artist_name)} in ${s.city}`,
        startDate: s.from_date,
        endDate: s.to_date !== s.from_date ? s.to_date : undefined,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: { "@type": "Place", name: s.venue ?? s.city, address: { "@type": "PostalAddress", addressLocality: s.city, addressCountry: "IN" } },
        performer: { "@type": "PerformingGroup", name: prettyName(s.artist_name), url: s.artist_slug ? `https://catscandance.com/artists/${s.artist_slug}` : undefined },
        url: s.ticket_url ? (s.ticket_url.startsWith("/") ? `https://catscandance.com${s.ticket_url}` : s.ticket_url) : undefined,
      },
    })),
  }];

  const cityCount = new Set(upcoming.map((s) => s.city)).size;
  const summary = acts.length
    ? `${acts.length} act${acts.length === 1 ? "" : "s"} on the road across ${cityCount} cit${cityCount === 1 ? "y" : "ies"}.`
    : "Acts touring India and Indian acts playing away from home.";

  return (
    <main className="bg-background text-ink min-h-screen" data-source={live ? "tour_board" : "fallback"}>
      <SEO
        title="On tour: who is playing where in India · Cats Can Dance"
        description={`${summary} See who is coming to your city, which dates are still open to book, and post your own tour dates.`}
        path="/tour"
        jsonLd={jsonLd}
      />
      <Nav />

      {/* HERO */}
      <section className="bg-electric-blue text-cream pt-28 md:pt-36 pb-8 md:pb-10">
        <div className="container">
          <p className="font-display text-acid-yellow text-lg md:text-xl mb-3">ON TOUR · STRAYS</p>
          <h1 className="font-display text-[3.4rem] sm:text-7xl md:text-9xl leading-[0.82]" style={{ filter: "drop-shadow(6px 6px 0 hsl(var(--ink)))" }}>
            WHO&apos;S PLAYING WHERE.
          </h1>
          <p className="mt-5 text-lg md:text-xl font-medium max-w-[52ch]">
            Acts touring India and Indian acts playing away from home, city by city. {acts.length ? summary : ""}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a href="#post" className="font-display text-lg px-5 py-3 border-4 border-ink bg-acid-yellow text-ink chunk-shadow hover:-translate-y-0.5 transition-transform">
              Post your tour dates
            </a>
            <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
              <div className="flex items-center gap-2"><dt><StateBadge state="playing" /></dt><dd>show booked</dd></div>
              <div className="flex items-center gap-2"><dt><StateBadge state="open" onDark /></dt><dd>free to book</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* BAR + LIST: the bar only sticks while the list is on screen */}
      <div>
      <div className="sticky top-[64px] md:top-[76px] z-30 bg-ink text-cream border-y-4 border-ink">
        <div className="container py-3 grid gap-2.5">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2" role="group" aria-label="Who is looking">
            {([
              ["fans", "Fans", "Coming to your city"],
              ["promoters", "Promoters", "Open dates"],
            ] as const).map(([k, who, label]) => (
              <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}
                className={`text-left px-3 py-1.5 border-2 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-acid-yellow/60 ${
                  view === k ? "bg-cream text-ink border-cream" : "border-cream/40 hover:border-cream"}`}>
                <span className={`block text-[11px] font-bold uppercase tracking-wider ${view === k ? "text-magenta" : "text-cream/60"}`}>{who}</span>
                <span className="block font-display text-base leading-tight">{label}</span>
              </button>
            ))}
          </div>
          {cities.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="group" aria-label="City">
              <button type="button" aria-pressed={!city} onClick={() => setCity("")} className={chip(!city)}>All cities</button>
              {cities.map(([c, n]) => (
                <button key={c} type="button" aria-pressed={city === c} onClick={() => setCity(city === c ? "" : c)} className={chip(city === c)}>
                  {c} <span className="opacity-60 tabular">{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container py-10 md:py-14">
        {view === "fans" ? (
          <FansView stops={cityStops} all={upcoming} city={city} today={today} onAllCities={() => setCity("")} />
        ) : (
          <PromotersView open={openAll.filter(inCity)} travelling={cityStops.filter((s) => s.state === "playing" && s.kind)} city={city} today={today} onAllCities={() => setCity("")} />
        )}
      </div>
      </div>

      {/* POST */}
      <section id="post" className="bg-acid-yellow border-y-4 border-ink py-14 md:py-20 scroll-mt-28">
        <div className="container grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-14 items-start">
          <div className="lg:sticky lg:top-[110px]">
            <p className="font-display text-ink text-lg mb-3">For artists</p>
            <h2 className="font-display text-ink text-5xl md:text-6xl leading-[0.9] mb-5">Post your tour dates.</h2>
            <p className="font-medium text-lg max-w-md">
              Touring India, or playing a city that is not home? Post where you will be. Fans in each city see you coming. Promoters see the dates you still have open.
            </p>
            <ExamplePost />
            <ol className="mt-6 grid gap-2 font-medium">
              <li><b>1.</b> Post your cities and dates, Playing or Open.</li>
              <li><b>2.</b> We check every post before it goes up.</li>
              <li><b>3.</b> Promoters ask for your open dates through CCD. Your email stays private.</li>
            </ol>
          </div>
          <PostTourForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}

// ── Fans ───────────────────────────────────────────────────────────────────
function FansView({ stops, all, city, today, onAllCities }: { stops: TourStop[]; all: TourStop[]; city: string; today: string; onAllCities: () => void }) {
  const weeks = useMemo(() => {
    const m = new Map<string, TourStop[]>();
    for (const s of stops) {
      const wk = weekStart(s.from_date > today ? s.from_date : today);
      m.set(wk, [...(m.get(wk) ?? []), s]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([wk, list]) => ({ wk, acts: byAct(list) }));
  }, [stops, today]);
  const actCount = new Set(stops.map((s) => s.artist_slug ?? s.artist_name)).size;

  return (
    <>
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <h2 className="font-display text-3xl md:text-5xl leading-none">{city ? `Coming to ${city}` : "Coming to India"}</h2>
        <p className="text-ink/70 tabular shrink-0">{actCount} act{actCount === 1 ? "" : "s"}</p>
      </div>
      <p className="text-ink/75 mb-8 max-w-[60ch]">{city ? "Pick another city in the bar above." : "Pick your city in the bar above."} Follow an act to get their new dates in your CCD feed.</p>

      {weeks.length === 0 ? (
        <Empty
          title={city ? `Nobody is posted for ${city} yet.` : "Nobody is on the road right now."}
          body="Follow acts you like on their profile and their new dates land in your feed. Know an act coming through? Send them this page so they can post."
        >
          {city && <button type="button" onClick={onAllCities} className="font-display px-5 py-3 border-4 border-ink bg-acid-yellow">See every city</button>}
          <Link href="/whats-on" className="font-display px-5 py-3 border-4 border-ink bg-cream">See what&apos;s on</Link>
        </Empty>
      ) : (
        <ol className="grid gap-12">
          {weeks.map(({ wk, acts }) => (
            <li key={wk}>
              <div className="flex items-baseline gap-3 border-b-4 border-ink pb-2 mb-5">
                <h3 className="font-display text-2xl md:text-3xl leading-none">{weekLabel(wk, today)}</h3>
                <p className="text-ink/65 font-bold text-sm">{windowLabel(wk, addDays(wk, 6))}</p>
              </div>
              <ul className="grid gap-4">
                {acts.map((g) => (
                  <ActCard key={g.key} g={g} city={city} trip={all.filter((s) => (s.artist_slug ?? s.artist_name.toLowerCase()) === g.key && !g.stops.includes(s))} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function ActCard({ g, city, trip }: { g: ActGroup; city: string; trip: TourStop[] }) {
  const first = dayParts(g.stops[0].from_date);
  return (
    <li className={`border-4 border-ink bg-cream ${g.stops.some((s) => s.state === "playing") ? "chunk-shadow" : ""}`}>
      <article className="p-5 md:p-6 grid gap-4 md:grid-cols-[96px_1fr_auto] md:gap-6">
        <div className="hidden md:block leading-none" aria-hidden>
          <p className="font-display text-base text-ink/65">{first.dow}</p>
          <p className="font-display text-5xl md:text-6xl tabular md:mt-1">{first.day}</p>
          <p className="font-display text-base">{first.month}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink/70">
            <KindTag kind={g.kind} src={g.src} />{g.home ? <> · from {g.home}</> : null}
          </p>
          <h4 className="font-display text-2xl md:text-3xl leading-[0.95] mt-1.5 break-words">
            {g.slug ? <Link href={`/artists/${g.slug}`} className="hover:text-electric-blue underline-offset-4 hover:underline">{prettyName(g.name)}</Link> : prettyName(g.name)}
          </h4>
          {g.genres.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Sounds">
              {g.genres.map((x) => <li key={x} className="text-xs font-bold px-2 py-0.5 border-2 border-ink">{x}</li>)}
            </ul>
          )}
          <ul className="mt-4 grid gap-2.5">
            {g.stops.map((s) => <StopLine key={s.id} s={s} showCity={!city} />)}
          </ul>
          {trip.length > 0 && (
            <p className="mt-3 text-sm text-ink/70">
              <span className="font-bold">Also on this trip:</span>{" "}
              {trip.slice(0, 5).map((s) => `${s.city} ${windowLabel(s.from_date, s.to_date)}${s.state === "open" ? " (open)" : ""}`).join(" · ")}
              {trip.length > 5 ? ` and ${trip.length - 5} more` : ""}
            </p>
          )}
        </div>
        <div className="flex md:flex-col md:items-end gap-2 flex-wrap">
          {g.slug ? <FollowButton artistSlug={g.slug} artistName={prettyName(g.name)} /> : <ActLinks g={g} />}
        </div>
      </article>
    </li>
  );
}

function StopLine({ s, showCity }: { s: TourStop; showCity: boolean }) {
  const internal = s.ticket_url?.startsWith("/");
  const label = s.src === "ccd" ? "Tickets" : s.ticket_url && s.url && s.ticket_url !== s.url ? "Tickets" : s.src === "post" ? "Tickets" : "Details";
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t-2 border-ink/15 pt-2.5">
      <StateBadge state={s.state} />
      <span className="font-display text-base">{windowLabel(s.from_date, s.to_date)}</span>
      {showCity && <span className="font-bold">{s.city}</span>}
      {s.state === "playing" ? (
        <>
          {s.venue && <span className="text-ink/80">{s.venue}</span>}
          {s.ticket_url && (internal ? (
            <Link href={s.ticket_url} className="ml-auto font-display text-sm px-3 py-1.5 border-4 border-ink bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors">{label}</Link>
          ) : (
            <a href={s.ticket_url} target="_blank" rel="noopener noreferrer" className="ml-auto font-display text-sm px-3 py-1.5 border-4 border-ink bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors">
              {label} <span aria-hidden>↗</span>
            </a>
          ))}
        </>
      ) : (
        <span className="text-sm text-ink/65">No show booked yet</span>
      )}
    </li>
  );
}

// ── Promoters ──────────────────────────────────────────────────────────────
function PromotersView({ open, travelling, city, today, onAllCities }: { open: TourStop[]; travelling: TourStop[]; city: string; today: string; onAllCities: () => void }) {
  const passing = useMemo(() => byAct(travelling), [travelling]);
  return (
    <>
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <h2 className="font-display text-3xl md:text-5xl leading-none">{city ? `Open dates in ${city}` : "Open dates"}</h2>
        <p className="text-ink/70 tabular shrink-0">{open.length} window{open.length === 1 ? "" : "s"}</p>
      </div>
      <p className="text-ink/75 mb-8 max-w-[60ch]">Nights artists have told us are free. Request to book and CCD passes it on.</p>

      {open.length === 0 ? (
        <Empty
          title={`No open dates${city ? ` in ${city}` : ""} yet.`}
          body={passing.length
            ? "Open dates show up here when touring acts post free nights. The acts below are already travelling and may add a date."
            : "Open dates show up here when touring acts post free nights. Tell us who you want and when, and we will ask around."}
        >
          {city && <button type="button" onClick={onAllCities} className="font-display px-5 py-3 border-4 border-ink bg-acid-yellow">See every city</button>}
          <a href="mailto:hello@catscandance.com?subject=Looking%20for%20an%20act" className="font-display px-5 py-3 border-4 border-ink bg-cream">Ask CCD to find an act</a>
        </Empty>
      ) : (
        <ul className="grid gap-4">
          {open.map((s) => <OpenRow key={s.id} s={s} showCity={!city} />)}
        </ul>
      )}

      {passing.length > 0 && (
        <section className="mt-14" aria-labelledby="passing-h">
          <h2 id="passing-h" className="font-display text-3xl md:text-4xl leading-none mb-2">{city ? `Passing through ${city}` : "Already travelling"}</h2>
          <p className="text-ink/75 mb-6 max-w-[60ch]">These acts have a show booked away from home. Ask for another night while they are here.</p>
          <ul className="grid md:grid-cols-2 gap-4">
            {passing.map((g) => {
              const last = g.stops[g.stops.length - 1];
              const ask = addDays(last.to_date, 1) > today ? addDays(last.to_date, 1) : today;
              const window = windowLabel(g.stops[0].from_date, last.to_date);
              return (
                <li key={g.key} className="border-4 border-ink bg-cream p-5 grid gap-3 content-start">
                  <div>
                    <p className="text-sm font-bold text-ink/70"><KindTag kind={g.kind} src={g.src} />{g.home ? <> · from {g.home}</> : null}</p>
                    <h3 className="font-display text-2xl leading-[0.95] mt-1.5">
                      {g.slug ? <Link href={`/artists/${g.slug}`} className="hover:text-electric-blue">{prettyName(g.name)}</Link> : prettyName(g.name)}
                    </h3>
                  </div>
                  <ul className="grid gap-1.5 text-sm">
                    {g.stops.map((s) => (
                      <li key={s.id} className="flex flex-wrap gap-x-2 items-center">
                        <StateBadge state="playing" small />
                        <span className="font-bold">{windowLabel(s.from_date, s.to_date)}</span>
                        <span>{[s.venue, s.city].filter(Boolean).join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {g.slug ? (
                      <Link href={bookUrl(g.slug, ask, last.city)} className="font-display px-4 py-2.5 border-4 border-ink bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors">Request to book</Link>
                    ) : (
                      <a href={connectUrl(prettyName(g.name), last.city, window)} className="font-display px-4 py-2.5 border-4 border-ink bg-acid-yellow">Ask CCD to connect you</a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-14 border-4 border-ink bg-cream p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div>
          <p className="font-display text-2xl leading-tight">Booking acts in India?</p>
          <p className="text-ink/75">Get your crew listed so artists know who to talk to in your city.</p>
        </div>
        <Link href="/promoters" className="font-display px-5 py-3 border-4 border-ink bg-acid-yellow self-start md:self-auto">For promoters</Link>
      </div>
    </>
  );
}

function OpenRow({ s, showCity }: { s: TourStop; showCity: boolean }) {
  const window = windowLabel(s.from_date, s.to_date);
  const g = byAct([s])[0];
  return (
    <li className="border-4 border-ink bg-cream">
      <article className="p-5 md:p-6 grid gap-4 md:grid-cols-[200px_1fr_auto] md:gap-6 md:items-center">
        <div>
          <StateBadge state="open" />
          <p className="font-display text-2xl md:text-3xl leading-none mt-2">{window}</p>
          {showCity && <p className="font-bold mt-1">{s.city}</p>}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink/70"><KindTag kind={s.kind} src={s.src} />{s.home ? <> · from {s.home}</> : null}</p>
          <h3 className="font-display text-2xl leading-[0.95] mt-1.5 break-words">
            {s.artist_slug ? <Link href={`/artists/${s.artist_slug}`} className="hover:text-electric-blue">{prettyName(s.artist_name)}</Link> : prettyName(s.artist_name)}
          </h3>
          {s.genres.length > 0 && <p className="text-sm mt-1 text-ink/75">{s.genres.join(", ")}</p>}
          {s.note && <p className="mt-2 text-ink/85">{s.note}</p>}
          <div className="mt-2"><ActLinks g={g} inline /></div>
        </div>
        <div className="flex md:flex-col md:items-end gap-2">
          {s.artist_slug ? (
            <Link href={bookUrl(s.artist_slug, s.from_date > todayIST() ? s.from_date : todayIST(), s.city)} className="font-display px-4 py-2.5 border-4 border-ink bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors">Request to book</Link>
          ) : (
            <a href={connectUrl(prettyName(s.artist_name), s.city, window)} className="font-display px-4 py-2.5 border-4 border-ink bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors">Ask CCD to connect you</a>
          )}
        </div>
      </article>
    </li>
  );
}

// ── Bits ───────────────────────────────────────────────────────────────────
function StateBadge({ state, small, onDark }: { state: "playing" | "open"; small?: boolean; onDark?: boolean }) {
  const size = small ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5";
  return state === "playing" ? (
    <span className={`inline-block font-display ${size} bg-magenta text-cream border-2 border-ink`}>PLAYING</span>
  ) : (
    <span className={`inline-block font-display ${size} border-2 ${onDark ? "bg-acid-yellow text-ink border-ink" : "bg-acid-yellow/40 text-ink border-ink border-dashed"}`}>OPEN</span>
  );
}

function KindTag({ kind, src }: { kind: TourKind | null; src: TourStop["src"] }) {
  return <span className={kind === "touring" ? "text-electric-blue" : kind === "away" ? "text-magenta" : ""}>{kindLabel(kind, src)}</span>;
}

function ActLinks({ g, inline }: { g: Pick<ActGroup, "instagram" | "ra" | "spotify" | "name">; inline?: boolean }) {
  const links = [
    g.instagram && { label: "Instagram", href: instagramUrl(g.instagram) },
    g.ra && { label: "RA", href: g.ra },
    g.spotify && { label: "Spotify", href: g.spotify.startsWith("http") ? g.spotify : `https://open.spotify.com/search/${encodeURIComponent(g.spotify)}` },
  ].filter(Boolean) as { label: string; href: string }[];
  if (!links.length) return null;
  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 ${inline ? "" : "md:justify-end"}`}>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm font-bold underline underline-offset-4 decoration-2 decoration-electric-blue hover:text-electric-blue">
          {l.label}<span className="sr-only"> for {g.name}</span>
        </a>
      ))}
    </div>
  );
}

function Empty({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="border-4 border-dashed border-ink/40 p-6 md:p-8 max-w-2xl">
      <p className="font-display text-2xl leading-tight mb-2">{title}</p>
      <p className="text-ink/75 mb-5">{body}</p>
      <div className="flex flex-wrap gap-3">
        {children}
        <a href="#post" className="font-display px-5 py-3 border-4 border-ink bg-cream">Post your tour dates</a>
      </div>
    </div>
  );
}

function ExamplePost() {
  const rows: [("playing" | "open"), string, string][] = [
    ["playing", "Bengaluru", "18 to 20 Nov"],
    ["playing", "Goa", "21 to 23 Nov"],
    ["open", "Mumbai", "24 to 30 Nov"],
  ];
  return (
    <figure className="mt-6 border-4 border-ink bg-cream p-4 max-w-md" aria-label="Example post">
      <figcaption className="text-xs font-bold uppercase tracking-wider text-ink/60">Example post</figcaption>
      <p className="mt-1 text-sm font-bold"><span className="text-electric-blue">Touring India</span> · from Berlin, Germany</p>
      <p className="font-display text-2xl leading-none mt-1">A Berlin act, 18 to 30 Nov</p>
      <ul className="mt-3 grid gap-1.5">
        {rows.map(([st, c, w]) => (
          <li key={c} className="flex items-center gap-3">
            <StateBadge state={st} small />
            <span className="font-bold w-24">{c}</span>
            <span className="text-ink/75">{w}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
