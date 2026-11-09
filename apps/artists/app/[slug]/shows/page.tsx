/** An artist's shows: what is next, every verified past show, and the passport (board A40-ArtistShows). */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Passport, ButtonLink, Led, Icon, type StampData } from "@ccd/ui";
import ArtistTabs from "@/components/ArtistTabs";
import FollowButton from "@/components/FollowButton";
import { getArtistPage, dayParts, inrShort } from "@/lib/artist-page";
import { isSlug } from "@/lib/db";
import { RESERVED } from "@/lib/site";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };
const INKS = ["#1f5fd6", "#c2185b", "#2e7d32", "#6a1b9a", "#e65100", "#00695c", "#37474f"];
const SHAPES: StampData["shape"][] = ["round", "plain", "double"];

async function load(slug: string) {
  return isSlug(slug) && !RESERVED.has(slug) ? getArtistPage(slug) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: `${p.name}: shows`, description: `Where ${p.name} plays next, and ${p.counts.shows} shows so far.` } : { title: "Not found", robots: { index: false } };
}

export default async function Shows({ params }: Props) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const byYear = new Map<string, typeof p.past>();
  for (const g of p.past) {
    const y = g.day.slice(0, 4);
    byYear.set(y, [...(byYear.get(y) ?? []), g]);
  }
  const stamps: StampData[] = p.stamps.map((s, i) => ({ city: s.city, count: s.count, colour: INKS[i % INKS.length], shape: SHAPES[i % SHAPES.length] }));
  return (
    <main className="k-root">
      <section className="k-wrap pt-10">
        <Link href={`/${slug}`} className="k-b inline-flex items-center gap-1 text-sm"><Icon name="back" size={14} />{p.name}</Link>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <h1 className="k-d flex-1 text-[48px] md:text-[72px]">{p.name}</h1>
          <FollowButton slug={slug} name={p.name} size="m" />
          {p.fee && <ButtonLink href={`/book?a=${slug}`}>Book from {inrShort(p.fee.min)}</ButtonLink>}
        </div>
        <div className="mt-8"><ArtistTabs slug={slug} current="shows" music={p.counts.records} shows={p.counts.shows} /></div>
      </section>
      <section className="k-wrap grid items-start gap-12 pt-10 md:grid-cols-[1fr_minmax(0,560px)]">
        <div>
          <h2 className="k-d text-[36px]">Next</h2>
          {p.a.upcoming.length ? (
            <ul className="mt-4 list-none p-0">
              {p.a.upcoming.map((u) => {
                const d = dayParts(u.event_date);
                return (
                  <li key={u.id}>
                    <a className="k-li" href={u.ticket_url ?? u.url ?? "#"} target="_blank" rel="noopener">
                      <span className="k-m w-[72px] flex-none !text-[var(--k-tx)]">{d.day}</span>
                      <span className="min-w-0 flex-1"><b>{u.title}</b><small>{[u.venue, u.city].filter(Boolean).join(", ")}</small></span>
                      <span className="text-sm font-semibold" style={{ color: "var(--k-pc)" }}>Tickets</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="k-surface mt-4 flex flex-wrap items-center gap-4 rounded-[20px] px-5 py-4">
              <Led state="off"><span className="sr-only">No date</span></Led>
              <span className="flex-1"><b className="block text-[17px] font-semibold">No date listed yet</b><span className="k-b text-sm">Follow and you hear first when there is one.</span></span>
              <FollowButton slug={slug} name={p.name} size="s" />
            </div>
          )}
          {[...byYear.entries()].map(([y, list]) => (
            <div key={y} className="mt-10">
              <h2 className="k-m !text-[var(--k-tx)]">{y}</h2>
              <ul className="mt-2 list-none p-0">
                {list.map((g) => (
                  <li key={`${g.day}-${g.title}`} className="k-li">
                    <span className="k-m w-[72px] flex-none !text-[var(--k-tx)]">{dayParts(g.day).day}</span>
                    <span className="min-w-0 flex-1"><b>{g.title}</b><small>{[g.venue, g.city].filter(Boolean).join(", ")}</small></span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {stamps.length > 0 && <div className="md:sticky md:top-28"><Passport stamps={stamps} summary={`${p.counts.cities} ${p.counts.cities === 1 ? "city" : "cities"}`} /></div>}
      </section>
    </main>
  );
}
