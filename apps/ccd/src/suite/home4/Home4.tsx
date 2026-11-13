/**
 * catscandance.com home, v4.2 (Param, 13 Nov 2026, 00:13: "switching is slow", "the homepage is just text, it can be
 * more fun", "party colours should be cool and fun, I should be able to make an RSVP from there", "I should be able to
 * listen to artists and browse from there", "don't use red for highlight", "everything should be cohesive").
 *
 * - The four stages are all on the page at once and cross-fade, so a switch is instant. Each stage has its own
 *   moving piece behind the real screens: posters drifting (Nights), a record spinning with a real cover (Artists),
 *   an invite floating in a party look (Host), pads lighting up (School).
 * - Under the stage, the app you picked: Nights shows our next Episode and this week's ring; Artists lets you play
 *   their records right here; Host makes an invite in fun looks and hands it to Host to publish as an RSVP; School
 *   lets you program a beat.
 * - Features are cards with the real screen on each, and every card opens that screen.
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
import { shareLink, logShare, type ShareKind } from "@/lib/share";

type Tab = "go" | "artists" | "host" | "learn";
const ORDER: Tab[] = ["go", "artists", "host", "learn"];
const ID: Record<Tab, ProductId> = { go: "ccd", artists: "artists", host: "gate", learn: "school" };
const ON = (k: Tab) => (k === "go" || k === "learn" ? "#fff" : "#0a0a0c");
/** Black on pink reads badly (Param, 13 Nov 2026), so School's stage is a deeper pink with white type. */
const BG = (k: Tab) => (k === "learn" ? "#D6246A" : PRODUCTS[ID[k]].colour);
const TAB_LABEL: Record<Tab, string> = { go: "Go out", artists: "Artists", host: "Host", learn: "Learn" };
const SUB: Record<Tab, string> = { go: "What's on, crews, tickets", artists: "Every record, every show", host: "Invite, list, door", learn: "Make music on a real instrument" };
const DAY = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "");
const DAYS_TO = (iso: string | null | undefined, today: string) => (iso ? Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5) : null);

/** The same five looks Host saves (apps/gate LOOKS); the keys are what the database stores. */
const LOOKS: Record<string, { bg: string; ink: string; label: string }> = {
  pink: { bg: "linear-gradient(140deg,#D6246A 0%,#9B2BD1 100%)", ink: "#FFFFFF", label: "Bubblegum" },
  yellow: { bg: "linear-gradient(165deg,#FFE600 0%,#FFB000 55%,#FF7A1A 100%)", ink: "#0A0A0A", label: "Sunset" },
  lime: { bg: "linear-gradient(140deg,#C8F542 0%,#2EE6A6 100%)", ink: "#0A0A0C", label: "Acid" },
  blue: { bg: "radial-gradient(110% 80% at 85% 0%,#8B5CF6 0%,transparent 60%),linear-gradient(165deg,#2563EB 0%,#0B1A4F 100%)", ink: "#FFFFFF", label: "Laser" },
  ink: { bg: "radial-gradient(55% 45% at 25% 18%,rgba(255,77,141,.55),transparent 70%),radial-gradient(55% 45% at 82% 85%,rgba(37,99,235,.6),transparent 70%),radial-gradient(40% 35% at 70% 30%,rgba(182,239,54,.25),transparent 70%),#0E0E12", ink: "#F2F0EB", label: "Disco" },
};

type Stage = { eye: string; h: string; line: string; cta: [string, string]; ghost: [string, string]; glance: [string, string][]; shots: [string, string]; cat: string };
type Step = { when: string; t: string; line: string; href: string; shot?: string; art?: "wave" | "pads" | "live" | "club" };

/* One shared audio element for every Play on the page. */
type Now = { id: string; title: string; artist: string; img: string | null; href: string };
function usePlayer() {
  const el = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState<Now | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "none">("idle");
  const [prog, setProg] = useState(0);
  useEffect(() => () => { el.current?.pause(); }, []);
  const play = async (n: Now) => {
    const a = (el.current ??= new Audio());
    if (now?.id === n.id && state === "playing") { a.pause(); setState("idle"); return; }
    a.pause(); setNow(n); setState("loading"); setProg(0);
    try {
      const r = await fetch(`/api/preview/${n.id}`);
      const j = await r.json();
      if (!r.ok || !j.preview) { setState("none"); return; }
      a.src = j.preview;
      a.ontimeupdate = () => setProg(a.duration ? a.currentTime / a.duration : 0);
      a.onended = () => { setState("idle"); setProg(0); };
      await a.play();
      setState("playing");
    } catch { setState("none"); }
  };
  const stop = () => { el.current?.pause(); setState("idle"); };
  return { now, state, prog, play, stop };
}

