/**
 * catscandance.com: the one page that has everything (plan: ccd/v2-plan.md, section 3).
 * What it is, then this week as a 3D carousel, the four apps running on a phone, one night told from
 * both sides, our Episodes, the artists, the loops, and the doors for people who work with us.
 * Data: getHomeData (published scene nights with their cover posters, Episodes, featured artists).
 */
import { posterSvg } from "@ccd/ui";
import { PRODUCTS, productLink } from "@ccd/brand";
import type { HomeData } from "@/lib/home";
import Shell from "@/suite/Shell";
import { dayLabel, city } from "@/suite/bits";
import Carousel3D, { type RingNight } from "./Carousel3D";
import AppStage, { type StageApp } from "./AppStage";
import { CSS } from "./home2.css";

const P = PRODUCTS;
const DAY = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "");
const DAYS_TO = (iso: string | null | undefined, today: string) => (iso ? Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5) : null);

export default function Home2(d: HomeData) {
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
  const where = d.weekCities.length === 1 ? d.weekCities[0] : "India";

  const apps: StageApp[] = [
    {
      key: "nights", name: "Nights", verb: "Go out", colour: P.ccd.colour, ink: "#FFFFFF", url: "catscandance.com/nights",
      line: "This week's nights, tickets, guest lists and crews.",
      headline: "Go out.", body: "The nights worth your week, picked by people who go out. Get a ticket, ask for the guest list, or go with a crew so you never go alone.",
      primary: { label: "See this week", href: "/whats-on" }, secondary: { label: "How Nights works", href: "/nights" },
      facts: [`${d.weekCount} nights this week`, "Your ticket works with no signal", "Crews matched at 18:00 on the day"],
      steps: [{ shot: "S34-Discover", cap: "Look through the week" }, { shot: "S34-Night", cap: "Pick a night" }, { shot: "S34-GetIn", cap: "Ticket, guest list or a crew" }, { shot: "S34-Ticket", cap: "Show it at the door" }, { shot: "S34-Crew", cap: "Meet your crew" }],
    },
    {
      key: "artists", name: "Artists", verb: "Find and book", colour: P.artists.colour, ink: "#0A0A0B", url: "artists.catscandance.com",
      line: "Follow artists, hear what they put out, book them.",
      headline: "Find and book.", body: "Every South Asian DJ, live act, VJ and photographer we know, with their music, their shows and their eras on one page that keeps itself up to date. Book them for your night in one thread.",
      primary: { label: "Find artists", href: productLink("artists", "/artists") }, secondary: { label: "How Artists works", href: productLink("artists", "/") },
      facts: [`${d.artistCount} artists`, "Every release and show, kept up to date", "Ask, counter and confirm in one thread"],
      steps: [{ shot: "A39-AllBook", cap: "Who is free on your date" }, { shot: "A40-Artist", cap: "Hear them, see their shows" }, { shot: "F38-A-Offer", cap: "Send an offer in their range" }, { shot: "F38-A-Bookings", cap: "Steps to the gig, both sides" }, { shot: "F38-A-Today", cap: "Artists run it all from here" }],
    },
    {
      key: "host", name: "Host", verb: "Throw a party", colour: P.gate.colour, ink: "#0A0A0A", url: "host.catscandance.com",
      line: "Make the party, send the invite, run the door.",
      headline: "Throw a party.", body: "Make a party in two minutes and send the link. People say they are coming, you book artists and gear from the same app, and the door scans them in even when the signal drops.",
      primary: { label: "Make a party", href: productLink("gate", "/make") }, secondary: { label: "How Host works", href: productLink("gate", "/") },
      facts: ["Try it before you sign in", "The door works offline", "Brings in Skillbox and District tickets"],
      steps: [{ shot: "H39-Make", cap: "Make the party" }, { shot: "H39-Invite", cap: "Send the invite" }, { shot: "H39-RSVP", cap: "See who is coming" }, { shot: "H39-Door", cap: "Run the door" }, { shot: "H39-Report", cap: "Read how it went" }],
    },
    {
      key: "school", name: "School", verb: "Learn to make music", colour: P.school.colour, ink: "#0A0A0B", url: "school.catscandance.com",
      line: "Make your own track on a real instrument.",
      headline: "Learn.", body: "Learn production and DJing on a real instrument in your browser. Short lessons, and each one adds something to a track that is yours.",
      primary: { label: "Start lesson 1", href: productLink("school", "/learn") }, secondary: { label: "How School works", href: productLink("school", "/") },
      facts: ["Lesson 1 is free", "Production and DJing", "The best tracks play at an Episode"],
      steps: [{ shot: "W35-Lesson", cap: "Tune the kick to the bass" }],
    },
  ];

  const story = [
    { n: "01", app: "Nights", c: P.ccd.colour, t: "Aditi finds it on Tuesday", s: `She sees ${next?.title ?? "the Episode"}, buys two tickets and joins a crew so she isn't going alone.`, shot: "S34-Ticket" },
    { n: "02", app: "Artists", c: P.artists.colour, t: "We book the headliner", s: "An offer inside the artist's range, the terms agreed and the set time fixed in one thread.", shot: "S34-Booked" },
    { n: "03", app: "Host", c: P.gate.colour, t: "Host runs the door", s: "Tickets, the guest list and outside tickets scan in. When the signal drops, it keeps going.", shot: "H39-Door" },
    { n: "04", app: "School", c: P.school.colour, t: "Someone hears their track", s: "A track made in School plays at 01:00. Everyone there gets the stub.", shot: "W35-Lesson" },
  ];

  const loops = [
    { t: "Go with a crew", s: "Buy a ticket and send the second one. Going alone? We match you with 3 to 6 people.", shot: "S34-Crew", href: "/whats-on", c: P.ccd.colour },
    { t: "Claim your page", s: "Every artist already has a page. Claim it and share it with your fans.", shot: "F38-A-Page", href: productLink("artists", "/claim"), c: P.artists.colour },
    { t: "Send your invite", s: "Every invite lands in front of the people who will throw the next party.", shot: "H39-Invite", href: productLink("gate", "/make"), c: P.gate.colour },
    { t: "Keep the stub", s: "The door scans you in and the night joins your set. Share it after.", shot: "S34-BeenTo", href: "/me", c: P.ccd.colour },
    { t: "Share your track", s: "Fifteen seconds of the track you made. The best ones play at an Episode.", shot: "W35-Lesson", href: productLink("school", "/learn"), c: P.school.colour },
  ];

  const posters = d.past.filter((e) => e.poster_url).slice(0, 6);
  const artists = d.featured.filter((a) => a.photo).slice(0, 5);

  return (
    <Shell title="Cats Can Dance: find a night, find your crew, come to ours" description="Four apps from the people behind the Episodes: find a night and go, follow and book artists, throw a party and run the door, and learn to make music.">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="h2x">
        {/* 1. What this is */}
        <section className="h2-hero">
          <div className="h2-hero-copy">
            <span className="h2-eye">Cats Can Dance · Bengaluru</span>
            <h1>Find a night.<br />Find your crew.<br /><em>Come to ours.</em></h1>
            <p>Cats Can Dance is four apps for going out, finding artists, throwing parties and learning to make music, from the people behind the Episodes. One sign-in for all four.</p>
            <div className="h2-btns"><a className="h2-key" href="#week">See this week</a><a className="h2-ghost" href="#apps">How it works</a></div>
          </div>
          <div className="h2-hero-side" aria-hidden="true">
            <img className="h2-cat" src="/cats/dance.webp" alt="" />
            <div className="h2-read">
              <span><b>{d.weekCount}</b>nights this week</span>
              <span><b>{d.artistCount}</b>artists</span>
              <span><b>{(next?.episode_no ?? d.past.length + 1).toString().padStart(2, "0")}</b>{until != null && until >= 0 ? `Episode in ${until} days` : "Episodes"}</span>
            </div>
          </div>
        </section>

        {/* 2. This week */}
        {ring.length > 2 && (
          <section className="h2-week" id="week">
            <div className="h2-head"><h2>This week in {where}</h2><p>Every night here is one we would go to. Drag the ring, tap a poster to flip it.</p></div>
            <Carousel3D nights={ring} allHref="/whats-on" allLabel={`All ${d.weekCount} nights this week`} />
          </section>
        )}

        {/* 3. The four apps */}
        <section className="h2-apps" id="apps">
          <div className="h2-head"><h2>Four apps, one sign-in</h2><p>Each one does one thing well, and they work better together. Pick one to see it run.</p></div>
          <AppStage apps={apps} />
        </section>

        {/* 4. One night, four apps */}
        <section className="h2-story">
          <div className="h2-head"><h2>One night, four apps</h2><p>{next ? `${next.title}, ${dayLabel(nextDate)}${next.venue ? ` at ${next.venue}` : ""}, from both sides of the door.` : "An Episode, from both sides of the door."}</p></div>
          <div className="h2-story-grid">
            {story.map((s) => (
              <article key={s.n} className="h2-step">
                <span className="h2-step-n"><i style={{ background: s.c }} />{s.n} · {s.app}</span>
                <h3>{s.t}</h3>
                <p>{s.s}</p>
                <div className="h2-mini"><img src={`/shots/${s.shot}.webp`} alt="" loading="lazy" /></div>
              </article>
            ))}
          </div>
        </section>

        {/* 5. Our nights */}
        <section className="h2-ours">
          <div className="h2-ours-copy">
            <h2>Our nights</h2>
            <p>About once a month we throw our own. Every one gets a poster, and everyone who comes gets the stub.</p>
            {next && (
              <a className="h2-ticket" href={`/nights/${next.slug}`}>
                <span className="h2-ticket-k">Next · {dayLabel(nextDate)}{until != null && until >= 0 ? ` · in ${until} days` : ""}</span>
                <b>{next.title}</b>
                <span>{[next.venue, city(next.city)].filter(Boolean).join(", ")}</span>
                <span className="h2-ticket-go">{d.nextHasTickets ? "Get tickets" : "See the night"}</span>
              </a>
            )}
          </div>
          <div className="h2-posters">
            {posters.map((e, i) => <a key={e.slug} href={`/nights/${e.slug}`} style={{ ["--r" as string]: `${(i % 2 ? 1 : -1) * (2 + (i % 3))}deg` }}><img src={e.poster_url as string} alt={e.title} loading="lazy" /></a>)}
          </div>
        </section>

        {/* 6. Artists, bolder */}
        <section className="h2-artists" style={{ ["--ac" as string]: P.artists.colour }}>
          <div className="h2-artists-copy">
            <span className="h2-eye" style={{ color: P.artists.colour }}>Artists</span>
            <h2>Every artist, and everything they put out.</h2>
            <p>Their records, their shows, their eras and who they play with, on a page that updates itself. Follow them to hear first when they play your city, or book them for your night.</p>
            <div className="h2-btns"><a className="h2-key lime" href={productLink("artists", "/artists")}>Find artists</a><a className="h2-ghost" href={productLink("artists", "/artists?mode=book")}>Book for a night</a></div>
          </div>
          <div className="h2-faces">
            {artists.map((a, i) => (
              <a key={a.slug} href={productLink("artists", `/${a.slug}`)} className={`h2-face f${i}`}>
                <img src={a.photo} alt="" loading="lazy" />
                <span><b>{a.name}</b>{[city(a.city), a.genres[0]].filter(Boolean).join(", ")}</span>
              </a>
            ))}
            <div className="h2-vinyl" aria-hidden="true"><i /></div>
          </div>
        </section>

        {/* 7. The loops */}
        <section className="h2-loops">
          <div className="h2-head"><h2>Better with your people</h2><p>Every app is built so using it brings someone else in.</p></div>
          <div className="h2-loop-row">
            {loops.map((l) => (
              <a key={l.t} href={l.href} className="h2-loop" style={{ ["--c" as string]: l.c }}>
                <div className="h2-loop-shot"><img src={`/shots/${l.shot}.webp`} alt="" loading="lazy" /></div>
                <b>{l.t}</b>
                <span>{l.s}</span>
              </a>
            ))}
          </div>
        </section>

        {/* 8. Work with us */}
        <section className="h2-work">
          <h2>Work with us</h2>
          <div className="h2-doors">
            <a href="/for-artists"><b>For artists</b><span>Your page is already here. Claim it, take bookings, post your tour.</span></a>
            <a href="/for-venues"><b>For venues</b><span>Run the door on Host and list your nights on Nights.</span></a>
            <a href={productLink("gate", "/promote")}><b>For promoters</b><span>Your nights under your name, with tickets, crews and the door.</span></a>
            <a href="mailto:hello@catscandance.com?subject=Brand%20partnership"><b>For brands</b><span>Partner on an Episode and the content around it.</span></a>
          </div>
        </section>
      </div>
    </Shell>
  );
}
