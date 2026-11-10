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

type Step = { t: string; s: string; shot: string };
const STORY: Record<Tab, { h: string; steps: Step[] }> = {
  go: {
    h: "From “what's on?” to walking in green.",
    steps: [
      { t: "Find it", s: "Picked by people who go out. Never scraped and dumped.", shot: "S34-Discover" },
      { t: "Get in", s: "Two taps. Your District ticket works here too.", shot: "S34-GetIn" },
      { t: "Bring a crew", s: "Going alone? Meet 3 to 6 people going.", shot: "S34-Crew" },
      { t: "Walk in green", s: "Show your code. The door lights up.", shot: "S34-Ticket" },
      { t: "Keep the stub", s: "Every night you went, on your page.", shot: "S34-BeenTo" },
    ],
  },
  artists: {
    h: "The page an artist would make, if they had a month.",
    steps: [
      { t: "The whole story", s: "Records from the first one, grouped into eras. Every fact has a source.", shot: "A40-Artist" },
      { t: "A place for fans", s: "Who follows, who was there, the notes they leave. The artist pins the best.", shot: "F38-A-Fans" },
      { t: "Booked properly", s: "Ask, agree, sign with a code. The deposit waits with us until after the show.", shot: "F38-A-Contract" },
    ],
  },
  host: {
    h: "Everything a party needs, first post to morning after.",
    steps: [
      { t: "Make it", s: "Pick your colours, drop the poster. Live in a minute.", shot: "H39-Make" },
      { t: "Fill it", s: "Tickets, a guest list, or both. You choose who's in.", shot: "H39-RSVP" },
      { t: "Run the door", s: "Any phone scans. No signal, no problem.", shot: "H39-Door" },
      { t: "Read the night", s: "Who came, when the room filled, what you made.", shot: "H39-Report" },
    ],
  },
  learn: {
    h: "Every lesson ends with something you made.",
    steps: [{ t: "Play along", s: "Short lessons on a real instrument in your browser. Each one adds to a track that's yours.", shot: "W35-Lesson" }],
  },
};