export default function Home4(d: HomeData) {
  const [tab, setTab] = useState<Tab>("go");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("for");
    if (f === "artists" || f === "host" || f === "learn") setTab(f);
    // Transitions start after the first frame, so a ?for= link opens on its app without fading through Nights.
    requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
  }, []);
  const pick = (k: Tab, scroll = false) => {
    setTab(k);
    const u = new URL(window.location.href);
    if (k === "go") u.searchParams.delete("for"); else u.searchParams.set("for", k);
    window.history.replaceState(null, "", u.toString());
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const player = usePlayer();

  const next = d.next;
  const nextDate = next?.event_date ?? null;
  const until = DAYS_TO(nextDate, d.today);
  const ring: RingNight[] = d.week.slice(0, 12).map((n) => {
    const lineup = (n.lineup ?? []).filter(Boolean);
    const names = lineup.length ? lineup : n.artists.map((a) => a.name);
    return { key: n.id, title: n.title, href: n.ticket_url ?? n.url, external: true, img: n.image_url ?? null, poster: posterSvg({ title: n.title, lineup: names, venue: n.venue, city: city(n.city), date: n.event_date, time: n.event_time }), day: DAY(n.event_date), venue: n.venue ?? "", city: city(n.city), lineup: names, tag: n.event_date === d.today ? "Tonight" : (n.genres ?? [])[0] ?? null, when: dayLabel(n.event_date) };
  });
  const posters = d.week.map((w) => w.image_url).filter(Boolean).slice(0, 3) as string[];
  const cover = d.covers[0]?.img ?? null;

  const STAGE: Record<Tab, Stage> = {
    go: { eye: "Nights", h: "Every good night in your city.", line: "Nights picked by people who go out, who else is going, and a crew if you're going solo.", cta: ["See what's on", "/whats-on"], ghost: ["How it works", "#how"], glance: [[String(d.weekCount), "nights this week"], ["3 to 6", "people per crew"], ["1", "place for your tickets"]], shots: ["S34-Discover", "S34-Night"], cat: "dance" },
    artists: { eye: "Artists", h: "Every artist worth knowing, on one page.", line: `${d.artistCount} South Asian artists. Every record you can play, every show with a source, and booking with a contract.`, cta: ["Find an artist", productLink("artists", "/artists")], ghost: ["Book an artist", productLink("artists", "/artists?mode=book")], glance: [[String(d.artistCount), "artists"], ["Every", "record playable"], ["Signed", "by both sides"]], shots: ["A40-Artist", "F38-A-Page"], cat: "dj" },
    host: { eye: "Host", h: "Throw the party people talk about on Monday.", line: "Make the invite, send the RSVP link, watch the list fill and run the door. The door works with no signal.", cta: ["Make an invite", "#try"], ghost: ["Everything it does", productLink("gate", "/")], glance: [["60s", "to a live invite"], ["0", "bars of signal needed"], ["₹0", "for free parties"]], shots: ["H39-Make", "H39-Door"], cat: "yellow" },
    learn: { eye: "School", h: "Make the track. Then hear it in the club.", line: "Short lessons on a real instrument in your browser. Each one adds a part to a track that's yours.", cta: ["Start lesson 1", productLink("school", "/learn")], ghost: ["How School works", productLink("school", "/")], glance: [["Free", "first lesson"], ["0", "downloads"], ["Yours", "the track you make"]], shots: ["W35-Lesson", "W35-Lesson"], cat: "pink" },
  };

  // How it goes, in order (Param, 13 Nov 2026: "it should explain according to how the night progresses and what you
  // do with it, visually"). Each step: when it happens, what you do, the real screen, and a link to that screen.
  const JOURNEY: Record<Tab, { eye: string; h: string; steps: Step[] }> = {
    go: { eye: "How a night goes", h: "From Monday to the morning after.", steps: [
      { when: "Monday", t: "Pick a night", line: "This week's nights, picked by people who go out.", href: "/whats-on", shot: "S34-Discover" },
      { when: "Tuesday", t: "See who's going", line: "Who's in, and which of them you know.", href: next ? `/nights/${next.slug}#going` : "/whats-on", shot: "S34-Night" },
      { when: "Wednesday", t: "Get in", line: "A ticket or the list, in two taps.", href: next ? `/nights/${next.slug}#tickets` : "/whats-on", shot: "S34-GetIn" },
      { when: "Thursday", t: "Find your crew", line: "Going solo? Meet three to six people first.", href: next ? `/nights/${next.slug}#going` : "/whats-on", shot: "S34-Crew" },
      { when: "Saturday, 10 pm", t: "Walk in", line: "Your ticket on your phone. Scanned, you're in.", href: "/me", shot: "S34-Ticket" },
      { when: "Sunday morning", t: "Get points", line: "Going, bringing friends and crews all earn points. Spend them on merch.", href: "/me", shot: "S34-BeenTo" },
    ] },
    artists: { eye: "How a booking goes", h: "From finding them to the gig.", steps: [
      { when: "Start", t: "Find them", line: "Search by city, sound or label.", href: productLink("artists", "/artists"), shot: "F38-A-Find" },
      { when: "Listen", t: "Hear their story", line: "Every era and record on one page.", href: "/artists/sandunes", shot: "A40-Artist" },
      { when: "Your date", t: "Check who's free", line: "Everyone open on your date, in range.", href: productLink("artists", "/artists?mode=book"), shot: "A39-AllBook" },
      { when: "Offer", t: "Send an offer", line: "Date, room, set and fee, in one ask.", href: productLink("artists", "/artists?mode=book"), shot: "F38-A-Offer" },
      { when: "Agreed", t: "Both sign", line: "A contract in the thread, deposit included.", href: productLink("artists", "/bookings"), shot: "F38-A-Contract" },
      { when: "Gig night", t: "They play", line: "Set times, contacts and the balance, in one place.", href: productLink("artists", "/bookings"), shot: "F38-A-Bookings" },
    ] },
    host: { eye: "How a party goes", h: "From an idea to the report.", steps: [
      { when: "Two weeks out", t: "Make the invite", line: "Name, date, place and your colours.", href: productLink("gate", "/make"), shot: "H39-Make" },
      { when: "Same day", t: "Send it", line: "One link to the group chat.", href: productLink("gate", "/make"), shot: "H39-Invite" },
      { when: "All week", t: "Watch the list", line: "Going, maybe, plus-ones. Yes to all.", href: productLink("gate", "/guests"), shot: "H39-RSVP" },
      { when: "Lineup", t: "Book the DJs", line: "Artists free on your date.", href: productLink("gate", "/book"), shot: "H39-BookArtists" },
      { when: "The day before", t: "Sort the gear", line: "Decks, sound and lights, delivered.", href: productLink("gate", "/gear"), shot: "H39-Gear" },
      { when: "On the night", t: "Run the door", line: "Any phone scans, even with no signal.", href: productLink("gate", "/door"), shot: "H39-Door" },
      { when: "Next morning", t: "Read the report", line: "Who came, when it filled, who was new.", href: productLink("gate", "/parties"), shot: "H39-Report" },
    ] },
    learn: { eye: "How a track gets made", h: "From one kick to the club.", steps: [
      { when: "Lesson 1", t: "A kick drum", line: "Press a pad, hear it. That's your start.", href: productLink("school", "/learn"), shot: "W35-Lesson" },
      { when: "Lessons 2 to 10", t: "Drums and bass", line: "Each lesson adds a part to your track.", href: productLink("school", "/learn"), art: "pads" },
      { when: "Lessons 11 to 30", t: "Build the drop", line: "Chords, a lead, the arrangement.", href: productLink("school", "/learn"), art: "wave" },
      { when: "When it's ready", t: "Take it to Live", line: "Export it and keep going in Ableton.", href: productLink("school", "/"), art: "live" },
      { when: "Episode night", t: "Hear it out", line: "The best tracks play at our Episodes.", href: next ? `/nights/${next.slug}` : "/whats-on", art: "club" },
    ] },
  };

  const colour = BG(tab);

  const nav = (
    <header className="k-nav h4-nav">
      <div className="k-wrap k-nav__row">
        <a href="/" className="k-nav__brand"><img src="/ccd-logo.png" alt="" width={30} height={30} style={{ objectFit: "contain", filter: "invert(1)" }} />Cats Can Dance</a>
        <span className="k-nav__gap" />
        <a href="/me" className="k-btn k-btn--ghost k-btn--s">Your account</a>
      </div>
      <nav aria-label="What do you want to do?" className="k-wrap h4-tiles">
        {ORDER.map((k) => {
          const p = PRODUCTS[ID[k]];
          return (
            <button key={k} type="button" className="k-tile" onClick={() => pick(k)} aria-pressed={tab === k} style={{ ["--c" as string]: BG(k), ["--on" as string]: ON(k) }}>
              <i aria-hidden="true" /><span><b>{p.verb}</b><small>{SUB[k]}</small></span>
            </button>
          );
        })}
      </nav>
    </header>
  );

  return (
    <Shell nav={nav} title="Cats Can Dance: go out, book artists, throw a party, learn" description="Every good night in your city and people to go with, every South Asian artist on one page, the party app that runs the whole night, and lessons where you make the music. One sign-in.">
      <style dangerouslySetInnerHTML={{ __html: RING_CSS + CSS }} />
      <div className={`h4${ready ? " ready" : ""}`} style={{ ["--acc" as string]: colour, ["--on" as string]: ON(tab) }}>
        {/* All four stages sit on top of each other and cross-fade, so switching is instant. */}
        <section className="h4-wrap">
          <div className="h4-stage">
            {ORDER.map((k) => {
              const s = STAGE[k];
              const on = k === tab;
              return (
                <div key={k} className={`h4-layer${on ? " on" : ""}`} aria-hidden={!on} style={{ ["--on" as string]: ON(k), ["--acc" as string]: BG(k) }}>
                  <div className="h4-copy">
                    <span className="h4-eye">{s.eye}</span>
                    <h1>{s.h}</h1>
                    <p>{s.line}</p>
                    <div className="h4-btns"><a className="h4-key" href={s.cta[1]} tabIndex={on ? 0 : -1}>{s.cta[0]}</a><a className="h4-ghost" href={s.ghost[1]} tabIndex={on ? 0 : -1}>{s.ghost[0]}</a></div>
                    <div className="h4-glance">{s.glance.map(([v, l]) => <span key={l}><b>{v}</b><em>{l}</em></span>)}</div>
                  </div>
                  <div className="h4-phones" aria-hidden="true">
                    <Fx k={k} posters={posters} cover={cover} />
                    {s.shots[0] !== s.shots[1] && <div className="h4-phone h4-phone--back"><img src={`/shots/${s.shots[0]}.webp`} alt="" /></div>}
                    <div className={`h4-phone h4-phone--front${s.shots[0] === s.shots[1] ? " solo" : ""}`}><img src={`/shots/${s.shots[1]}.webp`} alt="" /></div>
                    <img className="h4-cat" src={`/cats/${s.cat}.webp`} alt="" />
                  </div>
                </div>
              );
            })}
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
          {tab === "artists" && <ArtistsShow d={d} player={player} />}
          {tab === "host" && <InviteMaker today={d.today} />}
          {tab === "learn" && <BeatMaker />}

          <Journey eye={JOURNEY[tab].eye} h={JOURNEY[tab].h} steps={JOURNEY[tab].steps} />
          <Closer tab={tab} colour={BG(tab)} on={ON(tab)} cat={STAGE[tab].cat} next={next?.slug ?? null} />
        </div>

        <section className="h4-wrap h4-sec h4-more-apps">
          <Head eye="Same sign-in" h="Three more ways in." />
          <div className="h4-other-grid">
            {ORDER.filter((k) => k !== tab).map((k) => {
              const p = PRODUCTS[ID[k]];
              const st = STAGE[k];
              return (
                <button key={k} type="button" className="h4-other" onClick={() => pick(k, true)} style={{ ["--c" as string]: BG(k), ["--on" as string]: ON(k) }}>
                  <span className="h4-other-copy"><span className="h4-eye">{p.verb}</span><b>{st.h}</b><em>{st.cta[0]} →</em></span>
                  <img className="h4-other-cat" src={`/cats/${st.cat}.webp`} alt="" loading="lazy" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Phone: the four apps live in a bar at the bottom of the screen, where a thumb reaches them. */}
        <nav className="h4-tabbar" aria-label="Apps">
          {ORDER.map((k) => (
            <button key={k} type="button" onClick={() => pick(k, true)} aria-pressed={tab === k} style={{ ["--c" as string]: BG(k), ["--on" as string]: ON(k) }}>
              <i aria-hidden="true" />{TAB_LABEL[k]}
            </button>
          ))}
        </nav>
        {player.now && player.state !== "idle" && (
          <div className="h4-dock" role="region" aria-label="Now playing">
            {player.now.img && <img src={player.now.img} alt="" className={player.state === "playing" ? "spin" : ""} />}
            <span className="h4-dock-t"><b>{player.state === "none" ? "No preview for this one" : player.now.title}</b><span>{player.now.artist}</span><i style={{ transform: `scaleX(${player.prog})` }} /></span>
            <a href={player.now.href} className="h4-dock-go">Their page →</a>
            <button type="button" onClick={player.stop} aria-label="Stop">■</button>
          </div>
        )}
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

/* The moving piece behind each stage's screens. */
function Fx({ k, posters, cover }: { k: Tab; posters: string[]; cover: string | null }) {
  if (k === "go") return <span className="fx fx-posters">{posters.map((p, i) => <img key={p} src={p} alt="" style={{ ["--i" as string]: i }} />)}</span>;
  if (k === "artists") return <span className="fx fx-record"><span className="fx-disc">{cover && <img src={cover} alt="" />}</span></span>;
  if (k === "host") return <span className="fx fx-invite"><span className="fx-card" style={{ background: LOOKS.pink.bg, color: "#fff" }}><b>Rooftop<br />Saturday</b><em>RSVP</em></span>{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</span>;
  return <span className="fx fx-pads">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</span>;
}

/* The steps of the app in the order you'd use them, on a line that draws as the section comes into view. */
function Journey({ eye, h, steps }: { eye: string; h: string; steps: Step[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const sref = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Phone: the panel holds still while you scroll, and each short stretch of scrolling moves it a step
  // (Param, 13 Nov 2026: tie it to scrolling, make it clearly steps, scroll less, show when to keep going).
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sref.current;
        if (!el || el.offsetParent === null) return;
        const r = el.getBoundingClientRect();
        const run = r.height - window.innerHeight;
        const p = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
        setActive(Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999)));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, [steps.length]);
  const n = steps.length;
  // Tap a step (or Next) to scroll straight to it.
  const jump = (i: number) => {
    const el = sref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const run = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + run * ((Math.min(i, n - 1) + 0.15) / n), behavior: "smooth" });
  };
  const after = () => {
    const el = sref.current;
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + el.offsetHeight - 40, behavior: "smooth" });
  };
  const st = steps[active];
  return (
    <section className="h4-wrap h4-sec" id="how">
      <div className="h4-jr-desk">
        <Head eye={eye} h={h} />
        <div ref={ref} className={`h4-jr${seen ? " seen" : ""}`} style={{ ["--n" as string]: n }}>
          <span className="h4-jr-line" aria-hidden="true"><i /></span>
          <ol>
            {steps.map((s2, i) => (
              <li key={s2.t} style={{ ["--i" as string]: i }}>
                <a href={s2.href}>
                  <span className="h4-jr-when"><em>{String(i + 1).padStart(2, "0")}</em>{s2.when}</span>
                  <span className="h4-jr-dot" aria-hidden="true" />
                  <span className="h4-jr-pic">{s2.shot ? <img src={`/shots/${s2.shot}.webp`} alt="" loading="lazy" /> : <Art kind={s2.art!} />}</span>
                  <b>{s2.t}</b>
                  <span className="h4-jr-line2">{s2.line}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div ref={sref} className="h4-jrs" style={{ ["--n" as string]: n }}>
        <div className="h4-jrs-pin">
          <div className="h4-jrs-top">
            <span className="h4-eye" style={{ color: "var(--acc)" }}>{eye}</span>
            <b className="h4-jrs-h">{h}</b>
          </div>
          {/* The steps, numbered, always in view: done ones ticked, the current one lit. Tap to jump. */}
          <ol className="h4-jrs-steps" style={{ ["--p" as string]: n > 1 ? active / (n - 1) : 1 }}>
            <span className="h4-jrs-track" aria-hidden="true"><i /></span>
            {steps.map((s2, i) => (
              <li key={s2.t} className={i < active ? "done" : i === active ? "on" : ""}>
                <button type="button" onClick={() => jump(i)} aria-label={`Step ${i + 1}: ${s2.t}`} aria-current={i === active ? "step" : undefined}>
                  {i < active ? <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg> : i + 1}
                </button>
              </li>
            ))}
          </ol>
          <div className="h4-jrs-stage" aria-hidden="true">
            {steps.map((s2, i) => (
              <span key={s2.t} className={`h4-jrs-pic${i === active ? " on" : i < active ? " gone" : ""}`}>
                {s2.shot ? <img src={`/shots/${s2.shot}.webp`} alt="" loading="lazy" /> : <Art kind={s2.art!} />}
              </span>
            ))}
            <span className="h4-jrs-when" key={`w-${active}`}>{st.when}</span>
          </div>
          <div className="h4-jrs-copy" aria-live="polite">
            <div className="h4-jrs-txt" key={active}>
              <b>{st.t}</b>
              <span>{st.line}</span>
            </div>
            <div className="h4-jrs-acts">
              <a href={st.href} className="h4-jrs-open">Open it<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></a>
              {active < n - 1
                ? <button type="button" className="h4-jrs-next" onClick={() => jump(active + 1)}>Next step<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>
                : <button type="button" className="h4-jrs-next" onClick={after}>Keep going<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Every app ends with the thing you came to do, then a way to pass it on (Param, 13 Nov 2026: "the bottom CTA
   should be something we can do and is actually useful"). Shares carry ?ref= so they count towards points. */
function Closer({ tab, colour, on, cat, next }: { tab: Tab; colour: string; on: string; cat: string; next: string | null }) {
  const night = next ? `/nights/${next}` : "/whats-on";
  const C: Record<Tab, { eye: string; h: string; line: string; main: [string, string]; alt: [string, string]; share: [string, string, string, ShareKind] }> = {
    go: { eye: "Your move", h: next ? "Come to the next Episode." : "Pick a night this week.", line: "Get in now. Going alone? Say so and we'll put you with a crew of 3 to 6.", main: [next ? "Get in" : "See what's on", next ? `${night}#tickets` : "/whats-on"], alt: ["Find a crew", next ? `${night}#going` : "/whats-on"], share: ["Send this week to the group chat", "/whats-on", "This week's nights on Cats Can Dance. Who's in?", "night"] },
    artists: { eye: "Your move", h: "Book an artist, or find a new favourite.", line: "Pick a date to see who's free and ask up to three at once. Or just dig for something new to listen to.", main: ["Book an artist", productLink("artists", "/artists?mode=book")], alt: ["Browse artists", productLink("artists", "/artists")], share: ["Send an artist to a friend", "/artists/sandunes", "Listen to Sandunes on Cats Can Dance", "artist"] },
    host: { eye: "Your move", h: "Throwing something? Start with the invite.", line: "Name, date, place and colours. One link to send. The door runs from your phone.", main: ["Make the invite", "#try"], alt: ["See the door app", productLink("gate", "/door")], share: ["Tell a friend who throws parties", "/?for=host", "Throwing something? Make the invite and run the door from your phone, free.", "night"] },
    learn: { eye: "Your move", h: "Make your first beat in five minutes.", line: "Lesson 1 is a kick drum. By lesson 10 you have a track you can play to friends.", main: ["Start lesson 1", productLink("school", "/learn")], alt: ["Try the beat maker", "#try"], share: ["Challenge a friend to a beat", "/?for=learn", "I'm learning to make music on Cats Can Dance. Make a beat and send me yours.", "beat"] },
  };
  const c = C[tab];
  const send = async () => {
    const [, path, text, kind] = c.share;
    const url = shareLink(path, kind, tab);
    logShare(kind, tab, "share", "home-closer");
    if (navigator.share) { try { await navigator.share({ text, url }); return; } catch { /* closed */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
  };
  return (
    <section className="h4-wrap h4-sec">
      <div className="h4-close" style={{ ["--c" as string]: colour, ["--on" as string]: on }}>
        <div className="h4-close-copy">
          <span className="h4-eye">{c.eye}</span>
          <h2>{c.h}</h2>
          <p>{c.line}</p>
          <div className="h4-close-acts">
            <a className="h4-close-main" href={c.main[1]}>{c.main[0]} →</a>
            <a className="h4-close-ghost" href={c.alt[1]}>{c.alt[0]}</a>
          </div>
          <button type="button" className="h4-close-link" onClick={() => void send()}>
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {c.share[0]} · earns points
          </button>
        </div>
        <img className="h4-close-cat" src={`/cats/${cat}.webp`} alt="" loading="lazy" />
      </div>
    </section>
  );
}

function Art({ kind }: { kind: "wave" | "pads" | "live" | "club" }) {
  if (kind === "club") return <span className="art art-club"><img src="/cats/dance.webp" alt="" /><i /><i /><i /></span>;
  if (kind === "wave") return <span className="art art-wave">{Array.from({ length: 32 }, (_, i) => <i key={i} style={{ height: `${18 + ((i * 37) % 70)}%`, animationDelay: `${i * 0.05}s` }} />)}</span>;
  if (kind === "pads") return <span className="art art-pads">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ animationDelay: `${(i * 0.37) % 2.4}s` }} />)}</span>;
  return <span className="art art-live"><b>Your track.wav</b><span>→</span><b>Ableton Live</b></span>;
}

/* ── Artists: play their records right here, then go to their page. ── */
function ArtistsShow({ d, player }: { d: HomeData; player: ReturnType<typeof usePlayer> }) {
  const people = d.featured.slice(0, 4);
  const covers = d.covers.filter((c, i, all) => all.findIndex((x) => x.img === c.img || x.title === c.title) === i).slice(0, 12);
  const playing = (id: string | null) => !!id && player.now?.id === id && (player.state === "playing" || player.state === "loading");
  return (
    <section className="h4-wrap h4-sec">
      <Head eye="Press play" h="Hear them. Then dig in." link={[`All ${d.artistCount} artists`, productLink("artists", "/artists")]} />
      {people.length > 0 && (
        <div className="h4-people">
          {people.map((a) => {
            const t = a.latest.find((x) => x.deezer);
            const href = `/artists/${a.slug}`;
            return (
              <div key={a.slug} className="h4-person">
                <a className="h4-person-img" href={href}><img src={a.photo} alt="" loading="lazy" /></a>
                {t && (
                  <button type="button" className={`h4-pbtn${playing(t.deezer) ? " on" : ""}`} aria-label={`Play ${t.title} by ${a.name}`} onClick={() => void player.play({ id: t.deezer!, title: t.title, artist: a.name, img: a.photo, href })}>
                    {playing(t.deezer) ? <span className="eq"><i /><i /><i /></span> : <svg width="16" height="16" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>}
                  </button>
                )}
                <a href={href} className="h4-person-t"><b>{a.name}</b><span>{[a.city, a.genres[0]].filter(Boolean).join(" · ")}</span>{t && <em>{t.title}</em>}</a>
              </div>
            );
          })}
        </div>
      )}
      {covers.length > 0 && (
        <div className="h4-records">
          {covers.map((c) => {
            const href = `/artists/${c.slug}`;
            const on = playing(c.track);
            return (
              <div key={c.img} className={`h4-rec${on ? " on" : ""}`}>
                <button type="button" onClick={() => { if (c.track) void player.play({ id: c.track, title: c.title, artist: c.artist, img: c.img, href }); else window.location.href = href; }} aria-label={c.track ? `Play ${c.title} by ${c.artist}` : `${c.title} by ${c.artist}`}>
                  <img src={c.img} alt="" loading="lazy" onError={(e) => { (e.currentTarget.closest(".h4-rec") as HTMLElement).style.display = "none"; }} />
                  {c.track && <span className="h4-rec-pl" aria-hidden="true">{on ? <span className="eq"><i /><i /><i /></span> : <svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>}</span>}
                </button>
                <a href={href}><b>{c.title}</b><span>{c.artist}</span></a>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Host: make the invite in a party look, then publish it as an RSVP in Host with everything filled in. ── */
function nextSaturday(today: string) {
  const t = new Date(`${today}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + ((6 - t.getUTCDay() + 7) % 7 || 7));
  return t.toISOString().slice(0, 10);
}
const CITIES = ["Bengaluru", "Mumbai", "Delhi NCR", "Goa"];
function InviteMaker({ today }: { today: string }) {
  const [name, setName] = useState("Rooftop on Saturday");
  const [date, setDate] = useState(() => nextSaturday(today));
  const [time, setTime] = useState("21:00");
  const [cityName, setCity] = useState("Bengaluru");
  const [where, setWhere] = useState("Indiranagar");
  const [look, setLook] = useState("yellow");
  const [entry, setEntry] = useState<"rsvp" | "tickets">("rsvp");
  const L = LOOKS[look];
  const handOver = useMemo(() => {
    const q = new URLSearchParams({ title: name.trim() || "My party", date, time, city: cityName, where, look, entry });
    return productLink("gate", `/make?${q.toString()}`);
  }, [name, date, time, cityName, where, look, entry]);
  const pretty = date ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "";
  const darkInk = L.ink === "#FFFFFF" || L.ink === "#F2F0EB";
  return (
    <section className="h4-wrap h4-sec" id="try">
      <Head eye="Try it" h="Make the invite. Send the RSVP." />
      <div className="h4-try">
        <form className="h4-form" onSubmit={(e) => { e.preventDefault(); window.location.href = handOver; }}>
          <label><span>Name it</span><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
          <div className="h4-two">
            <label><span>Day</span><input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} /></label>
            <label><span>Doors</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          </div>
          <div className="h4-chips" role="radiogroup" aria-label="City">
            {CITIES.map((c) => <button key={c} type="button" role="radio" aria-checked={cityName === c} onClick={() => setCity(c)}>{c}</button>)}
          </div>
          <label><span>Where</span><input value={where} maxLength={80} placeholder="The venue, or the area" onChange={(e) => setWhere(e.target.value)} /></label>
          <div>
            <span className="h4-lbl">Your colours</span>
            <div className="h4-looks" role="radiogroup" aria-label="Look">
              {Object.entries(LOOKS).map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={look === k} aria-label={l.label} onClick={() => setLook(k)} style={{ background: l.bg, color: l.ink }}><b>{l.label}</b></button>
              ))}
            </div>
          </div>
          <div className="h4-seg" role="radiogroup" aria-label="How people get in">
            <button type="button" role="radio" aria-checked={entry === "rsvp"} onClick={() => setEntry("rsvp")}>Free, RSVP</button>
            <button type="button" role="radio" aria-checked={entry === "tickets"} onClick={() => setEntry("tickets")}>Tickets</button>
          </div>
          <button type="submit" className="h4-cta">Make the RSVP →</button>
          <p className="h4-fine">Opens Host with all of this filled in. Publish with one email and you get the link to send.</p>
        </form>
        <div className="h4-invite">
          <div className="h4-invite-glow" style={{ background: L.bg }} aria-hidden="true" />
          <div className="h4-invite-card" style={{ background: L.bg, color: L.ink }}>
            <span className="h4-inv-top"><span>You're invited</span><img src="/ccd-logo.png" alt="" style={{ filter: darkInk ? "invert(1)" : "none" }} /></span>
            <b className="h4-inv-name">{name || "Your party"}</b>
            <span className="h4-inv-meta">{[pretty, time].filter(Boolean).join(" · ")}<br />{[where, cityName].filter(Boolean).join(", ")}</span>
            <img src="/cats/dance.webp" alt="" className="h4-inv-cat" />
            <span className="h4-inv-btns"><em style={{ background: L.ink, color: darkInk ? "#0A0A0B" : "#fff" }}>{entry === "rsvp" ? "Going" : "Get tickets"}</em>{entry === "rsvp" && <em className="ghost">Maybe</em>}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── School: a 16-step beat you can program and play, like the start of lesson 1. ── */
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
    void ac.resume();
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
