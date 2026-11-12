/**
 * On tour: who is coming to which city, week by week (the tour board, fed by tour_board).
 * Promoters in that city can ask for a date straight from here.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { SectionHead, Pill, ButtonLink, Tag } from "@ccd/ui";
import { Empty } from "@/components/bits";
import { loadTourBoard, windowLabel, weekStart, weekLabel, cityNorm, TOUR_CITIES } from "@/lib/tour";
import { displayName } from "@/lib/artist-v2";

export const revalidate = 300;
export const metadata: Metadata = { title: "On tour", description: "Artists coming to Indian cities, week by week. Ask for a date while they are in town." };

export default async function Tour({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const { city = "" } = await searchParams;
  const want = TOUR_CITIES.find((c) => c.toLowerCase() === city.toLowerCase()) ?? "";
  const { stops } = await loadTourBoard();
  const list = want ? stops.filter((s) => cityNorm(s.city) === cityNorm(want)) : stops;
  const weeks = new Map<string, typeof list>();
  for (const s of list) {
    const w = weekStart(s.from_date);
    weeks.set(w, [...(weeks.get(w) ?? []), s]);
  }
  const cities = [...new Set(stops.map((s) => cityNorm(s.city)).filter(Boolean))].slice(0, 10);
  return (
    <main className="k-root">
      <section className="k-wrap pt-10">
        <SectionHead title="On tour" sub="Who is coming to which city. Follow to hear first, or ask for a date while they are in town." right={<ButtonLink href="/me/tour">Put your tour up</ButtonLink>} />
        <div className="mt-6 flex flex-wrap gap-2">
          <Pill href="/tour" on={!want}>Everywhere</Pill>
          {cities.map((c) => <Pill key={c} href={`/tour?city=${encodeURIComponent(c)}`} on={cityNorm(want) === c}>{c}</Pill>)}
        </div>
      </section>
      <section className="k-wrap pt-8">
        {list.length === 0 ? (
          <Empty title={want ? `No one listed for ${want} yet` : "No tours listed yet"} line="Tours show up here when artists post them or when we spot them on nights we list." action={<ButtonLink href="/tour">See every city</ButtonLink>} />
        ) : (
          [...weeks.entries()].map(([w, rows]) => (
            <div key={w} className="mt-10 first:mt-0">
              <h2 className="k-m !text-[var(--k-tx)]">{weekLabel(w)}</h2>
              <ul className="mt-2 list-none p-0">
                {rows.map((s) => (
                  <li key={s.id} className="k-li">
                    <span className="k-m w-[120px] flex-none !text-[var(--k-tx)]">{windowLabel(s.from_date, s.to_date)}</span>
                    <span className="min-w-0 flex-1">
                      <b>{s.artist_slug ? <Link href={`/${s.artist_slug}`}>{displayName(s.artist_name)}</Link> : displayName(s.artist_name)}</b>
                      <small>{[s.city, s.venue ?? s.title].filter(Boolean).join(" · ")}</small>
                    </span>
                    {s.state === "open" ? <Tag>Free for bookings</Tag> : s.ticket_url ? <a href={s.ticket_url} target="_blank" rel="noopener" className="text-sm font-semibold" style={{ color: "var(--k-pc)" }}>Tickets</a> : null}
                    {s.artist_slug && s.state === "open" && <ButtonLink size="s" href={`/book?a=${s.artist_slug}&date=${s.from_date}&city=${encodeURIComponent(s.city)}`}>Ask</ButtonLink>}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
