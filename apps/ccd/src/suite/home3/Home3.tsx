/**
 * catscandance.com v3 (canvas "CCD v3: the suite, redesigned", board Main; plan ccd/v3-redesign.md).
 * One switch on top: Go out, Book artists, Host a party, Learn. Everything below it changes: the hero
 * (this week's posters on a ring, a wall of records, a party coming together, keys that play) and a
 * motion story where a phone plays the real screens in step with the cards. This week's nights stay at
 * the bottom on every tab. The tab lives in the URL (?for=artists) so a link can open on any app.
 */
import { useEffect, useState } from "react";
import { posterSvg } from "@ccd/ui";
import { PRODUCTS, PRODUCT_ORDER, productLink, type ProductId } from "@ccd/brand";
import type { HomeData } from "@/lib/home";
import Shell from "@/suite/Shell";
import { dayLabel, city } from "@/suite/bits";
import Carousel3D, { type RingNight } from "@/suite/home2/Carousel3D";
import { CSS } from "./home3.css";
import { CSS as RING_CSS } from "@/suite/home2/home2.css";

type Tab = "go" | "artists" | "host" | "learn";
const TABS: { k: Tab; id: ProductId }[] = [{ k: "go", id: "ccd" }, { k: "artists", id: "artists" }, { k: "host", id: "gate" }, { k: "learn", id: "school" }];
const ON = (k: Tab) => (k === "go" ? "#fff" : "#0a0a0c");
const DAY = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "");
const DAYS_TO = (iso: string | null | undefined, today: string) => (iso ? Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5) : null);

