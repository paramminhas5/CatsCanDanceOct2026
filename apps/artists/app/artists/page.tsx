/**
 * All artists (boards W39-All and W39-AllBook). One page, two modes: discover (follow, next shows) and
 * book for a date (who is free, their rate, add up to three to one ask). The filter rail on the left is
 * plain links and a GET form, so every view has a URL and works without JavaScript.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@ccd/ui";
import { Empty } from "@/components/bits";
import FollowButton from "@/components/FollowButton";
import AskBar from "@/components/AskBar";
import { getDeskArtists } from "@/lib/booking-desk-server";
import { ACT_FILTERS, BUDGETS, DESK_CITIES, rankArtists, inrShort, dayShort, isIsoDay, actLine, soundLine, normCity, type Ranked } from "@/lib/desk";
import { displayName } from "@/lib/artist-v2";
import { todayIST } from "@/lib/db";

export const revalidate = 300;
export const metadata: Metadata = { title: "All artists", description: "South Asian electronic artists: DJs, live acts, VJs and photographers. Follow them, or see who is free on your date and book." };

type SP = { mode?: string; date?: string; city?: string; budget?: string; act?: string; q?: string; sound?: string; sort?: string; free?: string };
const PAGE = 48;
const SOUNDS = ["House", "Techno", "Disco", "Hip-hop", "Electronic", "Ambient", "Bass", "Indie"];

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
  const sort = sp.sort === "name" ? "name" : "soon";
  const onlyFree = book && sp.free === "1";
  const { artists } = await getDeskArtists();
  let ranked = rankArtists(artists, brief, today);
  if (onlyFree) ranked = ranked.filter((r) => r.group !== "busy");
  // Faces first: artists with a photo lead within the order the desk gives.
  const withPhoto = (r: Ranked) => (r.a.photo_url ? 0 : 1);
  const G = { free: 0, clear: 1, all: 2, busy: 3 } as const;
  ranked = sort === "name" ? [...ranked].sort((x, y) => x.a.name.localeCompare(y.a.name))
    : [...ranked].sort((x, y) => (book ? G[x.group] - G[y.group] : 0) || withPhoto(x) - withPhoto(y) || (book ? 0 : Number(!x.a.next_date) - Number(!y.a.next_date)));
  const shown = ranked.slice(0, PAGE);
  const free = ranked.filter((r) => r.group === "free").length;

  const keep = { mode: book ? "book" : "", ...brief, sort: sort === "name" ? "name" : "", free: onlyFree ? "1" : "" };
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams(Object.entries({ ...keep, ...extra }).filter(([, v]) => v) as [string, string][]);
    return `/artists${p.size ? `?${p}` : ""}`;
  };
  const count = (f: (a: (typeof artists)[number]) => boolean) => artists.filter(f).length;
  const groups: { title: string; key: keyof typeof brief; items: { v: string; label: string; n: number }[] }[] = [
    { title: "What", key: "act", items: ACT_FILTERS.filter((a) => a.key).map((a) => ({ v: a.key, label: a.label, n: count((x) => x.acts.includes(a.key as never) || (a.key === "live" && x.acts.includes("producer_live"))) })) },
    { title: "Sound", key: "sound", items: SOUNDS.map((s) => ({ v: s.toLowerCase(), label: s, n: count((x) => x.genres.some((g) => g.toLowerCase().includes(s.toLowerCase().replace("-", "")) || g.toLowerCase().includes(s.toLowerCase()))) })).filter((x) => x.n > 0) },
    { title: "City", key: "city", items: DESK_CITIES.map((c) => ({ v: c, label: c, n: count((x) => normCity(x.city) === c) })).filter((x) => x.n > 0).slice(0, 8) },
  ];
  const nOn = (["act", "sound", "city"] as const).filter((k) => brief[k]).length;
  const lead = book
    ? brief.date ? (free ? `${free} free on ${dayShort(brief.date)}${brief.city ? ` in ${brief.city}` : ""}${brief.budget ? ", inside your budget" : ""}. Add the ones you want to one ask.` : `Nobody has marked ${dayShort(brief.date)} free yet. Anyone not greyed out has nothing listed that night.`) : "Pick a date to see who is free, then ask up to three at once."
    : `${artists.length} DJs, live acts, VJs and photographers. Follow the ones you like, or book one.`;

  return (
    <main className="k-root">
      <section className="k-wrap pt-10 md:pt-12">
        <div className="flex flex-wrap items-end gap-6">
          <div className="min-w-0 flex-1 basis-full md:basis-auto md:min-w-[280px]">
            <h1 className="k-d text-[38px] md:text-[72px]">All artists</h1>
            <p className="k-b mt-2 text-[15px] md:mt-3 md:text-[17px]">{lead}</p>
          </div>
          <div className="aa-seg" role="tablist" aria-label="Mode">
            <Link href={qs({ mode: "" })} className={!book ? "on" : ""} aria-current={!book ? "page" : undefined}>Discover</Link>
            <Link href={qs({ mode: "book" })} className={book ? "on" : ""} aria-current={book ? "page" : undefined}>Book</Link>
          </div>
        </div>
        <form method="get" action="/artists" className="aa-sform mt-5 flex gap-3 md:mt-7">
          {Object.entries(keep).filter(([k, v]) => v && k !== "q" && k !== "sort").map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <label className="aa-search flex-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></svg><input name="q" defaultValue={brief.q} placeholder="Search an artist, a sound or a venue" aria-label="Search" /></label>
          <select name="sort" defaultValue={sort === "name" ? "name" : ""} className="k-field !w-auto aa-desk" aria-label="Sort">
            <option value="">{book ? "Free first" : "Playing soon first"}</option>
            <option value="name">A to Z</option>
          </select>
          <button className="k-btn" type="submit">Search</button>
        </form>
      </section>

      {/* Phone: filters fold into one button, so the artists come first (Param, 13 Nov 2026: "the all artists page is still fucked"). */}
      <section className="k-wrap aa-phone pt-4">
        {book && (
          <form method="get" action="/artists" className="aa-night aa-night-ph">
            <input type="hidden" name="mode" value="book" />
            {brief.act && <input type="hidden" name="act" value={brief.act} />}
            {brief.sound && <input type="hidden" name="sound" value={brief.sound} />}
            <span className="k-m">Date and city</span>
            <div className="aa-night-row">
              <input type="date" name="date" min={today} defaultValue={brief.date} className="k-field" aria-label="Date" />
              <select name="city" defaultValue={brief.city} className="k-field" aria-label="City"><option value="">Any city</option>{DESK_CITIES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <select name="budget" defaultValue={brief.budget} className="k-field" aria-label="Budget">{BUDGETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</select>
            <button className="k-btn k-btn--key aa-big" type="submit">Show who is free</button>
          </form>
        )}
        <details className="aa-fd">
          <summary><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>Filter{nOn ? ` · ${nOn} on` : ": what, sound, city"}<span className="aa-fd-n">{ranked.length} artists</span></summary>
          <div className="aa-fd-in">
            {groups.map((g) => g.items.length > 0 && (
              <div key={g.title} className="aa-fd-g">
                <span className="k-m">{g.title}</span>
                <div className="aa-pills">
                  {g.items.map((it) => {
                    const on = (brief[g.key] ?? "").toLowerCase() === it.v.toLowerCase();
                    return <Link key={it.v} href={qs({ [g.key]: on ? "" : it.v })} className={on ? "on" : ""} scroll={false}>{it.label}<span>{it.n}</span></Link>;
                  })}
                </div>
              </div>
            ))}
            <div className="aa-fd-g">
              <span className="k-m">Order</span>
              <div className="aa-pills">
                <Link href={qs({ sort: "" })} className={sort !== "name" ? "on" : ""} scroll={false}>{book ? "Free first" : "Playing soon"}</Link>
                <Link href={qs({ sort: "name" })} className={sort === "name" ? "on" : ""} scroll={false}>A to Z</Link>
              </div>
            </div>
          </div>
        </details>
        {nOn > 0 && (
          <div className="aa-on">
            {(["act", "sound", "city"] as const).filter((k) => brief[k]).map((k) => <Link key={k} href={qs({ [k]: "" })} scroll={false}>{groups.find((g) => g.key === k)?.items.find((i) => i.v.toLowerCase() === brief[k].toLowerCase())?.label ?? brief[k]} ✕</Link>)}
            <Link href={book ? "/artists?mode=book" : "/artists"} className="aa-clear">Clear all</Link>
          </div>
        )}
      </section>

      <section className="k-wrap grid gap-10 pt-5 md:pt-8 md:grid-cols-[230px_1fr]">
        <aside className="aa-rail aa-desk" aria-label="Filters">
          {book && (
            <form method="get" action="/artists" className="aa-night">
              <input type="hidden" name="mode" value="book" />
              {brief.act && <input type="hidden" name="act" value={brief.act} />}
              {brief.sound && <input type="hidden" name="sound" value={brief.sound} />}
              <span className="k-m">Date and city</span>
              <input type="date" name="date" min={today} defaultValue={brief.date} className="k-field mt-2" aria-label="Date" />
              <select name="city" defaultValue={brief.city} className="k-field mt-2" aria-label="City"><option value="">Any city</option>{DESK_CITIES.map((c) => <option key={c}>{c}</option>)}</select>
              <span className="k-m mt-4 block">Budget</span>
              <select name="budget" defaultValue={brief.budget} className="k-field mt-2" aria-label="Budget">{BUDGETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</select>
              <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[13px]"><input type="checkbox" name="free" value="1" defaultChecked={onlyFree} className="aa-tg" />Only free that night</label>
              <button className="k-btn k-btn--key k-btn--s mt-4 w-full" type="submit">Show who is free</button>
            </form>
          )}
          {groups.map((g) => g.items.length > 0 && (
            <div key={g.title} className="aa-group">
              <span className="k-m">{g.title}</span>
              <ul>
                {g.items.map((it) => {
                  const on = (brief[g.key] ?? "").toLowerCase() === it.v.toLowerCase();
                  return <li key={it.v}><Link href={qs({ [g.key]: on ? "" : it.v })} className={on ? "on" : ""} aria-current={on ? "true" : undefined} scroll={false}><i aria-hidden="true" />{it.label}<span className="k-m">{it.n}</span></Link></li>;
                })}
              </ul>
            </div>
          ))}
        </aside>

        <div className="min-w-0">
          {shown.length === 0 ? (
            <Empty title="No one matches that yet" line="Try another city, a wider budget or a different date." action={<ButtonLink href={book ? "/artists?mode=book" : "/artists"}>Clear the filters</ButtonLink>} />
          ) : book ? (
            <form id="ask-form" method="get" action="/book">
              {brief.date && <input type="hidden" name="date" value={brief.date} />}
              {brief.city && <input type="hidden" name="city" value={brief.city} />}
              {brief.budget && <input type="hidden" name="budget" value={brief.budget} />}
              <ul className="grid list-none grid-cols-2 gap-x-3 gap-y-7 p-0 md:gap-x-5 md:gap-y-9 lg:grid-cols-4">{shown.map((r) => <BookCard key={r.a.slug} r={r} dated={!!brief.date} />)}</ul>
              <AskBar formId="ask-form" date={brief.date ? dayShort(brief.date) : ""} />
            </form>
          ) : (
            <ul className="grid list-none grid-cols-2 gap-x-3 gap-y-7 p-0 md:gap-x-5 md:gap-y-9 lg:grid-cols-4">
              {shown.map((r) => {
                const a = r.a;
                const name = displayName(a.name);
                return (
                  <li key={a.slug} className="aa-card">
                    <Link href={`/${a.slug}`} className="aa-ph">
                      {a.photo_url ? <img src={a.photo_url} alt="" loading="lazy" /> : <img src="/cats/lime.webp" alt="" className="aa-cat" />}
                      {a.acts[0] && <span className="aa-chip">{actLine(a.acts.slice(0, 1))}</span>}
                    </Link>
                    <Link href={`/${a.slug}`} className="mt-3 block truncate text-[17px] font-semibold no-underline">{name}</Link>
                    <span className="k-b block truncate text-[13px]">{[a.acts[0] ? actLine(a.acts.slice(0, 1)) : null, soundLine(a.genres, 1).toLowerCase(), a.city].filter(Boolean).join(", ")}</span>
                    <span className="aa-cardrow mt-2 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold" style={{ color: a.next_label ? "var(--k-pc)" : "var(--k-t3)" }}>{a.next_label ?? (brief.city ? `No ${brief.city} date yet` : "No date listed")}</span>
                      <FollowButton slug={a.slug} name={name} size="s" />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {ranked.length > PAGE && <p className="k-b mt-10">Showing the first {PAGE} of {ranked.length}. Search or filter to find someone.</p>}
          <p className="k-b mt-6 text-sm">Missing someone? <Link href="/claim">Add an artist</Link>.</p>
        </div>
      </section>
      <div className="h-24" />
    </main>
  );
}

function BookCard({ r, dated }: { r: Ranked; dated: boolean }) {
  const { a } = r;
  const dim = r.group === "busy";
  const good = r.reasons.find((x) => x.tone === "good");
  const bad = r.reasons.find((x) => x.tone === "bad");
  const name = displayName(a.name);
  return (
    <li className={`aa-card${dim ? " dim" : ""}`}>
      <label className="block cursor-pointer">
        <span className="aa-ph">
          {a.photo_url ? <img src={a.photo_url} alt="" loading="lazy" /> : <img src="/cats/lime.webp" alt="" className="aa-cat" />}
          {a.acts[0] && <span className="aa-chip">{actLine(a.acts.slice(0, 1))}</span>}
        </span>
        <b className="mt-3 block truncate text-[17px] font-semibold">{name}</b>
        <span className="k-b block truncate text-[13px]">{[soundLine(a.genres, 2), a.city].filter(Boolean).join(", ")}</span>
        <span className="mt-2 flex items-center gap-2">
          <span className="min-w-0 flex-1">
            <b className="block text-[13px]">{r.rate ? `From ${inrShort(r.rate)}` : "Rate on request"}</b>
            <span className="block truncate text-[12px]" style={{ color: bad ? "var(--k-t3)" : "var(--k-pc)" }}>{dated ? (bad?.label ?? good?.label ?? "Nothing listed that night") : "Ask for dates"}</span>
          </span>
          <input type="checkbox" name="a" value={a.slug} data-name={name} data-busy={dim ? "1" : "0"} disabled={dim} className="aa-add" aria-label={`Add ${name} to the ask`} />
        </span>
      </label>
      <Link href={`/${a.slug}`} className="mt-1 inline-block text-[12px]" style={{ color: "var(--k-t2)" }}>See page</Link>
    </li>
  );
}
