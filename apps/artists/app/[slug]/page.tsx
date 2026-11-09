/**
 * The public artist page. Boards: W40-Artist (web) and A40-Artist, A40-ArtistMusic, A40-ArtistShows
 * (phone) on the canvas page "Final preview". Real data only; every block hides when it has nothing.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ButtonLink, Pill, Tag, SectionHead, Keycap, Led, Readout, Record, Sleeve, Plinth, Arm,
  Passport, Knob, Sticker, Marquee, Cat, Icon, type StampData,
} from "@ccd/ui";
import { coverUrl } from "@/lib/artist-v2";
import { getArtistPage, inrShort, dayParts } from "@/lib/artist-page";
import { isSlug } from "@/lib/db";
import { RESERVED, siteUrl } from "@/lib/site";
import FollowButton from "@/components/FollowButton";
import ArtistTabs from "@/components/ArtistTabs";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!isSlug(slug) || RESERVED.has(slug)) return null;
  return getArtistPage(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return { title: "Not found", robots: { index: false } };
  const what = [p.a.city, p.a.genres.slice(0, 2).join(" and ")].filter(Boolean).join(", ");
  return {
    title: p.name,
    description: `${p.name}${what ? ` (${what})` : ""}: ${p.counts.records} releases, ${p.counts.shows} shows. Listen, see where they play next, or book them.`,
    alternates: { canonical: `${siteUrl()}/${slug}` },
    openGraph: { title: p.name, images: p.a.photo ? [{ url: p.a.photo }] : undefined },
  };
}

/** Stamp colours: ink colours that read on paper. */
const INKS = ["#1f5fd6", "#c2185b", "#2e7d32", "#6a1b9a", "#e65100", "#00695c", "#37474f"];
const SHAPES: StampData["shape"][] = ["round", "plain", "double", "round", "plain", "double", "round"];

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const { a, counts, fee, latest } = p;
  const kinds = [p.kind ? cap(p.kind) : null, a.genres[0] ?? null, a.city?.split(",")[0] ?? null].filter(Boolean) as string[];
  const bookHref = `/book?a=${slug}`;
  const listenHref = latest?.links[0]?.url ?? a.spotify ?? a.soundcloud ?? null;
  const ig = a.links.find((l) => /instagram/i.test(l.url));
  const stamps: StampData[] = p.stamps.slice(0, 9).map((s, i) => ({ city: s.city, count: s.count, colour: INKS[i % INKS.length], shape: SHAPES[i % SHAPES.length] }));
  const music = p.releases.slice(0, 8);
  const billNames = new Set(a.playedWith.map((c) => c.name.toLowerCase()));
  const similar = a.alsoLike.filter((x) => !billNames.has(x.n.toLowerCase()));

  return (
    <main className="k-root">
      {/* ── Hero ── */}
      <section className="k-wrap pt-6 md:pt-10">
        <div className="grid items-end gap-8 md:grid-cols-[minmax(0,560px)_1fr] md:gap-16">
          <div className="k-rvs relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[#16161a] md:aspect-auto md:h-[640px]">
            {a.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.photo} alt={`${p.name}`} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
            ) : (
              <div className="absolute inset-0 grid place-items-center"><Cat name="lime" height={180} /></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
            {latest && isRecent(latest.y) && <Sticker style={{ right: 22, top: 22 }}>New<br />{latest.type === "ep" ? "EP" : typeName(latest.type).toLowerCase()}</Sticker>}
            <div className="absolute inset-x-5 bottom-5 flex items-center gap-3">
              {a.bookable && <span className="rounded-full bg-black/60 px-4 py-2.5 backdrop-blur"><Led>Open to bookings</Led></span>}
              <span className="flex-1" />
              {ig && <a href={ig.url} className="k-m !text-[rgba(242,240,235,.75)]" rel="noopener" target="_blank">{ig.label}</a>}
            </div>
          </div>
          <div className="k-rv pb-2">
            {kinds.length > 0 && <div className="flex flex-wrap gap-2">{kinds.map((k) => <Pill key={k}>{k}</Pill>)}</div>}
            <h1 className="k-d mt-6 text-[64px] md:text-[clamp(88px,9vw,132px)]" style={{ lineHeight: 0.86 }}>{p.name}</h1>
            {a.bio && <p className="k-b mt-6 max-w-[560px] text-[17px] md:text-[19px]">{firstSentence(a.bio)}</p>}
            <div className="mt-7 max-w-[620px]">
              <Readout label="At a glance" cells={[
                { value: counts.records, label: "Records" },
                { value: counts.shows, label: "Shows" },
                { value: counts.cities, label: "Cities" },
                { value: counts.labels, label: "Labels" },
              ]} />
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <FollowButton slug={slug} name={p.name} />
              {fee && <ButtonLink size="l" href={bookHref}><Icon name="inbox" size={17} />Book from {inrShort(fee.min)}</ButtonLink>}
              <span className="flex-1" />
              <span className="hidden md:inline"><Cat name="lime" height={64} /></span>
            </div>
          </div>
        </div>
      </section>

      <div className="k-wrap pt-12"><ArtistTabs slug={slug} current="overview" music={counts.records} shows={counts.shows} /></div>

      {/* ── Latest release on the turntable ── */}
      {latest && (
        <section className="k-wrap k-section">
          <Plinth className="k-rvs grid gap-8 overflow-hidden p-6 md:grid-cols-[400px_1fr] md:gap-16 md:p-14">
            <div className="relative mx-auto w-full max-w-[400px] md:pr-24">
              <Sleeve title={latest.t} label={latest.label} cover={coverUrl(latest.albumId, "xl")} out fontSize={56} />
              <Arm style={{ right: 20, top: 10, height: "70%" }} />
            </div>
            <div className="self-center">
              <span className="k-m" style={{ color: "var(--k-pc)" }}>Out {latest.date}</span>
              <h2 className="k-d mt-3 text-[48px] md:text-[88px]">{latest.t}</h2>
              <p className="k-b mt-3 text-[17px]">{[typeName(latest.type), latest.label && `on ${latest.label}`].filter(Boolean).join(" ")}.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                {listenHref && <ButtonLink variant="key" size="l" href={listenHref} target="_blank" rel="noopener"><Icon name="play" />Listen</ButtonLink>}
                {latest.links.slice(1, 3).map((l) => <ButtonLink key={l.url} size="l" href={l.url} target="_blank" rel="noopener">{l.label}</ButtonLink>)}
              </div>
              {p.alsoOut && (
                <div className="mt-8 flex items-center gap-4 border-t border-[var(--k-hair)] pt-5">
                  <Sleeve title={p.alsoOut.t} cover={coverUrl(p.alsoOut.albumId, "small")} size={56} small />
                  <span><b className="block text-[15px] font-semibold">Also out: {p.alsoOut.t}</b><span className="k-b text-sm">{[typeName(p.alsoOut.type), p.alsoOut.label].filter(Boolean).join(" on ")}</span></span>
                </div>
              )}
            </div>
          </Plinth>
        </section>
      )}

      {/* ── Music ── */}
      {music.length > 1 && (
        <section className="k-wrap k-section" aria-labelledby="music">
          <SectionHead id="music" title="Music" sub={`${counts.records} releases${counts.labels ? ` on ${counts.labels} ${counts.labels === 1 ? "label" : "labels"}` : ""}.`} />
          <div className="mt-6 flex flex-wrap gap-2">
            <Pill on>All {counts.records}</Pill>
            {counts.albums > 0 && <Pill>Albums {counts.albums}</Pill>}
            {counts.eps > 0 && <Pill>EPs {counts.eps}</Pill>}
            {counts.singles > 0 && <Pill>Singles {counts.singles}</Pill>}
          </div>
          <ul className="mt-8 grid list-none grid-cols-2 gap-x-6 gap-y-9 p-0 pr-6 md:grid-cols-4 md:gap-x-10 md:gap-y-11">
            {music.map((r) => (
              <li key={r.id} className="k-rvs">
                <a href={r.links[0]?.url ?? "#"} className="block no-underline" target={r.links[0] ? "_blank" : undefined} rel="noopener">
                  <Sleeve title={r.t} label={r.label} cover={coverUrl(r.albumId, "big")} fontSize={34} />
                  <b className="mt-4 block truncate text-[16px] font-semibold">{r.t}</b>
                  <span className="k-b block truncate text-[13px]">{[typeName(r.type), r.date, r.label].filter(Boolean).join(" · ")}</span>
                </a>
              </li>
            ))}
          </ul>
          {counts.records > music.length && <div className="mt-10"><ButtonLink href={`/${slug}/music`}>All {counts.records} releases <Icon name="chev" size={14} stroke={2.2} /></ButtonLink></div>}
        </section>
      )}
      {p.labels.length > 2 && (
        <section className="pt-20" aria-label="Released on">
          <p className="k-m k-wrap mb-4">Released on</p>
          <Marquee items={p.labels.slice(0, 14)} label="Labels" />
        </section>
      )}

      {/* ── Shows ── */}
      {(p.past.length > 0 || a.upcoming.length > 0) && (
        <section className="k-wrap k-section" aria-labelledby="shows">
          <div className="grid items-start gap-12 md:grid-cols-[1fr_minmax(0,600px)] md:gap-16">
            <div>
              <SectionHead id="shows" title="Shows" sub="Follow and you hear first when they play your city. Tickets open in Nights." />
              {a.upcoming.length > 0 ? (
                <ul className="mt-7 list-none p-0">
                  {a.upcoming.slice(0, 4).map((u) => {
                    const d = dayParts(u.event_date);
                    return (
                      <li key={u.id}>
                        <a className="k-li" href={u.ticket_url ?? u.url ?? "#"}>
                          <span className="k-m w-[72px] flex-none !text-[var(--k-tx)]">{d.day}</span>
                          <span className="min-w-0 flex-1"><b>{u.title}</b><small>{[u.venue, u.city].filter(Boolean).join(", ")}</small></span>
                          <span className="text-sm font-semibold" style={{ color: "var(--k-pc)" }}>Tickets</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : p.nextNear ? (
                <div className="k-surface mt-7 flex items-center gap-4 rounded-[20px] px-5 py-4">
                  <Led state="off"><span className="k-sr">No date</span></Led>
                  <span className="flex-1"><b className="block text-[17px] font-semibold">No {p.nextNear.city} date yet</b><span className="k-b text-sm">Their next show near you lands here.</span></span>
                  <FollowButton slug={slug} name={p.name} size="s" />
                </div>
              ) : null}
              {p.past.length > 0 && (
                <ul className="mt-5 list-none p-0">
                  {p.past.slice(0, 6).map((g) => {
                    const d = dayParts(g.day);
                    return (
                      <li key={`${g.day}-${g.title}`} className="k-li">
                        <span className="k-m w-[72px] flex-none !text-[var(--k-tx)]">{d.day}<span className="block !text-[var(--k-t3)]">{d.year}</span></span>
                        <span className="min-w-0 flex-1"><b>{g.title}</b><small>{[g.venue, g.city].filter(Boolean).join(", ")}</small></span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {stamps.length > 1 && <div className="k-rvs md:mt-10"><Passport stamps={stamps} summary={`${counts.cities} cities`} /></div>}
          </div>
        </section>
      )}

      {/* ── Book ── */}
      {fee && (
        <section className="k-wrap k-section" aria-labelledby="book">
          <div className="k-rvs grid items-center gap-10 rounded-[28px] bg-[#0e0f11] p-6 md:grid-cols-[1fr_480px] md:p-16" style={{ boxShadow: "inset 0 0 0 2px var(--k-pc)" }}>
            <div>
              <h2 id="book" className="k-d text-[44px] md:text-[72px]">Book {p.name} for your night</h2>
              <p className="k-b mt-4 max-w-[560px] text-[18px]">Pick a date and a set. They reply in the app or on WhatsApp.</p>
              <ul className="mt-6 max-w-[560px] list-none p-0">
                {["Open to bookings", `Their range: ${inrShort(fee.min)} to ${inrShort(fee.max)}`, "Add a VJ or a photographer to the same ask"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 border-t border-[var(--k-hair)] py-3 text-[15px]"><span style={{ color: "var(--k-pc)" }}><Icon name="check" size={14} stroke={2.6} /></span>{t}</li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink variant="key" size="l" href={bookHref}>Send an ask</ButtonLink>
              </div>
            </div>
            <Plinth className="p-6" style={{ borderRadius: 26 }}>
              <span className="k-m">Their range</span>
              <div className="relative mt-4 grid place-items-center pb-8">
                <Knob size={190} label={`Range ${inrShort(fee.min)} to ${inrShort(fee.max)}`} />
                <span className="k-m absolute bottom-0 left-6">{inrShort(fee.min)}</span>
                <span className="k-m absolute bottom-0 right-6">{inrShort(fee.max)}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <Keycap href={bookHref} sub="set">Club</Keycap>
                <Keycap href={bookHref} sub="set">Festival</Keycap>
                <Keycap href={bookHref} sub="party">Private</Keycap>
              </div>
            </Plinth>
          </div>
        </section>
      )}

      {/* ── Around them ── */}
      {(a.playedWith.length > 0 || similar.length > 0) && (
        <section className="k-wrap k-section">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            {a.playedWith.length > 0 && (
              <div>
                <h2 className="k-d text-[40px] md:text-[48px]">On the bill with</h2>
                <ul className="mt-5 list-none p-0">
                  {a.playedWith.slice(0, 5).map((c) => (
                    <li key={c.slug}><a className="k-li" href={`/${c.slug}`}><Avatar name={c.name} img={c.img} /><span className="flex-1"><b>{c.name}</b><small>{c.why}</small></span></a></li>
                  ))}
                </ul>
              </div>
            )}
            {similar.length > 0 && (
              <div>
                <h2 className="k-d text-[40px] md:text-[48px]">Similar artists</h2>
                <ul className="mt-5 list-none p-0">
                  {similar.slice(0, 5).map((s) => (
                    <li key={s.n}><a className="k-li" href={s.u ?? "#"} target={s.internal ? undefined : "_blank"} rel="noopener"><Avatar name={s.n} img={s.img} /><span className="flex-1"><b>{s.n}</b><small>{s.why}</small></span>{s.internal && <Tag>On Artists</Tag>}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Claim ── */}
      {!a.claimed && (
        <section className="k-wrap pt-24">
          <div className="k-surface flex flex-wrap items-center gap-4 rounded-[22px] py-4 pl-4 pr-5">
            <Cat name="dance" height={52} move="sway" />
            <p className="m-0 flex-1 text-[16px]"><b className="font-semibold">Is this you?</b> <span className="k-b">Claim this page to set your rates, your dates and your shop.</span></p>
            <ButtonLink size="s" href="/claim">Claim this page</ButtonLink>
          </div>
        </section>
      )}

      {/* Phone: the one action that matters stays in reach. */}
      {fee && (
        <div className="k-bbar md:!hidden">
          <FollowButton slug={slug} name={p.name} size="m" icon />
          <ButtonLink variant="key" href={bookHref} className="flex-1">Book from {inrShort(fee.min)}</ButtonLink>
        </div>
      )}
      <div className="h-28 md:h-0" />
    </main>
  );
}

function Avatar({ name, img }: { name: string; img: string | null }) {
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt="" width={56} height={56} className="h-14 w-14 flex-none rounded-full object-cover" loading="lazy" />;
  }
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return <span aria-hidden="true" className="grid h-14 w-14 flex-none place-items-center rounded-full font-bold text-[#0a0a0b]" style={{ background: "var(--k-pc)", fontFamily: "var(--k-display)", fontSize: 20 }}>{initials}</span>;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const TYPES: Record<string, string> = { album: "Album", ep: "EP", single: "Single", remix: "Remix", compilation: "Compilation", mix: "Mix" };
const typeName = (t: string) => TYPES[t] ?? "Release";
const isRecent = (y: number) => y > 0 && new Date().getFullYear() + new Date().getMonth() / 12 - y < 0.25;
function firstSentence(t: string) {
  const s = t.replace(/\s+/g, " ").trim();
  const m = /^(.{20,220}?[.!?])(\s|$)/.exec(s);
  return m ? m[1] : s.slice(0, 220);
}
