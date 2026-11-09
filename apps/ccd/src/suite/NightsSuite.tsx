/**
 * Nights front page on the suite look (board F38-LandNights): our next nights, what is on this week,
 * and every past Episode. Tickets and the crew live on each night's page.
 */
import type { CcdEvent } from "@/lib/ccd-db";
import { ButtonLink, SectionHead, Readout, Cat } from "@ccd/ui";
import Shell from "@/suite/Shell";
import { dayLabel, city } from "@/suite/bits";

export type NightsProps = { upcoming: CcdEvent[]; past: CcdEvent[]; weekCount: number };

export default function NightsSuite({ upcoming, past, weekCount }: NightsProps) {
  const next = upcoming[0] ?? null;
  return (
    <Shell title="Nights | Cats Can Dance" description="Our own nights, the Episodes, and every night we would go to this week. Tickets, guest lists and a crew if you are going alone.">
      <section className="k-wrap grid items-center gap-10 pt-10 md:grid-cols-[1fr_1fr] md:pt-14">
        <div className="k-rv">
          <h1 className="k-d text-[56px] md:text-[96px]">Go out.</h1>
          <p className="k-b mt-5 max-w-[540px] text-[18px]">The nights worth your week, picked by us. Get a ticket, ask for the guest list, or go with a crew if you are going alone.</p>
          <div className="mt-7 flex flex-wrap gap-3"><ButtonLink variant="key" size="l" href="/whats-on">See this week</ButtonLink>{next && <ButtonLink size="l" href={`/nights/${next.slug}`}>Our next night</ButtonLink>}</div>
          <div className="mt-8 max-w-[520px]"><Readout cells={[{ value: weekCount, label: "Nights this week" }, { value: past.length, label: "Episodes so far" }]} /></div>
        </div>
        <div className="k-rvs relative grid min-h-[380px] place-items-center overflow-hidden rounded-[28px]" style={{ background: "radial-gradient(90% 110% at 70% 20%, color-mix(in srgb, var(--k-pc) 80%, #fff), var(--k-pc) 55%, color-mix(in srgb, var(--k-pc) 70%, #000))" }}>
          <Cat name="dance" height={260} move="sway" />
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="k-wrap k-section">
          <SectionHead title="Coming up" sub="Our nights. Tickets or the guest list on each one." />
          <ul className="mt-6 list-none p-0">
            {upcoming.map((e) => (
              <li key={e.slug}>
                <a className="k-li" href={`/nights/${e.slug}`}>
                  <span className="k-m w-[110px] flex-none !text-[var(--k-tx)]">{dayLabel(e.event_date ?? e.date)}</span>
                  <span className="min-w-0 flex-1"><b>{e.title}</b><small>{[e.start_time?.slice(0, 5), e.venue, city(e.city)].filter(Boolean).join(" · ")}</small></span>
                  <span className="text-sm font-semibold" style={{ color: "var(--k-pc)" }}>{e.ticket_url ? "Tickets" : e.rsvp_open ? "Guest list" : "See it"}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="k-wrap k-section">
          <SectionHead title="The Episodes" sub="Every night we have thrown." />
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {past.map((e) => (
              <a key={e.slug} href={`/nights/${e.slug}`} className="k-rvs block no-underline">
                <div className="aspect-[3/4] overflow-hidden rounded-[12px] bg-[#16161a]">
                  {e.poster_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.poster_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                <b className="mt-3 block truncate text-[15px] font-semibold">{e.title}</b>
                <span className="k-b block text-[13px]">{dayLabel(e.event_date ?? e.date)}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
