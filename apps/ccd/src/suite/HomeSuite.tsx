/**
 * catscandance.com on the suite look (board W39-Home): find a night, find your crew, come to ours.
 * The four products as doors, this week's nights, our next Episode. Real data from getHomeData.
 */
import { ButtonLink, SectionHead, Cat, Readout, Icon } from "@ccd/ui";
import { PRODUCTS, productUrl, productLink } from "@ccd/brand";
import type { HomeData } from "@/lib/home";
import Shell from "@/suite/Shell";
import { dayLabel, city } from "@/suite/bits";

const DOORS = [
  { id: "ccd" as const, verb: "Go out", line: "This week's nights. Tickets, guest lists, and a crew if you are going alone.", href: "/whats-on", cat: "dance" as const },
  { id: "artists" as const, verb: "Find and book", line: "Buy their music, see where they play next, book them for your night.", href: productUrl("artists"), cat: "lime" as const },
  { id: "gate" as const, verb: "Host", line: "Throw a party: list it, book artists and gear, run the door.", href: productUrl("gate"), cat: "yellow" as const },
  { id: "school" as const, verb: "Learn", line: "Make music on a real instrument. Lesson 1 is free.", href: productUrl("school"), cat: "pink" as const },
];

export default function HomeSuite(d: HomeData) {
  return (
    <Shell title="Cats Can Dance: find a night, find your crew, come to ours" description="The nights worth going to in India, picked by people who go out. Follow artists, throw a party, or learn to make the music.">
      <section className="k-wrap grid items-end gap-10 pt-10 md:grid-cols-[1.25fr_1fr] md:pt-16">
        <h1 className="k-d k-rv text-[56px] md:text-[104px]">Find a night.<br />Find your crew.<br />Come to ours.</h1>
        <div className="k-rv pb-2">
          <p className="k-b text-[18px] md:text-[19px]">The nights worth going to in India, picked by people who go out. Follow the artists, throw your own party, or learn to make the music.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink variant="key" size="l" href="/whats-on">See this week</ButtonLink>
            {d.next && <ButtonLink size="l" href={`/nights/${d.next.slug}`}>{d.next.title}, {dayLabel(d.next.event_date ?? d.next.date)}</ButtonLink>}
          </div>
        </div>
      </section>

      <section className="k-wrap pt-14">
        <div className="grid gap-4 md:grid-cols-4">
          {DOORS.map((x) => {
            const p = PRODUCTS[x.id];
            return (
              <a key={x.id} href={x.href} className="k-surface k-rvs relative block min-h-[300px] overflow-hidden rounded-[28px] p-7 no-underline" style={{ boxShadow: `inset 0 0 0 1px var(--k-hair), inset 0 3px 0 ${p.colour}` }}>
                <span className="flex items-center gap-2 text-[14px] font-semibold"><i className="h-2 w-2 rounded-full" style={{ background: p.colour }} aria-hidden="true" />{p.navLabel}</span>
                <b className="k-d mt-4 block text-[38px]">{x.verb}</b>
                <span className="k-b mt-3 block max-w-[30ch] text-[15px]">{x.line}</span>
                <span className="absolute bottom-5 right-6"><Cat name={x.cat} height={96} move="still" /></span>
              </a>
            );
          })}
        </div>
      </section>

      {d.week.length > 0 && (
        <section className="k-wrap k-section">
          <SectionHead title={`This week${d.weekCities.length === 1 ? ` in ${d.weekCities[0]}` : ""}`} sub={`${d.weekCount} nights we would go to. Tickets and guest lists are with each night.`} right={<ButtonLink variant="key" size="s" href="/whats-on">All {d.weekCount} nights</ButtonLink>} />
          <ul className="mt-8 grid list-none gap-5 p-0 md:grid-cols-3">
            {d.week.slice(0, 6).map((n) => (
              <li key={n.id} className="k-rvs">
                <a href={n.ticket_url ?? n.url} target="_blank" rel="noopener" className="k-surface block h-full rounded-[22px] p-6 no-underline">
                  <span className="k-m" style={{ color: "var(--k-pc)" }}>{dayLabel(n.event_date)}</span>
                  <b className="k-d mt-3 block text-[28px]">{n.title}</b>
                  <span className="k-b mt-2 block">{[n.venue, city(n.city)].filter(Boolean).join(", ")}</span>
                  {n.artists.length > 0 && <span className="mt-3 block text-[14px] font-semibold">{n.artists.map((a) => a.name).join(", ")}</span>}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="k-wrap k-section">
        <div className="grid items-end gap-10 md:grid-cols-[380px_1fr]">
          <div className="k-rv">
            <h2 className="k-d text-[48px] md:text-[64px]">Our nights</h2>
            <p className="k-b mt-4 text-[18px]">About once a month we throw our own.{d.next ? ` ${d.next.title} is ${dayLabel(d.next.event_date ?? d.next.date)}${d.next.venue ? ` at ${d.next.venue}` : ""}.` : ""}</p>
            <div className="mt-6">{d.next ? <ButtonLink variant="key" size="l" href={`/nights/${d.next.slug}`}>{d.nextHasTickets ? "Get tickets" : "See the night"}</ButtonLink> : <ButtonLink size="l" href="/nights">Past Episodes</ButtonLink>}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {d.past.filter((e) => e.poster_url).slice(0, 4).map((e) => (
              <a key={e.slug} href={`/nights/${e.slug}`} className="k-rvs block aspect-[3/4] overflow-hidden rounded-[12px] bg-[#16161a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.poster_url as string} alt={e.title} className="h-full w-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="k-wrap k-section">
        <div className="k-surface grid items-center gap-8 rounded-[28px] p-8 md:grid-cols-[1fr_auto] md:p-12">
          <div>
            <h2 className="k-d text-[40px]">{d.artistCount} artists, one sign-in</h2>
            <p className="k-b mt-3 max-w-[60ch] text-[17px]">Follow artists on Artists, host on Host, learn on School. One account works across all of them.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={productLink("artists", "/artists")}>See the artists <Icon name="chev" size={14} /></ButtonLink>
            <ButtonLink href="/join">Join</ButtonLink>
          </div>
        </div>
        {d.weekCount > 0 && <div className="mt-6 max-w-[620px]"><Readout cells={[{ value: d.weekCount, label: "Nights this week" }, { value: d.weekCities.length, label: "Cities" }, { value: d.artistCount, label: "Artists" }]} /></div>}
      </section>
    </Shell>
  );
}