type Feat = { t: string; s: string; shot: string; badge: string };
const FEATS: Record<Tab, { eye: string; h: string; list: Feat[] }> = {
  go: {
    eye: "Why Nights is the best way to go out", h: "Going out, without the guesswork.",
    list: [
      { t: "Only nights worth leaving the house for", s: "Every night here has someone credible behind it: a real lineup, a promoter we trust, a room that cares. No sponsored filler, no flyer spam.", shot: "S34-Discover", badge: "Picked, never scraped" },
      { t: "Get in with two taps", s: "Buy a ticket, ask for the guest list, or add the one you already bought on District or BookMyShow. Your code lives on your phone.", shot: "S34-GetIn", badge: "Tickets, list or yours" },
      { t: "Going solo? You won't be", s: "Say you're going alone and we put you in a crew of 3 to 6 people going to the same night, matched on how you like a night out. You meet first and walk in together.", shot: "S34-Crew", badge: "Your crew, meeting first" },
      { t: "Your phone is your ticket", s: "At the door your code scans and the screen flashes green. It works in a basement with no signal.", shot: "S34-Ticket", badge: "Green. You're in." },
      { t: "Every night, kept", s: "The morning after, a stub with the lineup and your crew lands on your page. Your whole going-out life, in one place.", shot: "S34-BeenTo", badge: "Every stub, kept" },
    ],
  },
  artists: {
    eye: "Why Artists beats a Google search", h: "The deepest artist pages anywhere.",
    list: [
      { t: "Every record, from the first one", s: "Albums, EPs, singles and remixes in order, with the label and the year, and 30 seconds of each to play.", shot: "A40-Artist", badge: "Every record, playable" },
      { t: "Eras that show how the sound changed", s: "Each career split into eras with the sound of each one. Press Start here and hear one track from every era.", shot: "F38-A-Page", badge: "One tap, every era" },
      { t: "A home for their fans", s: "Followers, who was there, notes fans leave. The artist pins the best ones and shares their card.", shot: "F38-A-Fans", badge: "Pinned by the artist" },
      { t: "Book them properly", s: "See who is free on your date, send an offer in their range, agree in one thread and both sign a contract. The deposit waits with us until after the show.", shot: "F38-A-Contract", badge: "Signed by both" },
    ],
  },
  host: {
    eye: "Why Host is the best party app going", h: "Everything a party needs. Nothing it doesn't.",
    list: [
      { t: "A page that looks like your party", s: "Pick your colours, drop a poster or let us make one. Live and shareable in a minute.", shot: "H39-Make", badge: "Live in 60 seconds" },
      { t: "Tickets, a guest list, or both", s: "Tiers that sell out on their own, or a list you approve in one tap. Regulars are marked.", shot: "H39-RSVP", badge: "Yes to regulars, one tap" },
      { t: "Book the lineup and the gear", s: "Find artists free on your date and send an offer. Ask for decks, sound and lights from owners near you.", shot: "H39-BookArtists", badge: "Who's free on your date" },
      { t: "A door that never goes down", s: "Any phone on your team scans. No signal, no problem. Outside tickets on the same list.", shot: "H39-Door", badge: "No signal, still scanning" },
      { t: "The whole night by 9 am", s: "Who came, when the room filled, which tickets sold, who was new. Ready for the next one.", shot: "H39-Report", badge: "In your inbox by 9 am" },
    ],
  },
  learn: {
    eye: "Why School works", h: "Learn by making, not watching.",
    list: [
      { t: "Lessons on a real instrument", s: "Short lessons in your browser on a real instrument. No downloads, no theory first.", shot: "W35-Lesson", badge: "Lesson 1 is free" },
      { t: "Every lesson builds your track", s: "Tune a kick, write a bassline, build a drop. By the end you have a track that's yours.", shot: "W35-Lesson", badge: "Your track, growing" },
      { t: "The best ones play out", s: "The best tracks from School play at our Episodes, in front of a real room.", shot: "W35-Lesson", badge: "Heard at an Episode" },
    ],
  },
};
const TILE_SUB: Record<Tab, string> = { go: "Nights · what's on, crews, tickets", artists: "Artists · every record, every era", host: "Host · page, tickets, door, report", learn: "School · make music on a real instrument" };
const OTHER: Record<Tab, { line: string; cta: string; shot: string }> = {
  go: { line: "The best nights in your city, tickets in two taps, and a crew if you're going solo.", cta: "See what's on", shot: "S34-Discover" },
  artists: { line: "Every South Asian artist, their whole story, and a contract when you book.", cta: "Dig in", shot: "A40-Artist" },
  host: { line: "Your page, tickets, lineup, door and numbers in one app that works with no signal.", cta: "Make a party", shot: "H39-Make" },
  learn: { line: "Lessons where you make a real track, and the best ones play at our nights.", cta: "Start lesson 1", shot: "W35-Lesson" },
};

