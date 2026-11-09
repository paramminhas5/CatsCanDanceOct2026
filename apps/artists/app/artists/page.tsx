/**
 * All artists (boards W39-All, W39-AllBook, A39-All, A39-AllBook). One page, two modes:
 * discover (follow, next shows) and book for a date (who is free, their rate, add up to three to one ask).
 * Filters are a plain GET form, so the page works without JavaScript and every view has a URL.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Led, Tag, Icon } from "@ccd/ui";
import { ArtistTile, Empty, Segmented } from "@/components/bits";
import { getDeskArtists } from "@/lib/booking-desk-server";
import { ACT_FILTERS, BUDGETS, DESK_CITIES, rankArtists, inrShort, dayShort, isIsoDay, actLine, soundLine, type Ranked } from "@/lib/desk";
import { displayName } from "@/lib/artist-v2";
import { todayIST } from "@/lib/db";

export const revalidate = 300;
export const metadata: Metadata = { title: "All artists", description: "South Asian electronic artists: DJs, live acts, VJs and photographers. Follow them, or see who is free on your date and book." };

type SP = { mode?: string; date?: string; city?: string; budget?: string; act?: string; q?: string; sound?: string };
const PAGE = 48;

export default async function AllArtists({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const book = sp.mode === "book";
  const today = todayIST();
  const brief = {
    date: isIsoDay(sp.date) && sp.date >= today ? sp.date : "",
    city: (sp.city ?? "").slice(0, 40),
    budget: BUDGETS.some((b) => b.key === sp.budget) ? (sp.budget as string) : "",
    act: ACT_FILTERS.some((a) => a.key === sp.act) ? (sp.act as string) : "",
    sound: (sp.sound ?? "").slice(0, 40),
    q: (sp.q ?? "").slice(0, 60),
  };
  const { artists } = await getDeskArtists();
  const ranked = rankArtists(artists, brief, today);
  const shown = ranked.slice(0, PAGE);
  const free = ranked.filter((r) => r.group === "free").length;
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams(Object.entries({ ...brief, ...extra }).filter(([, v]) => v) as [string, string][]);
    return `/artists${p.size ? `?${p}` : ""}`;
  };

  return (
    <main className="k-root">
      <section className="k-wrap pt-10 md:pt-12">
        <div className="flex flex-wrap items-end gap-6">
          <div className="min-w-[280px] flex-1">
            <h1 className="k-d text-[52px] md:text-[72px]">All artists</h1>
            <p className="k-b mt-3 text-[17px] md:text-[18px]">
              {book
                ? brief.date ? `${free} free on ${dayShort(brief.date)}${brief.city ? ` around ${brief.city}` : ""}. Tick up to three and send one ask.` : "Pick a date to see who is free. Tick up to three and send one ask."
                : `${artists.length} DJs, live acts, VJs and photographers. Follow them, or switch to booking to see who is free on your date.`}
            </p>
          </div>
          <Segmented label="Mode" items={[{ href: qs({ mode: "" }), label: "Discover", on: !book }, { href: qs({ mode: "book" }), label: "Book for a date", on: book }]} />
        </div>

        <form method="get" action="/artists" className="mt-7 grid gap-3 md:grid-cols-[1.4fr_repeat(4,1fr)_auto]">
          {book && <input type="hidden" name="mode" value="book" />}
          <label className="sr-only" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={brief.q} placeholder="Search an artist, a sound or a city" className="k-field" />
          {book ? (
            <>
              <label className="sr-only" htmlFor="date">Date</label>
              <input id="date" name="date" type="date" min={today} defaultValue={brief.date} className="k-field" />
            </>
          ) : (
            <>
              <label className="sr-only" htmlFor="sound">Sound</label>
              <input id="sound" name="sound" defaultValue={brief.sound} placeholder="Sound, e.g. house" className="k-field" />
            </>
          )}
          <label className="sr-only" htmlFor="city">City</label>
          <select id="city" name="city" defaultValue={brief.city} className="k-field">
            <option value="">Any city</option>
            {DESK_CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="sr-only" htmlFor="act">Act</label>
          <select id="act" name="act" defaultValue={brief.act} className="k-field">
            {ACT_FILTERS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="budget">Budget</label>
          <select id="budget" name="budget" defaultValue={brief.budget} className="k-field">
            {BUDGETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
          <button className="k-btn k-btn--ghost" type="submit">Show</button>
        </form>
      </section>

      <section className="k-wrap pt-10">
        {shown.length === 0 ? (
          <Empty title="No one matches that yet" line="Try another city, a wider budget or a different date." action={<ButtonLink href={book ? "/artists?mode=book" : "/artists"}>Clear the filters</ButtonLink>} />
        ) : book ? (
          <form method="get" action="/book">
            {brief.date && <input type="hidden" name="date" value={brief.date} />}
            {brief.city && <input type="hidden" name="city" value={brief.city} />}
            {brief.budget && <input type="hidden" name="budget" value={brief.budget} />}
            <ul className="grid list-none grid-cols-2 gap-x-5 gap-y-8 p-0 md:grid-cols-4">
              {shown.map((r) => <BookCard key={r.a.slug} r={r} dated={!!brief.date} />)}
            </ul>
            <div className="sticky bottom-4 z-20 mx-auto mt-10 flex max-w-[760px] items-center gap-4 rounded-[32px] p-3 pl-6" style={{ background: "#161618", boxShadow: "inset 0 0 0 1px var(--k-hair2), 0 30px 60px -10px #000" }}>
              <span className="flex-1"><b className="block text-[16px] font-semibold">Your ask{brief.date ? ` for ${dayShort(brief.date)}` : ""}</b><span className="k-b text-[13px]">Tick up to three. Each replies on their own.</span></span>
              <button type="submit" className="k-btn k-btn--key">Write the ask</button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
            {shown.map((r) => (
              <ArtistTile key={r.a.slug} slug={r.a.slug} name={displayName(r.a.name)} photo={r.a.photo_url}
                line={[r.a.acts.length ? actLine(r.a.acts.slice(0, 1)) : null, soundLine(r.a.genres, 1), r.a.city].filter(Boolean).join(", ")}
                foot={r.a.next_label ? <span className="mt-1.5 block text-[13px]" style={{ color: "var(--k-pc)" }}>{r.a.next_label}</span> : null} />
            ))}
          </div>
        )}
        {ranked.length > PAGE && <p className="k-b mt-10">Showing the first {PAGE} of {ranked.length}. Search or filter to find someone.</p>}
        <p className="k-b mt-6 text-sm">Missing someone? <Link href="/claim">Add an artist</Link>.</p>
      </section>
    </main>
  );
}

function BookCard({ r, dated }: { r: Ranked; dated: boolean }) {
  const { a } = r;
  const dim = r.group === "busy";
  const good = r.reasons.find((x) => x.tone === "good");
  const bad = r.reasons.find((x) => x.tone === "bad");
  return (
    <li className={dim ? "opacity-50" : undefined}>
      <label className="block cursor-pointer">
        <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[#16161a]">
          {a.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          )}
          {a.acts[0] && <span className="absolute left-3 top-3"><Tag>{actLine(a.acts.slice(0, 1))}</Tag></span>}
          <input type="checkbox" name="a" value={a.slug} disabled={dim} className="absolute right-3 top-3 h-6 w-6 accent-[var(--k-pc)]" aria-label={`Add ${displayName(a.name)} to the ask`} />
        </div>
        <b className="mt-3 block truncate text-[17px] font-semibold">{displayName(a.name)}</b>
        <span className="k-b block truncate text-[13px]">{[soundLine(a.genres, 2), a.city].filter(Boolean).join(", ")}</span>
        <span className="mt-2 flex items-center justify-between gap-2 text-[13px]">
          <span className="font-semibold">{r.rate ? `From ${inrShort(r.rate)}` : "Rate on request"}</span>
          {dated && (bad ? <Led state="off">{bad.label}</Led> : good ? <Led>{good.label}</Led> : null)}
        </span>
      </label>
      <Link href={`/${a.slug}`} className="mt-1 inline-flex items-center gap-1 text-[13px]" style={{ color: "var(--k-t2)" }}>See page <Icon name="chev" size={12} /></Link>
    </li>
  );
}
