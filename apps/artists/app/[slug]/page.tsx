/**
 * The public artist page. It opens on the library and the eras (Param, 10 Nov; plan ccd/v2-plan.md 5.3),
 * then the full record list, shows, the fan wall, watch, book and the circle. Boards: W40-Artist and A40-Artist
 * (phone) on the canvas page "Final preview". Real data only; every block hides when it has nothing.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ButtonLink, Pill, Tag, SectionHead, Keycap, Led, Plinth,
  Passport, Knob, Marquee, Icon, type StampData,
} from "@ccd/ui";
import { getArtistPage, inrShort, dayParts } from "@/lib/artist-page";
import { isSlug, todayIST } from "@/lib/db";
import { RESERVED, siteUrl } from "@/lib/site";
import FollowButton from "@/components/FollowButton";
import ArtistTabs from "@/components/ArtistTabs";
import ArtistExplorer from "@/components/ArtistExplorer";
import ShareProfile from "@/components/ShareProfile";
import FanWall from "@/components/FanWall";

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
    openGraph: { title: p.name, images: [{ url: `${siteUrl()}/api/card/profile/${slug}?size=link`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [`${siteUrl()}/api/card/profile/${slug}?size=link`] },
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
  const today = todayIST();
  const playable = a.popular.length > 0 || a.releases.some((r) => r.trackId);
  const ig = a.links.find((l) => /instagram/i.test(l.url));
  const stamps: StampData[] = p.stamps.slice(0, 9).map((s, i) => ({ city: s.city, count: s.count, colour: INKS[i % INKS.length], shape: SHAPES[i % SHAPES.length] }));
  const up = a.upcoming[0];
  const next = up ? { day: dayParts(up.event_date).day, title: up.title, where: [up.venue, up.city].filter(Boolean).join(", "), href: up.ticket_url ?? up.url ?? "#shows", ext: !!(up.ticket_url ?? up.url) } : null;
  const since = a.releases.filter((r) => !r.undated).map((r) => Math.floor(r.y)).sort((x, y) => x - y)[0] ?? null;
  const about = [
    ...a.releases.filter((r) => !r.undated).slice(0, 6).map((r) => ({ kind: "release" as const, id: r.id, label: r.t.slice(0, 80) })),
    ...a.moments.filter((m) => m.kind === "show").slice(-6).reverse().map((m) => ({ kind: "show" as const, id: m.id, label: [m.city ?? m.t, m.date].filter(Boolean).join(", ").slice(0, 80) })),
  ];
  const billNames = new Set(a.playedWith.map((c) => c.name.toLowerCase()));
  const similar = a.alsoLike.filter((x) => !billNames.has(x.n.toLowerCase()));

  return (
    <main className="k-root">
      {/* ── The first screen is the library and the eras (Param, 10 Nov; plan ccd/v2-plan.md 5.3). The explorer draws
             the shelf and the era rail under this head; the photo is a small avatar, not the hero. ── */}
      <ArtistExplorer
        a={a}
        name={p.name}
        today={today}
        rate={fee ? inrShort(fee.min) : null}
        head={
          <div className="ap-head">
            <div className="ap-id">
              <span className="ap-av">
                {a.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.photo} alt="" fetchPriority="high" />
                ) : <span aria-hidden="true">{initials(p.name)}</span>}
              </span>
              <div className="min-w-0">
                {kinds.length > 0 && <div className="flex flex-wrap gap-2">{kinds.map((k) => <Pill key={k}>{k}</Pill>)}{a.bookable && <Pill><Led>Open to bookings</Led></Pill>}</div>}
                <h1 className="k-d ap-name">{p.name}</h1>
                <p className="ap-facts">{[since && `Since ${since}`, counts.records && `${counts.records} records`, counts.shows && `${counts.shows} shows`, counts.cities && `${counts.cities} cities`].filter(Boolean).join("  ·  ")}{ig ? <>{"  ·  "}<a href={ig.url} rel="noopener" target="_blank">{ig.label}</a></> : null}</p>
              </div>
            </div>
            <div className="ap-acts">
              {playable && <ButtonLink variant="key" size="l" href="#play"><Icon name="play" size={17} />Play</ButtonLink>}
              <FollowButton slug={slug} name={p.name} />
              <ShareProfile slug={slug} name={p.name} />
              {(fee || a.bookable) && <ButtonLink size="l" href="#ask" aria-label={`Book ${p.name}`}><Icon name="inbox" size={17} /><span className="sp-lbl">Book</span></ButtonLink>}
            </div>
            <div className="ap-row">
              {next ? (
                <a className="ap-chip" href={next.href} target={next.ext ? "_blank" : undefined} rel="noopener"><span className="k-m">Next show · {next.day}</span><b>{next.title}</b><span>{next.where}</span></a>
              ) : (
                <span className="ap-chip"><span className="k-m">Next show</span><b>No date near you yet</b><span>Follow to hear first</span></span>
              )}
              {latest && (
                <a className="ap-chip" href={latest.trackId ? `#open=${encodeURIComponent(latest.id)}` : latest.links[0]?.url ?? "#music"}><span className="k-m">Latest · {latest.date}</span><b>{latest.t}</b><span>{[typeName(latest.type), latest.label].filter(Boolean).join(" on ")}</span></a>
              )}
              {!a.claimed && (
                <Link className="ap-chip ap-claim" href="/claim"><span className="k-m">Is this you?</span><b>Claim your page</b><span>Pin fan notes, add dates, take bookings</span></Link>
              )}
            </div>
          </div>
        }
        wall={<FanWall slug={slug} name={p.name} about={about} />}
      />

      <div className="k-wrap pt-12"><ArtistTabs slug={slug} current="overview" music={counts.records} shows={counts.shows} /></div>

      {p.labels.length > 2 && (
        <section className="pt-20" aria-label="Released on">
          <p className="k-m k-wrap mb-4">Released on</p>
          <Marquee items={p.labels.slice(0, 14)} label="Labels" />
        </section>
      )}

      {/* ── Shows ── */}
      {(a.upcoming.length > 0 || stamps.length > 1 || p.nextNear) && (
        <section className="k-wrap k-section" aria-labelledby="shows">
          <div className="grid items-start gap-12 md:grid-cols-[1fr_minmax(0,600px)] md:gap-16">
            <div>
              <SectionHead id="shows" title="Next shows" sub="Follow and you hear first when they play your city. Tickets open in Nights." />
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
                <ButtonLink variant="key" size="l" href="#ask">Send an ask</ButtonLink>
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
                <Keycap href="#ask" sub="set">Club</Keycap>
                <Keycap href="#ask" sub="set">Festival</Keycap>
                <Keycap href="#ask" sub="party">Private</Keycap>
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

      {/* Phone: the one action that matters stays in reach. */}
      {fee && (
        <div className="k-bbar md:!hidden">
          <FollowButton slug={slug} name={p.name} size="m" icon />
          <ButtonLink variant="key" href="#ask" className="flex-1">Book from {inrShort(fee.min)}</ButtonLink>
        </div>
      )}
      <div className="h-28 md:h-0" />
    </main>
  );
}

const initials = (n: string) => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

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