export default function Home3(d: HomeData) {
  const [tab, setTab] = useState<Tab>("go");
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("for");
    if (f === "artists" || f === "host" || f === "learn") setTab(f);
  }, []);
  const pick = (k: Tab, scroll = false) => {
    setTab(k);
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
  const story = STORY[tab];
  const n = story.steps.length;
  const colour = PRODUCTS[TABS.find((t) => t.k === tab)!.id].colour;
  const cols = [0, 1, 2].map((c) => d.covers.filter((_, i) => i % 3 === c));

  const nav = (
    <header className="k-nav">
      <div className="k-wrap k-nav__row">
        <a href="/" className="k-nav__brand"><img src="/cats/dance.webp" alt="" width={30} height={30} style={{ objectFit: "contain" }} />Cats Can Dance</a>
        <nav aria-label="What do you want to do?" className="k-switch h3-switch" style={{ display: "flex" }}>
          {TABS.map((t) => {
            const p = PRODUCTS[t.id];
            return (
              <button key={t.k} type="button" onClick={() => pick(t.k)} aria-pressed={tab === t.k} aria-current={tab === t.k ? "page" : undefined} style={{ ["--c" as string]: p.colour, ["--on" as string]: ON(t.k) }}>
                <i aria-hidden="true" /><span className="h3-v">{p.verb}</span><span className="h3-s">{t.k === "go" ? "Go out" : t.k === "learn" ? "Learn" : p.navLabel}</span><small>{p.navLabel}</small>
              </button>
            );
          })}
        </nav>
        <a href="/me" className="k-btn k-btn--ghost k-btn--s h3-acct">Your account</a>
      </div>
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
              <h1>The good nights, and people to go with.</h1>
              <p>Every night here has someone you can trust behind it. Get in with two taps. Going alone? We'll find you a crew.</p>
              <div className="h3-btns"><a className="h3-key" href="/whats-on">See what's on</a><a className="h3-ghost" href="#story">Watch a night happen</a></div>
            </div>
            {ring.length > 2 ? <div className="h3-ring h2x"><Carousel3D nights={ring} allHref="/whats-on" allLabel={`All ${d.weekCount} nights this week`} /></div> : null}
          </section>
        )}
        {tab === "artists" && (
          <section className="h3-hero h3-split" key="artists">
            <div className="h3-copy">
              <span className="h3-eye" style={{ color: PRODUCTS.artists.colour }}>Book artists · Artists</span>
              <h1>Every record, every era, one page.</h1>
              <p>{d.artistCount} South Asian artists, from their first release to their next date. Fans leave notes. Organisers book with a contract both sides sign.</p>
              <div className="h3-btns"><a className="h3-key" href={productLink("artists", "/artists")}>Find an artist</a><a className="h3-ghost" href={productLink("artists", "/claim")}>Is your page here? Claim it</a></div>
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
              <h1>Throw the party. We've got the door.</h1>
              <p>A page in your colours, tickets or a list, a door that keeps working with no signal, and the numbers by morning. Free parties stay free.</p>
              <div className="h3-btns"><a className="h3-key" href={productLink("gate", "/make")}>Make a party</a><a className="h3-ghost" href={productLink("gate", "/")}>See everything it does</a></div>
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
              <h1>Learn music by making it.</h1>
              <p>Lessons you play along to on a real instrument, in your browser. Every one ends with something you made, and lesson 1 is free.</p>
              <div className="h3-btns"><a className="h3-key" href={productLink("school", "/learn")}>Start lesson 1</a></div>
            </div>
            <div className="h3-learn" aria-hidden="true">
              <div className="h3-phone h3-phone--s"><div><img src="/shots/W35-Lesson.webp" alt="" /></div></div>
              <div className="h3-keys">{Array.from({ length: 8 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 0.4}s` }} />)}</div>
            </div>
          </section>
        )}

        {tab === "go" && d.tonight.length + d.week.length > 0 && (
          <div className="h3-tick" aria-label="This week">
            <div>{[0, 1].map((r) => <span key={r} aria-hidden={r === 1 ? true : undefined}>{d.week.map((w) => <em key={`${r}-${w.id}`}><b>{DAY(w.event_date)}</b>{w.title}{w.venue ? `, ${w.venue}` : ""}</em>)}</span>)}</div>
          </div>
        )}

        <section id="story" className={`h3-story n${n}${n === 1 ? " one" : ""}`} key={`story-${tab}`} style={{ ["--n" as string]: n, ["--dur" as string]: `${n * 3}s` }}>
          <div className="h3-story-copy">
            <h2>{story.h}</h2>
            <ol className="h3-steps" style={{ gridTemplateColumns: `repeat(${Math.min(n, 5)}, minmax(0, 1fr))` }}>
              {story.steps.map((s, i) => (
                <li key={s.t} className="h3-step" style={{ animationDelay: `${-(n - i) * 3 % (n * 3)}s` }}>
                  <span className="h3-n">{String(i + 1).padStart(2, "0")}</span>
                  <b>{s.t}</b>
                  <span>{s.s}</span>
                  <i className="h3-bar" style={{ animationDelay: `${-(n - i) * 3 % (n * 3)}s` }} />
                </li>
              ))}
            </ol>
          </div>
          <div className="h3-phone" aria-hidden="true"><div>
            {story.steps.map((s, i) => <img key={s.shot} src={`/shots/${s.shot}.webp`} alt="" className="h3-shot" style={{ animationDelay: `${-(n - i) * 3 % (n * 3)}s` }} />)}
          </div></div>
        </section>

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

        <section className="h3-suite">
          <div className="h3-suite-head">
            <h2>Four apps that already know each other.</h2>
            <p>One sign-in. The artist you follow plays a night, you get in, your crew forms, the host's door lets you through, and the stub lands on your page.</p>
          </div>
          <div className="h3-wire" aria-hidden="true">{PRODUCT_ORDER.map((id, i) => <span key={id} style={{ display: "contents" }}>{i > 0 && <i />}<b style={{ background: PRODUCTS[id].colour }} /></span>)}</div>
          <div className="h3-cards">
            {TABS.map((t) => {
              const p = PRODUCTS[t.id];
              return (
                <button key={t.k} type="button" className="h3-card" aria-pressed={tab === t.k} onClick={() => pick(t.k, true)} style={{ ["--c" as string]: p.colour }}>
                  <span className="h3-eye" style={{ color: p.colour }}>{p.verb}</span>
                  <b>{p.navLabel}</b>
                  <span>{t.k === "go" ? "Find it, get in, bring a crew." : t.k === "artists" ? "Every record, every era, a contract." : t.k === "host" ? "The page, the list, the door, the report." : "Make a track while you learn."}</span>
                </button>
              );
            })}
          </div>
        </section>

        {d.week.length > 0 && (
          <section className="h3-week">
            <div className="h3-week-head"><h2>On this week.</h2><a href="/whats-on">All {d.weekCount} nights →</a></div>
            <div className="h3-nights">
              {d.week.slice(0, 10).map((w) => (
                <a key={w.id} className="h3-night" href={w.ticket_url ?? w.url} target="_blank" rel="noopener">
                  {w.image_url
                    ? <img src={w.image_url} alt="" loading="lazy" />
                    : <span className="h3-made" dangerouslySetInnerHTML={{ __html: posterSvg({ title: w.title, lineup: (w.lineup ?? []).filter(Boolean), venue: w.venue, city: city(w.city), date: w.event_date, time: w.event_time }) }} />}
                  <span className="h3-eye" style={{ color: PRODUCTS.ccd.colour }}>{DAY(w.event_date)} · {city(w.city)}</span>
                  <b>{w.title}</b>
                  {w.venue && <span>{w.venue}</span>}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}
