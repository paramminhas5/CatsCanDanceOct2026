/**
 * catscandance.com v4 (Param, 10 Nov 2026, evening: "the home page can be so much better, take inspiration from
 * when we designed common homepages for all 4 rotating pages"; "explain visually, not text heavy").
 * The four apps rotate through one colour stage (like the v34 and W35 product landings): verb headline, one line,
 * the main action, three glance facts and two real screens with the white cat. The tiles on top switch it and
 * stop the rotation. Then this week's nights on the 3D ring, then the app's features as a grid of small moving
 * cards (one short title, one short line, a visual each), one night across four apps, and the other three apps.
 */
import { useEffect, useState, type ReactNode } from "react";
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
const SUB: Record<Tab, string> = { go: "Nights · what's on, crews, tickets", artists: "Artists · every record, every era", host: "Host · page, tickets, door, report", learn: "School · make music on a real instrument" };
const DAY = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "");
const DAYS_TO = (iso: string | null | undefined, today: string) => (iso ? Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5) : null);

type Stage = { eye: string; h: string; line: string; cta: [string, string]; ghost: [string, string]; glance: [string, string][]; shots: [string, string]; cat: string };

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
  const ring: RingNight[] = [];
  if (next) ring.push({ key: `ccd-${next.slug}`, title: next.title, href: `/nights/${next.slug}`, external: false, img: next.poster_url ?? null, poster: posterSvg({ title: next.title, lineup: d.nextLineup.map((l) => l.name), venue: next.venue, city: next.city, date: nextDate, time: next.start_time }), day: DAY(nextDate), venue: next.venue ?? "", city: city(next.city), lineup: d.nextLineup.map((l) => l.name), tag: "Ours", when: dayLabel(nextDate) });
  for (const n of d.week.slice(0, 12)) {
    const lineup = (n.lineup ?? []).filter(Boolean);
    const names = lineup.length ? lineup : n.artists.map((a) => a.name);
    ring.push({ key: n.id, title: n.title, href: n.ticket_url ?? n.url, external: true, img: n.image_url ?? null, poster: posterSvg({ title: n.title, lineup: names, venue: n.venue, city: city(n.city), date: n.event_date, time: n.event_time }), day: DAY(n.event_date), venue: n.venue ?? "", city: city(n.city), lineup: names, tag: n.event_date === d.today ? "Tonight" : (n.genres ?? [])[0] ?? null, when: dayLabel(n.event_date) });
  }
  const posters = d.week.map((w) => w.image_url).filter(Boolean).slice(0, 3) as string[];
  const covers = d.covers.slice(0, 6);

  const STAGE: Record<Tab, Stage> = {
    go: { eye: "Go out · Nights", h: "Every good night in your city. And people to go with.", line: "Picked nights, who's going, a crew if you're solo, and every ticket you own in one place.", cta: ["See what's on", "/whats-on"], ghost: ["How Nights works", "/nights"], glance: [[String(d.weekCount), "nights this week"], ["3 to 6", "people per crew"], ["1", "place for every ticket"]], shots: ["S34-Discover", "S34-Night"], cat: "dance" },
    artists: { eye: "Book artists · Artists", h: "Every artist worth knowing. All of it, on one page.", line: `${d.artistCount} South Asian artists. Every record playable, every show sourced, and booking with a contract.`, cta: ["Dig in", productLink("artists", "/artists")], ghost: ["Book for a date", productLink("artists", "/artists?mode=book")], glance: [[String(d.artistCount), "artists"], ["Every", "record playable"], ["Signed", "by both sides"]], shots: ["A40-Artist", "F38-A-Page"], cat: "dj" },
    host: { eye: "Host a party · Host", h: "Throw the party everyone talks about on Monday.", line: "Your page, tickets, lineup, door and numbers, in one app that keeps working with no signal.", cta: ["Make a party, free", productLink("gate", "/make")], ghost: ["Everything it does", productLink("gate", "/")], glance: [["60s", "to a live page"], ["0", "bars of signal needed"], ["₹0", "for free parties"]], shots: ["H39-Make", "H39-Door"], cat: "yellow" },
    learn: { eye: "Learn · School", h: "Make the track. Then hear it in the club.", line: "Short lessons on a real instrument in your browser. Every one adds a piece to a track that's yours.", cta: ["Start lesson 1", productLink("school", "/learn")], ghost: ["How School works", productLink("school", "/")], glance: [["Free", "first lesson"], ["0", "downloads"], ["Yours", "the track you make"]], shots: ["W35-Lesson", "W35-Lesson"], cat: "pink" },
  };
  const s = STAGE[tab];
  const colour = PRODUCTS[ID[tab]].colour;

  const nav = (
    <header className="k-nav">
      <div className="k-wrap k-nav__row">
        <a href="/" className="k-nav__brand"><img src="/cats/dance.webp" alt="" width={30} height={30} style={{ objectFit: "contain" }} />Cats Can Dance</a>
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

        {ring.length > 2 && (
          <section className="h4-wrap h4-week">
            <div className="h4-head"><div><span className="h4-eye" style={{ color: PRODUCTS.ccd.colour }}>On this week · {d.weekCount} nights</span><h2>Where everyone's going.</h2></div><a className="h4-ghost" href="/whats-on">Everything on →</a></div>
            <div className="h2x h4-ring"><Carousel3D nights={ring} allHref="/whats-on" allLabel={`All ${d.weekCount} nights this week`} /></div>
          </section>
        )}

        {tab === "go" && next && (
          <section className="h4-wrap">
            <a href={`/nights/${next.slug}`} className="h4-ep">
              <span className="h4-eye">We throw our own too · {dayLabel(nextDate)}{until != null && until >= 0 ? ` · in ${until} days` : ""}</span>
              <b>{next.title}</b><span>{[next.venue, city(next.city)].filter(Boolean).join(", ")}</span>
              <span className="h4-ep-go">{d.nextHasTickets ? "Get tickets" : "See the night"}</span>
            </a>
          </section>
        )}

        <section className="h4-wrap h4-feats" key={`f-${tab}`}>
          <div className="h4-head"><div><span className="h4-eye" style={{ color: "var(--acc)" }}>{PRODUCTS[ID[tab]].navLabel}</span><h2>{tab === "go" ? "Everything that makes a night out easier." : tab === "artists" ? "Everything a fan or a booker wants to know." : tab === "host" ? "Everything a party needs. In one place." : "Learn the way you'd actually use it."}</h2></div></div>
          <div className="h4-bento">{BENTO[tab](posters, covers)}</div>
        </section>

        <section className="h4-wrap h4-lane-sec">
          <div className="h4-lane-box">
            <div className="h4-head"><div><span className="h4-eye" style={{ color: "var(--k-t3)" }}>One sign-in · four apps</span><h2>One night. Four apps. Zero friction.</h2></div><p>Follow the white dot. That's you, moving through a night without signing in twice.</p></div>
            <div className="h4-lane">
              <span className="h4-tok" aria-hidden="true" />
              {([["artists", "A40-Artist", "You follow an artist.", "They post a date in your city. You hear first."], ["ccd", "S34-Crew", "You get in, and get a crew.", "A ticket, then a few people to meet before."], ["gate", "H39-Door", "The door scans you green.", "The host sees you arrive. No list, no queue."], ["school", "W35-Lesson", "You go home and make one.", "Lesson 1 is free. The best tracks play at our Episodes."]] as const).map(([id, shot, t, line], i) => (
                <div key={id} className={`h4-stop s${i + 1}`} style={{ ["--c" as string]: PRODUCTS[id].colour }}>
                  <span className="h4-eye" style={{ color: PRODUCTS[id].colour }}>{PRODUCTS[id].navLabel}</span>
                  <div className="h4-stop-shot"><img src={`/shots/${shot}.webp`} alt="" loading="lazy" /></div>
                  <b>{t}</b><span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="h4-wrap h4-others">
          <div className="h4-head"><div><span className="h4-eye" style={{ color: "var(--k-t3)" }}>Same sign-in</span><h2>Three more ways in.</h2></div></div>
          <div className="h4-other-grid">
            {ORDER.filter((k) => k !== tab).map((k) => {
              const p = PRODUCTS[ID[k]];
              const st = STAGE[k];
              return (
                <button key={k} type="button" className="h4-other" onClick={() => pick(k, true)} style={{ ["--c" as string]: p.colour, ["--on" as string]: ON(k) }}>
                  <span className="h4-other-copy"><span className="h4-eye">{p.verb}</span><b>{st.h}</b><em>{st.cta[0]} →</em></span>
                  <span className="h4-other-shot"><img src={`/shots/${st.shots[0]}.webp`} alt="" loading="lazy" /></span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Shell>
  );
}

/* ── The feature grids: a title of a few words, one short line, and a small moving picture. ── */
const Tile = ({ cls = "", art, t, s }: { cls?: string; art: ReactNode; t: string; s: string }) => (
  <div className={`h4-b ${cls}`}><div className="h4-art" aria-hidden="true">{art}</div><h3>{t}</h3><p>{s}</p></div>
);
const Faces = ({ n = 4 }: { n?: number }) => (
  <span className="h4-faces">{["#2563eb", "#b6ef36", "#ffe600", "#ff4d8d", "#f2efe7"].slice(0, n).map((c, i) => <i key={c} style={{ background: c, animationDelay: `${i * 0.25}s` }}>{["A", "R", "K", "P", "S"][i]}</i>)}</span>
);
const Ex = () => <span className="h4-ex">Example</span>;

const BENTO: Record<Tab, (posters: string[], covers: HomeData["covers"]) => ReactNode> = {
  go: (posters) => (
    <>
      <Tile cls="w2 h2 blue" t="Only nights worth leaving the house for" s="Every one has a real lineup, a promoter we trust or a room that cares. Nothing sponsored." art={<span className="h4-fan">{posters.map((p, i) => <img key={p} src={p} alt="" style={{ ["--i" as string]: i - 1 }} />)}</span>} />
      <Tile t="See who's going" s="And which of them you know." art={<span className="h4-row"><Faces /><span className="h4-mono">128 going · 3 you know</span></span>} />
      <Tile t="Never go alone" s="Solo? Meet a crew of 3 to 6 first." art={<span className="h4-card"><Faces n={5} /><b>Meet 9:15 · near the venue</b><Ex /></span>} />
      <Tile cls="w2" t="Hear first when they play your city" s="Follow an artist. The day they post a date near you, you know." art={<span className="h4-toast"><i /><span><b>Sandunes just announced Bengaluru</b><em>Sat 6 Dec · tickets open now</em></span><Ex /></span>} />
      <Tile t="Every ticket in one place" s="Bought on District or BookMyShow? Add it here." art={<span className="h4-chips"><span>District</span><span>BookMyShow</span><span>Skillbox</span><span className="qr" /></span>} />
      <Tile t="Plans changed? Pass it on" s="Send your ticket to a friend at face value." art={<span className="h4-pass"><span className="tk">1 ticket</span><span className="arrow">→</span><span className="to">Rohan</span></span>} />
      <Tile t="Reminders that actually help" s="Doors, travel time, where your crew meets." art={<span className="h4-glance-mini"><span><em>Doors</em><b>9 pm</b></span><span><em>Away</em><b>12 min</b></span><span><em>Crew</em><b>9:15</b></span></span>} />
      <Tile t="Every night, kept" s="The stub lands on your page the morning after." art={<span className="h4-stubs">{posters.slice(0, 3).map((p, i) => <img key={p} src={p} alt="" style={{ ["--i" as string]: i }} />)}</span>} />
    </>
  ),
  artists: (_p, covers) => (
    <>
      <Tile cls="w2 h2 lime" t="Every record, from the first one" s="Albums, EPs, singles and remixes in order. Tap any of them to hear it." art={<span className="h4-covers">{covers.map((c, i) => <img key={c.img} src={c.img} alt="" style={{ animationDelay: `${i * 0.3}s` }} />)}</span>} />
      <Tile t="Their eras" s="How the sound changed, one track from each." art={<span className="h4-eras"><i style={{ background: "#2563eb", flex: 5 }} /><i style={{ background: "#dc2626", flex: 3 }} /><i style={{ background: "#b6ef36", flex: 3 }} /></span>} />
      <Tile t="What's next" s="Their next show and their latest release, up top." art={<span className="h4-mono-card"><em>Next show</em><b>Sat 6 Dec · Bengaluru</b><Ex /></span>} />
      <Tile cls="w2" t="Book them, properly" s="Who's free on your date, an offer in their range, and a contract you both sign." art={<span className="h4-sign"><span><em>Artist</em><b className="sig">Signed</b></span><span><em>You</em><b className="sig sig2">Signed</b></span></span>} />
      <Tile t="A wall for the fans" s="Leave a note. The artist pins the best." art={<span className="h4-note">“That clarinet. Still thinking about it.”<Ex /></span>} />
      <Tile t="Their card, ready to share" s="Every era on one image, made for a story." art={<span className="h4-minicard"><b>Sandunes</b><i /><i /><i /></span>} />
      <Tile t="Follow, and hear first" s="When they play near you, you know." art={<span className="h4-toast small"><i /><span><b>New date near you</b></span></span>} />
      <Tile t="Is this you?" s="Claim your page. It's already made." art={<span className="h4-chips"><span>Claim your page</span></span>} />
    </>
  ),
  host: () => (
    <>
      <Tile cls="w2 h2 yellow" t="A page that looks like your party" s="Name it, pick your colours, drop a poster. Live and shareable in a minute." art={<span className="h4-phone-xs"><img src="/shots/H39-Make.webp" alt="" /></span>} />
      <Tile t="Tickets that sell themselves" s="Tiers open and close on their own." art={<span className="h4-chips"><span>Early bird · sold out</span><span>General · ₹799</span></span>} />
      <Tile t="The list, in one tap" s="Regulars marked. Yes to all at once." art={<span className="h4-yn"><span>Aditi · regular <b>Yes</b></span><span>Rohan +1 <b>Yes</b></span></span>} />
      <Tile t="Book the lineup" s="See who's free on your date." art={<span className="h4-row"><Faces n={3} /></span>} />
      <Tile t="Gear on request" s="Decks, sound and lights near you." art={<span className="h4-chips"><span>2x CDJ-3000</span><span>DJM-900</span><span>PA</span></span>} />
      <Tile cls="w2 cream" t="A door that never goes down" s="Any phone scans. No signal, no problem. Outside tickets on the same list." art={<span className="h4-door"><span className="sig"><i /><span className="sigt" /></span><span className="scan">✓</span></span>} />
      <Tile t="Walk-ins and UPI" s="Pass-outs and undo too." art={<span className="h4-chips"><span>Walk-in · ₹999 UPI</span><span>Undo</span></span>} />
      <Tile t="The whole night by 9 am" s="Who came, when it filled, who was new." art={<span className="h4-bars">{[20, 42, 70, 100, 80, 40, 18].map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${i / 10}s` }} />)}</span>} />
    </>
  ),
  learn: () => (
    <>
      <Tile cls="w2 pink" t="A real instrument, in your browser" s="No downloads, no theory first. Press a key, hear it." art={<span className="h4-keys">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.35}s` }} />)}</span>} />
      <Tile cls="w2" t="Every lesson builds your track" s="Kick, bass, a drop. By the end it's a track that's yours." art={<span className="h4-wave">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ height: `${20 + ((i * 37) % 70)}%`, animationDelay: `${i * 0.05}s` }} />)}</span>} />
      <Tile t="Lesson 1 is free" s="Start now, no card." art={<span className="h4-chips"><span>Lesson 1 · free</span></span>} />
      <Tile t="The best ones play out" s="Top tracks play at our Episodes." art={<span className="h4-chips"><span>Played at Episode 05</span></span>} />
    </>
  ),
};