export default function Home3(d: HomeData) {
  const [tab, setTab] = useState<Tab>("go");
  const [fi, setFi] = useState(0);
  const [auto, setAuto] = useState(true);
  const feat = FEATS[tab];
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setFi((i) => (i + 1) % feat.list.length), 6000);
    return () => clearInterval(t);
  }, [auto, feat.list.length, tab]);
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("for");
    if (f === "artists" || f === "host" || f === "learn") setTab(f);
  }, []);
  const pick = (k: Tab, scroll = false) => {
    setTab(k); setFi(0); setAuto(true);
    const u = new URL(window.location.href);
    if (k === "go") u.searchParams.delete("for"); else u.searchParams.set("for", k);
    window.history.replaceState(null, "", u.toString());
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = d.next;
  const nextDate = next?.event_date ?? null;
  const until = DAYS_TO(nextDate, d.today);
  const ring: RingNight[] = [];
  if (next) {
    ring.push({
      key: `ccd-${next.slug}`, title: next.title, href: `/nights/${next.slug}`, external: false, img: next.poster_url ?? null,
      poster: posterSvg({ title: next.title, lineup: d.nextLineup.map((l) => l.name), venue: next.venue, city: next.city, date: nextDate, time: next.start_time }),
      day: DAY(nextDate), venue: next.venue ?? "", city: city(next.city), lineup: d.nextLineup.map((l) => l.name), tag: "Ours", when: dayLabel(nextDate),
    });
  }
  for (const n of d.week.slice(0, 12)) {
    const lineup = (n.lineup ?? []).filter(Boolean);
    ring.push({
      key: n.id, title: n.title, href: n.ticket_url ?? n.url, external: true, img: n.image_url ?? null,
      poster: posterSvg({ title: n.title, lineup: lineup.length ? lineup : n.artists.map((a) => a.name), venue: n.venue, city: city(n.city), date: n.event_date, time: n.event_time }),
      day: DAY(n.event_date), venue: n.venue ?? "", city: city(n.city), lineup: lineup.length ? lineup : n.artists.map((a) => a.name),
      tag: n.event_date === d.today ? "Tonight" : (n.genres ?? [])[0] ?? null, when: dayLabel(n.event_date),
    });
  }
  const colour = PRODUCTS[TABS.find((t) => t.k === tab)!.id].colour;
  const cols = [0, 1, 2].map((c) => d.covers.filter((_, i) => i % 3 === c));

  const nav = (
    <header className="k-nav">
      <div className="k-wrap k-nav__row">
        <a href="/" className="k-nav__brand"><img src="/cats/dance.webp" alt="" width={30} height={30} style={{ objectFit: "contain" }} />Cats Can Dance</a>
        <span className="k-nav__gap" />
        <a href="/me" className="k-btn k-btn--ghost k-btn--s h3-acct">Your account</a>
      </div>
      <nav aria-label="What do you want to do?" className="k-wrap h3-tiles">
        {TABS.map((t) => {
          const p = PRODUCTS[t.id];
          return (
            <button key={t.k} type="button" className="k-tile" onClick={() => pick(t.k)} aria-pressed={tab === t.k} style={{ ["--c" as string]: p.colour, ["--on" as string]: ON(t.k) }}>
              <i aria-hidden="true" /><span><b>{p.verb}</b><small>{TILE_SUB[t.k]}</small></span>
            </button>
          );
        })}
      </nav>
    </header>
  );

  return (
    <Shell nav={nav} title="Cats Can Dance: go out, book artists, throw a party, learn" description="The good nights and people to go with, every South Asian artist on one page, the best app to throw a party, and lessons where you make the music. One sign-in.">
      <style dangerouslySetInnerHTML={{ __html: RING_CSS + CSS }} />
      <div className="h3" style={{ ["--acc" as string]: colour, ["--acc-on" as string]: ON(tab) }}>
        {tab === "go" && (
          <section className="h3-hero h3-hero--go" key="go">
            <div className="h3-copy">
              <span className="h3-eye" style={{ color: PRODUCTS.ccd.colour }}>Go out · Nights</span>
              <h1>The best nights in your city. And people to go with.</h1>
              <p>Hand-picked nights, tickets in two taps, a crew if you're going solo, and a door that knows you're coming.</p>
              <div className="h3-btns"><a className="h3-key" href="/whats-on">See what's on</a><a className="h3-ghost" href="#why">Find your crew</a></div>
            </div>
            {ring.length > 2 ? <div className="h3-ring h2x"><Carousel3D nights={ring} allHref="/whats-on" allLabel={`All ${d.weekCount} nights this week`} /></div> : null}
          </section>
        )}
        {tab === "artists" && (
          <section className="h3-hero h3-split" key="artists">
            <div className="h3-copy">
              <span className="h3-eye" style={{ color: PRODUCTS.artists.colour }}>Book artists · Artists</span>
              <h1>Every artist worth knowing. Their whole story. One tap to book.</h1>
              <p>{d.artistCount} South Asian artists, every record from the first one, every show with a source, and a contract when you book.</p>
              <div className="h3-btns"><a className="h3-key" href={productLink("artists", "/artists")}>Dig in</a><a className="h3-ghost" href={productLink("artists", "/claim")}>Is your page here? Claim it</a></div>
            </div>
            {d.covers.length >= 9 && (
              <div className="h3-wall" aria-hidden="true">
                {cols.map((c, ci) => (
                  <div key={ci} className={`h3-col${ci === 1 ? " rev" : ""}`}>
                    {[...c, ...c].map((r, i) => <a key={`${r.slug}-${i}`} href={productLink("artists", `/${r.slug}`)} tabIndex={-1}><img src={r.img} alt="" loading="lazy" /><span>{r.artist}</span></a>)}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {tab === "host" && (
          <section className="h3-hero h3-split" key="host">
            <div className="h3-copy">
              <span className="h3-eye" style={{ color: PRODUCTS.gate.colour }}>Host a party · Host</span>
              <h1>Throw the party everyone talks about on Monday.</h1>
              <p>Your page, your tickets, your lineup, your door, your numbers. One app, built by people who throw a party every month.</p>
              <div className="h3-btns"><a className="h3-key" href={productLink("gate", "/make")}>Make a party, free</a><a className="h3-ghost" href={productLink("gate", "/")}>See everything it does</a></div>
            </div>
            <div className="h3-pop" aria-hidden="true">
              <div className="h3-phone"><div><img src="/shots/H39-Make.webp" alt="" /></div></div>
              <span className="h3-chip" style={{ left: "4%", top: "8%" }}><i style={{ background: PRODUCTS.gate.colour }} />Your page is live</span>
              <span className="h3-chip" style={{ right: "2%", top: "26%", animationDelay: "1.2s" }}>Early bird sold out</span>
              <span className="h3-chip" style={{ left: "0%", top: "52%", animationDelay: "2.4s" }}><i style={{ background: "#22c55e" }} />Door: green, works offline</span>
              <span className="h3-chip" style={{ right: "4%", top: "70%", animationDelay: "3.6s" }}>District tickets on the same list</span>
              <span className="h3-chip" style={{ left: "10%", bottom: "4%", animationDelay: "4.8s" }}>The report, 9 am</span>
              <span className="h3-ex">Example party</span>
            </div>
          </section>
        )}
        {tab === "learn" && (
          <section className="h3-hero h3-split" key="learn">
            <div className="h3-copy">
              <span className="h3-eye" style={{ color: PRODUCTS.school.colour }}>Learn · School</span>
              <h1>Make the track. Then hear it in the club.</h1>
              <p>Short lessons on a real instrument in your browser. Every lesson adds a piece to a track that's yours. Lesson 1 is free.</p>
              <div className="h3-btns"><a className="h3-key" href={productLink("school", "/learn")}>Start lesson 1</a></div>
            </div>
            <div className="h3-learn" aria-hidden="true">
              <div className="h3-phone h3-phone--s"><div><img src="/shots/W35-Lesson.webp" alt="" /></div></div>
              <div className="h3-keys">{Array.from({ length: 8 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 0.4}s` }} />)}</div>
            </div>
          </section>
        )}

        {d.week.length > 0 && (
          <section className="h3-week">
            <div className="h3-week-head"><div><span className="h3-eye" style={{ color: PRODUCTS.ccd.colour }}>On this week · {d.weekCount} nights</span><h2>Where everyone's going.</h2></div><a href="/whats-on" className="h3-ghost">Everything on →</a></div>
          </section>
        )}
        {d.week.length > 0 && (
          <div className="h3-belt-wrap">
            <div className="h3-belt">
              {[0, 1].map((r) => d.week.slice(0, 12).map((w) => (
                <a key={`${r}-${w.id}`} className="h3-pc" href={w.ticket_url ?? w.url} target="_blank" rel="noopener" aria-hidden={r === 1 ? true : undefined} tabIndex={r === 1 ? -1 : undefined}>
                  <span className="h3-po">
                    {w.image_url ? <img src={w.image_url} alt="" loading="lazy" /> : <span className="h3-made" dangerouslySetInnerHTML={{ __html: posterSvg({ title: w.title, lineup: (w.lineup ?? []).filter(Boolean), venue: w.venue, city: city(w.city), date: w.event_date, time: w.event_time }) }} />}
                    <span className="h3-day">{DAY(w.event_date)} · {city(w.city)}</span>
                    <span className="h3-go">Get in</span>
                  </span>
                  <b>{w.title}</b>
                </a>
              )))}
            </div>
          </div>
        )}

        {tab === "go" && next && (
          <section className="h3-ep">
            <a href={`/nights/${next.slug}`} className="h3-ep-card">
              <span className="h3-eye">We throw our own too · {dayLabel(nextDate)}{until != null && until >= 0 ? ` · in ${until} days` : ""}</span>
              <b>{next.title}</b>
              <span>{[next.venue, city(next.city)].filter(Boolean).join(", ")}</span>
              <span className="h3-ep-go">{d.nextHasTickets ? "Get tickets" : "See the night"}</span>
            </a>
          </section>
        )}

        <section id="why" className="h3-why" key={`why-${tab}`}>
          <div className="h3-why-list">
            <span className="h3-eye" style={{ color: "var(--acc)" }}>{feat.eye}</span>
            <h2>{feat.h}</h2>
            {feat.list.map((f, i) => (
              <button key={f.t} type="button" className={`h3-feat${i === fi ? " on" : ""}`} aria-expanded={i === fi} onClick={() => { setAuto(false); setFi(i); }}>
                <span className="h3-n">{String(i + 1).padStart(2, "0")}</span>
                <b>{f.t}</b>
                {i === fi && <span className="h3-feat-s">{f.s}</span>}
                {i === fi && auto && <i className="h3-fb" key={`${tab}-${fi}`} />}
              </button>
            ))}
          </div>
          <div className="h3-why-phone">
            <div className="h3-phone"><div><img key={`${tab}-${fi}`} src={`/shots/${feat.list[Math.min(fi, feat.list.length - 1)].shot}.webp`} alt="" className="h3-shot-in" /></div></div>
            <span className="h3-badge" key={`b-${tab}-${fi}`}>{feat.list[Math.min(fi, feat.list.length - 1)].badge}</span>
          </div>
        </section>

        <section className="h3-lane-sec">
          <div className="h3-lane-box">
            <div className="h3-suite-head">
              <div><span className="h3-eye" style={{ color: "var(--k-t3)" }}>One sign-in · four apps</span><h2>One night. Four apps. Zero friction.</h2></div>
              <p>Follow the white dot. That's you, moving through a night without ever signing in twice.</p>
            </div>
            <div className="h3-lane">
              <span className="h3-tok" aria-hidden="true" />
              {([
                ["artists", "A40-Artist", "You follow an artist.", "They post a date in your city. You hear first."],
                ["ccd", "S34-Crew", "You get in, and get a crew.", "Two taps for the ticket. A few people to meet before."],
                ["gate", "H39-Door", "The door scans you green.", "The host sees you arrive. No list, no queue."],
                ["school", "W35-Lesson", "You go home and make one.", "Lesson 1 is free. The best tracks play at our Episodes."],
              ] as const).map(([id, shot, t, line], i) => (
                <div key={id} className={`h3-stop s${i + 1}`} style={{ ["--c" as string]: PRODUCTS[id].colour }}>
                  <span className="h3-eye" style={{ color: PRODUCTS[id].colour }}>{PRODUCTS[id].navLabel}</span>
                  <div className="h3-stop-shot"><img src={`/shots/${shot}.webp`} alt="" loading="lazy" /></div>
                  <b>{t}</b>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="h3-others">
          <h2>The other three.</h2>
          <div className="h3-other-grid">
            {TABS.filter((t) => t.k !== tab).map((t) => {
              const p = PRODUCTS[t.id];
              const o = OTHER[t.k];
              return (
                <button key={t.k} type="button" className="h3-other" onClick={() => pick(t.k, true)} style={{ ["--c" as string]: p.colour }}>
                  <span className="h3-other-copy"><span className="h3-eye" style={{ color: p.colour }}>{p.verb}</span><b>{p.navLabel}</b><span>{o.line}</span><em>{o.cta} →</em></span>
                  <span className="h3-other-shot"><img src={`/shots/${o.shot}.webp`} alt="" loading="lazy" /></span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Shell>
  );
}
