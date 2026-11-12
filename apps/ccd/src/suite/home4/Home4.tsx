/**
 * catscandance.com home, v4.1 (Param, 12 Nov 2026, night: "the artist thing shows up on every product when I click,
 * it should only be the product"; "the bento gets confusing"; "make it nice and clean and beautiful").
 *
 * Picking an app changes everything below the tiles. Each app gets: its colour stage, one thing you can use right
 * there (Nights: our next Episode and this week's ring; Artists: real artist pages and records; Host: a live invite
 * you type into; School: a beat you can program), then six features as one clean list where every row opens the
 * real screen. No made-up people, no example tags. The other three apps close the page.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { posterSvg } from "@ccd/ui";
import { PRODUCTS, productLink, type ProductId } from "@ccd/brand";
import type { HomeData } from "@/lib/home";
import Shell from "@/suite/Shell";
import { dayLabel, city } from "@/suite/bits";
import Carousel3D, { type RingNight } from "@/suite/home2/Carousel3D";
import { CSS as RING_CSS } from "@/suite/home2/home2.css";
import { CSS } from "./home4.css";

type Tab = "go" | "artists" | "host" | "learn";
const ORDER: Tab[] = ["go", "artists", "host", "learn"];
const ID: Record<Tab, ProductId> = { go: "ccd", artists: "artists", host: "gate", learn: "school" };
const ON = (k: Tab) => (k === "go" ? "#fff" : "#0a0a0c");
const SUB: Record<Tab, string> = { go: "What's on, crews, tickets", artists: "Every record, every show", host: "Page, tickets, door, report", learn: "Make music on a real instrument" };
const DAY = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "");
const DAYS_TO = (iso: string | null | undefined, today: string) => (iso ? Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5) : null);

type Stage = { eye: string; h: string; line: string; cta: [string, string]; ghost: [string, string]; glance: [string, string][]; shots: [string, string]; cat: string };
type Feature = [title: string, line: string, href: string];

export default function Home4(d: HomeData) {
  const [tab, setTab] = useState<Tab>("go");
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("for");
    if (f === "artists" || f === "host" || f === "learn") { setTab(f); setAuto(false); }
  }, []);
  // The stage rotates through the four apps until someone picks one.
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setTab((x) => ORDER[(ORDER.indexOf(x) + 1) % 4]), 8000);
    return () => clearTimeout(t);
  }, [auto, tab]);
  const pick = (k: Tab, scroll = false) => {
    setTab(k); setAuto(false);
    const u = new URL(window.location.href);
    if (k === "go") u.searchParams.delete("for"); else u.searchParams.set("for", k);
    window.history.replaceState(null, "", u.toString());
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = d.next;
  const nextDate = next?.event_date ?? null;
  const until = DAYS_TO(nextDate, d.today);
  // This week's ring holds only nights in the next seven days. Our own next Episode gets its own card above it.
  const ring: RingNight[] = d.week.slice(0, 12).map((n) => {
    const lineup = (n.lineup ?? []).filter(Boolean);
    const names = lineup.length ? lineup : n.artists.map((a) => a.name);
    return { key: n.id, title: n.title, href: n.ticket_url ?? n.url, external: true, img: n.image_url ?? null, poster: posterSvg({ title: n.title, lineup: names, venue: n.venue, city: city(n.city), date: n.event_date, time: n.event_time }), day: DAY(n.event_date), venue: n.venue ?? "", city: city(n.city), lineup: names, tag: n.event_date === d.today ? "Tonight" : (n.genres ?? [])[0] ?? null, when: dayLabel(n.event_date) };
  });

  const STAGE: Record<Tab, Stage> = {
    go: { eye: "Nights", h: "Every good night in your city.", line: "Nights picked by people who go out, who else is going, and a crew if you're going solo.", cta: ["See what's on", "/whats-on"], ghost: ["How it works", "/nights"], glance: [[String(d.weekCount), "nights this week"], ["3 to 6", "people per crew"], ["1", "place for your tickets"]], shots: ["S34-Discover", "S34-Night"], cat: "dance" },
    artists: { eye: "Artists", h: "Every artist worth knowing, on one page.", line: `${d.artistCount} South Asian artists. Every record you can play, every show with a source, and booking with a contract.`, cta: ["Find an artist", productLink("artists", "/artists")], ghost: ["Book for a date", productLink("artists", "/artists?mode=book")], glance: [[String(d.artistCount), "artists"], ["Every", "record playable"], ["Signed", "by both sides"]], shots: ["A40-Artist", "F38-A-Page"], cat: "dj" },
    host: { eye: "Host", h: "Throw the party people talk about on Monday.", line: "Your page, tickets, lineup, door and numbers in one app. The door works with no signal.", cta: ["Make a party, free", productLink("gate", "/make")], ghost: ["Everything it does", productLink("gate", "/")], glance: [["60s", "to a live page"], ["0", "bars of signal needed"], ["₹0", "for free parties"]], shots: ["H39-Make", "H39-Door"], cat: "yellow" },
    learn: { eye: "School", h: "Make the track. Then hear it in the club.", line: "Short lessons on a real instrument in your browser. Each one adds a part to a track that's yours.", cta: ["Start lesson 1", productLink("school", "/learn")], ghost: ["How School works", productLink("school", "/")], glance: [["Free", "first lesson"], ["0", "downloads"], ["Yours", "the track you make"]], shots: ["W35-Lesson", "W35-Lesson"], cat: "pink" },
  };

  const FEATURES: Record<Tab, Feature[]> = {
    go: [
      ["What's on", "Every night this week worth leaving the house for, by day.", "/whats-on"],
      ["Who's going", "See who's in, and which of them you know.", "/nights"],
      ["Crews", "Going alone? Meet three to six people before the night.", "/nights"],
      ["Your tickets", "Bought here or anywhere else. All of them in one place.", "/me"],
      ["Our Episodes", "The nights we throw ourselves, and every one so far.", next ? `/nights/${next.slug}` : "/nights"],
      ["The club", "Members get first entry, the founding pass and points.", "/club"],
    ],
    artists: [
      ["Find an artist", "Search by name, city, sound or label.", productLink("artists", "/artists")],
      ["Book for a date", "See who's free, send an offer in their range.", productLink("artists", "/artists?mode=book")],
      ["Contracts", "Drafted in the thread, signed by both sides, deposit included.", productLink("artists", "/bookings")],
      ["On tour", "Artists coming to India, and Indian artists in your city.", productLink("artists", "/tour")],
      ["Follow", "Hear first when they announce a date near you.", productLink("artists", "/following")],
      ["Claim your page", "Is it you? Your page is already made. Make it yours.", productLink("artists", "/claim")],
    ],
    host: [
      ["Make a party", "A page that looks like your night, live in a minute.", productLink("gate", "/make")],
      ["Guest list", "RSVPs, plus-ones and regulars, approved in one tap.", productLink("gate", "/guests")],
      ["Book the lineup", "Find artists free on your date and book them.", productLink("gate", "/book")],
      ["Gear", "Decks, sound and lights from people near you.", productLink("gate", "/gear")],
      ["The door", "Any phone scans tickets, even with no signal.", productLink("gate", "/door")],
      ["Promote", "Your promoter page and every party you've thrown.", productLink("gate", "/promote")],
    ],
    learn: [
      ["Lesson 1", "Start with a kick drum. It's free.", productLink("school", "/learn")],
      ["Your track", "Every lesson adds a part. Save it, change it, start another.", productLink("school", "/learn")],
      ["The studio", "Play the instrument freely, outside the lessons.", productLink("school", "/studio")],
      ["Take it to Live", "Export what you made and keep going in Ableton.", productLink("school", "/")],
    ],
  };

  const s = STAGE[tab];
  const colour = PRODUCTS[ID[tab]].colour;

  const nav = (
    <header className="k-nav">
      <div className="k-wrap k-nav__row">
        <a href="/" className="k-nav__brand"><img src="/ccd-logo.png" alt="" width={30} height={30} style={{ objectFit: "contain", filter: "invert(1)" }} />Cats Can Dance</a>
        <span className="k-nav__gap" />
        <a href="/me" className="k-btn k-btn--ghost k-btn--s">Your account</a>
      </div>
      <nav aria-label="What do you want to do?" className="k-wrap h4-tiles">
        {ORDER.map((k) => {
          const p = PRODUCTS[ID[k]];
          return (
            <button key={k} type="button" className="k-tile" onClick={() => pick(k)} aria-pressed={tab === k} style={{ ["--c" as string]: p.colour, ["--on" as string]: ON(k) }}>
              <i aria-hidden="true" /><span><b>{p.verb}</b><small>{SUB[k]}</small></span>
              {tab === k && auto && <em className="h4-tick" key={`t-${k}`} aria-hidden="true" />}
            </button>
          );
        })}
      </nav>
    </header>
  );

  return (
    <Shell nav={nav} title="Cats Can Dance: go out, book artists, throw a party, learn" description="Every good night in your city and people to go with, every South Asian artist on one page, the party app that runs the whole night, and lessons where you make the music. One sign-in.">
      <style dangerouslySetInnerHTML={{ __html: RING_CSS + CSS }} />
      <div className="h4" style={{ ["--acc" as string]: colour, ["--on" as string]: ON(tab) }}>
        <section className="h4-wrap">
          <div className="h4-stage" key={tab}>
            <div className="h4-copy">
              <span className="h4-eye">{s.eye}</span>
              <h1>{s.h}</h1>
              <p>{s.line}</p>
              <div className="h4-btns"><a className="h4-key" href={s.cta[1]}>{s.cta[0]}</a><a className="h4-ghost" href={s.ghost[1]}>{s.ghost[0]}</a></div>
              <div className="h4-glance">{s.glance.map(([v, l]) => <span key={l}><b>{v}</b><em>{l}</em></span>)}</div>
            </div>
            <div className={`h4-phones${s.shots[0] === s.shots[1] ? " solo" : ""}`} aria-hidden="true">
              {s.shots[0] !== s.shots[1] && <div className="h4-phone h4-phone--back"><img src={`/shots/${s.shots[0]}.webp`} alt="" /></div>}
              <div className="h4-phone h4-phone--front"><img src={`/shots/${s.shots[1]}.webp`} alt="" /></div>
              <img className="h4-cat" src={`/cats/${s.cat}.webp`} alt="" />
            </div>
          </div>
        </section>

        <div className="h4-body" key={`b-${tab}`}>
          {tab === "go" && (
            <>
              {next && (
                <section className="h4-wrap h4-sec">
                  <a href={`/nights/${next.slug}`} className="h4-ep">
                    <span className="h4-ep-poster">{next.poster_url ? <img src={next.poster_url} alt="" /> : <span dangerouslySetInnerHTML={{ __html: posterSvg({ title: next.title, lineup: d.nextLineup.map((l) => l.name), venue: next.venue, city: next.city, date: nextDate, time: next.start_time }) }} />}</span>
                    <span className="h4-ep-copy">
                      <span className="h4-eye">Our next Episode · {dayLabel(nextDate)}{until != null && until > 0 ? ` · in ${until} days` : ""}</span>
                      <b>{next.title}</b>
                      <span className="h4-ep-where">{[next.venue, city(next.city)].filter(Boolean).join(", ")}</span>
                      {d.nextLineup.length > 0 && <span className="h4-ep-line">{d.nextLineup.map((l) => l.name).join(" · ")}</span>}
                      <span className="h4-ep-go">{d.nextHasTickets ? "Get tickets" : "See the night"} →</span>
                    </span>
                  </a>
                </section>
              )}
              {ring.length > 2 && (
                <section className="h4-wrap h4-sec">
                  <Head eye={`This week · ${d.weekCount} nights`} h="Where everyone's going." link={["Everything on", "/whats-on"]} />
                  <div className="h2x h4-ring"><Carousel3D nights={ring} allHref="/whats-on" allLabel={`All ${d.weekCount} nights this week`} /></div>
                </section>
              )}
            </>
          )}

          {tab === "artists" && <ArtistsShow d={d} />}
          {tab === "host" && <InviteMaker today={d.today} />}
          {tab === "learn" && <BeatMaker />}

          <section className="h4-wrap h4-sec">
            <Head eye={`What ${PRODUCTS[ID[tab]].navLabel} does`} h={tab === "go" ? "Everything for a night out." : tab === "artists" ? "For fans, and for bookers." : tab === "host" ? "Everything a party needs." : "Learn by making."} />
            <ol className="h4-list">
              {FEATURES[tab].map(([t, line, href], i) => (
                <li key={t}><a href={href}><em>{String(i + 1).padStart(2, "0")}</em><b>{t}</b><span>{line}</span><i aria-hidden="true">→</i></a></li>
              ))}
            </ol>
          </section>
        </div>

        <section className="h4-wrap h4-sec h4-others">
          <Head eye="Same sign-in" h="Three more ways in." />
          <div className="h4-other-grid">
            {ORDER.filter((k) => k !== tab).map((k) => {
              const p = PRODUCTS[ID[k]];
              const st = STAGE[k];
              return (
                <button key={k} type="button" className="h4-other" onClick={() => pick(k, true)} style={{ ["--c" as string]: p.colour, ["--on" as string]: ON(k) }}>
                  <span className="h4-eye">{p.verb}</span><b>{st.h}</b><em>{st.cta[0]} →</em>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Shell>
  );
}

function Head({ eye, h, link }: { eye: string; h: string; link?: [string, string] }) {
  return (
    <div className="h4-head">
      <div><span className="h4-eye" style={{ color: "var(--acc)" }}>{eye}</span><h2>{h}</h2></div>
      {link && <a className="h4-more" href={link[1]}>{link[0]} →</a>}
    </div>
  );
}

/* ── Artists: real artist pages up top, then a wall of their records. ── */
function ArtistsShow({ d }: { d: HomeData }) {
  const people = d.featured.slice(0, 4);
  const covers = d.covers.filter((c, i, all) => all.findIndex((x) => x.img === c.img || x.title === c.title) === i).slice(0, 12);
  return (
    <section className="h4-wrap h4-sec">
      <Head eye="On Artists now" h="Pick one. Hear everything." link={[`All ${d.artistCount} artists`, productLink("artists", "/artists")]} />
      {people.length > 0 && (
        <div className="h4-people">
          {people.map((a) => (
            <a key={a.slug} className="h4-person" href={productLink("artists", `/${a.slug}`)}>
              <span className="h4-person-img"><img src={a.photo} alt="" loading="lazy" /></span>
              <b>{a.name}</b>
              <span>{[a.city, a.genres[0]].filter(Boolean).join(" · ")}</span>
              {a.latest[0] && <em>Latest: {a.latest[0].title}</em>}
            </a>
          ))}
        </div>
      )}
      {covers.length > 0 && (
        <div className="h4-records">
          {covers.map((c) => (
            <a key={c.img} href={productLink("artists", `/${c.slug}`)} title={`${c.title} · ${c.artist}`}>
              <img src={c.img} alt={`${c.title} by ${c.artist}`} loading="lazy" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
              <span><b>{c.title}</b>{c.artist}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Host: type into it and the invite builds itself. Make it real hands over to Host. ── */
function nextSaturday(today: string) {
  const t = new Date(`${today}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + ((6 - t.getUTCDay() + 7) % 7 || 7));
  return t.toISOString().slice(0, 10);
}
function InviteMaker({ today }: { today: string }) {
  const [name, setName] = useState("Rooftop on Saturday");
  const [date, setDate] = useState(() => nextSaturday(today));
  const [place, setPlace] = useState("Indiranagar, Bengaluru");
  const [entry, setEntry] = useState<"free" | "paid">("free");
  const svg = useMemo(() => posterSvg({ title: name || "Your party", lineup: [], venue: place.split(",")[0]?.trim() || null, city: place.split(",")[1]?.trim() || null, date, time: "21:00" }), [name, date, place]);
  return (
    <section className="h4-wrap h4-sec">
      <Head eye="Try it" h="Your invite, as you type." />
      <div className="h4-try">
        <form className="h4-form" onSubmit={(e) => e.preventDefault()}>
          <label><span>Name</span><input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label>
          <label><span>When</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label><span>Where</span><input value={place} maxLength={60} onChange={(e) => setPlace(e.target.value)} /></label>
          <div className="h4-seg" role="radiogroup" aria-label="Entry">
            <button type="button" role="radio" aria-checked={entry === "free"} onClick={() => setEntry("free")}>Free, RSVP</button>
            <button type="button" role="radio" aria-checked={entry === "paid"} onClick={() => setEntry("paid")}>Tickets</button>
          </div>
          <a className="h4-cta" href={productLink("gate", "/make")}>Make it real, free →</a>
          <p className="h4-fine">{entry === "free" ? "Free parties stay free." : "5% on paid tickets only."} Publish with one email.</p>
        </form>
        <div className="h4-invite">
          <div className="h4-invite-card">
            <span className="h4-invite-art" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="h4-invite-foot"><b>{name || "Your party"}</b><span>{DAY(date)} · 9 pm · {place || "Somewhere good"}</span><em>{entry === "free" ? "RSVP" : "Get tickets"}</em></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── School: a 16-step beat you can program and play, made in the browser like the lessons. ── */
const ROWS = ["Kick", "Clap", "Hat", "Bass"] as const;
const START: boolean[][] = [
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
  [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
].map((r) => r.map(Boolean));
function BeatMaker() {
  const [grid, setGrid] = useState(START);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const g = useRef(grid);
  g.current = grid;

  useEffect(() => {
    if (!playing) { setStep(-1); return; }
    const ac = (ctx.current ??= new AudioContext());
    let i = 0;
    const t = setInterval(() => {
      const now = ac.currentTime;
      g.current.forEach((row, r) => { if (row[i]) hit(ac, r, now); });
      setStep(i);
      i = (i + 1) % 16;
    }, 60000 / 122 / 4);
    return () => clearInterval(t);
  }, [playing]);

  const toggle = (r: number, c: number) => setGrid((x) => x.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? !v : v)) : row)));
  return (
    <section className="h4-wrap h4-sec">
      <Head eye="Try it" h="Make a beat. Right here." />
      <div className="h4-beat">
        <div className="h4-beat-top">
          <button type="button" className="h4-play" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>{playing ? "Stop" : "Play"}</button>
          <span className="h4-beat-meta">122 BPM · tap the steps</span>
          <button type="button" className="h4-clear" onClick={() => setGrid(ROWS.map(() => Array(16).fill(false)))}>Clear</button>
        </div>
        <div className="h4-grid" role="grid" aria-label="Step sequencer">
          {ROWS.map((name, r) => (
            <div className="h4-gridrow" role="row" key={name}>
              <span className="h4-rowname">{name}</span>
              {grid[r].map((on, c) => (
                <button key={c} type="button" role="gridcell" aria-pressed={on} aria-label={`${name} step ${c + 1}`} className={`${c % 4 === 0 ? "bar " : ""}${step === c ? "now" : ""}`} onClick={() => toggle(r, c)} />
              ))}
            </div>
          ))}
        </div>
        <p className="h4-fine">This is how lesson 1 starts. In School, the beat you make becomes the first part of your track.</p>
      </div>
    </section>
  );
}
function hit(ac: AudioContext, row: number, t: number) {
  const out = ac.createGain();
  out.connect(ac.destination);
  if (row === 0) {
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    out.gain.setValueAtTime(0.9, t); out.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(out); o.start(t); o.stop(t + 0.3);
  } else if (row === 1 || row === 2) {
    const len = row === 1 ? 0.18 : 0.05;
    const b = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate);
    const ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = b;
    const f = ac.createBiquadFilter(); f.type = row === 1 ? "bandpass" : "highpass"; f.frequency.value = row === 1 ? 1500 : 7000;
    out.gain.setValueAtTime(row === 1 ? 0.5 : 0.22, t); out.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f); f.connect(out); src.start(t);
  } else {
    const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = 55;
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(120, t + 0.2);
    out.gain.setValueAtTime(0.35, t); out.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(f); f.connect(out); o.start(t); o.stop(t + 0.25);
  }
}
