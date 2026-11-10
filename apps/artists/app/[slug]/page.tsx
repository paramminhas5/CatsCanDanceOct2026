/**
 * The public artist page. It opens on the library and the eras (Param, 10 Nov; plan ccd/v2-plan.md 5.3),
 * then the full record list, shows, the fan wall, watch, book and the circle. Boards: W40-Artist and A40-Artist
 * (phone) on the canvas page "Final preview". Real data only; every block hides when it has nothing.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ButtonLink, Pill, Led, Icon,
} from "@ccd/ui";
import { getArtistPage, inrShort, dayParts } from "@/lib/artist-page";
import { coverUrl, sourceName, type ArtistV2 } from "@/lib/artist-v2";
import { isSlug, todayIST } from "@/lib/db";
import { RESERVED, siteUrl } from "@/lib/site";
import FollowButton from "@/components/FollowButton";
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

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const { a, counts, fee, latest } = p;
  const kinds = [p.kind ? cap(p.kind) : null, a.genres[0] ?? null, a.city?.split(",")[0] ?? null].filter(Boolean) as string[];
  const today = todayIST();
  const playable = a.popular.length > 0 || a.releases.some((r) => r.trackId);
  const ig = a.links.find((l) => /instagram/i.test(l.url));
  const up = a.upcoming[0];
  const next = up ? { day: dayParts(up.event_date).day, title: up.title, where: [up.venue, up.city].filter(Boolean).join(", "), href: up.ticket_url ?? up.url ?? "#shows", ext: !!(up.ticket_url ?? up.url) } : null;
  const since = a.releases.filter((r) => !r.undated).map((r) => Math.floor(r.y)).sort((x, y) => x - y)[0] ?? null;
  const about = [
    ...a.releases.filter((r) => !r.undated).slice(0, 6).map((r) => ({ kind: "release" as const, id: r.id, label: r.t.slice(0, 80) })),
    ...a.moments.filter((m) => m.kind === "show").slice(-6).reverse().map((m) => ({ kind: "show" as const, id: m.id, label: [m.city ?? m.t, m.date].filter(Boolean).join(", ").slice(0, 80) })),
  ];
  const nextDay = up ? fanDay(up.event_date) : null;
  const look = lookOut(a, latest?.id ?? null);
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
            {/* ── For fans: the three things a fan wants first (Param, 10 Nov 2026: "latest release, where she's playing next, what to look out for") ── */}
            <div className="ap-fan">
              {latest && (
                <a className="ap-fc ap-fc--rel" href={latest.trackId ? `#open=${encodeURIComponent(latest.id)}` : latest.links[0]?.url ?? "#music"}>
                  <span className="ap-fc-art">
                    {coverUrl(latest.albumId, "big") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverUrl(latest.albumId, "big")!} alt="" />
                    ) : <span className="ap-fc-blank" style={{ background: latest.fill, color: latest.ink }}>{latest.t.slice(0, 1)}</span>}
                    {latest.trackId && <i aria-hidden="true"><Icon name="play" size={18} /></i>}
                  </span>
                  <span className="ap-fc-t"><span className="k-m">Latest release</span><b>{latest.t}</b><span>{[typeName(latest.type), latest.date].filter(Boolean).join(" · ")}</span></span>
                </a>
              )}
              {next ? (
                <a className="ap-fc ap-fc--next" href={next.href} target={next.ext ? "_blank" : undefined} rel="noopener">
                  <span className="ap-fc-date"><b>{nextDay?.d}</b><span>{nextDay?.m}</span></span>
                  <span className="ap-fc-t"><span className="k-m">Playing next</span><b>{next.title}</b><span>{next.where}</span><em>{next.ext ? "Tickets" : "Details"} →</em></span>
                </a>
              ) : (
                <div className="ap-fc ap-fc--next">
                  <span className="ap-fc-date ap-fc-date--none"><b>?</b><span>No date</span></span>
                  <span className="ap-fc-t"><span className="k-m">Playing next</span><b>No date announced yet</b><span>Follow and you hear the day they post one.</span></span>
                </div>
              )}
              {look && (
                <a className="ap-fc ap-fc--look" href={look.href} target={look.ext ? "_blank" : undefined} rel="noopener">
                  <span className="ap-fc-ico" aria-hidden="true">{look.icon}</span>
                  <span className="ap-fc-t"><span className="k-m">Look out for</span><b>{look.t}</b><span>{look.sub}</span></span>
                </a>
              )}
            </div>
          </div>
        }
        wall={<FanWall slug={slug} name={p.name} about={about} />}
        side={
          <>
            <div className="apr-card apr-share">
              <span className="k-m">Their card</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/card/profile/${slug}?size=story`} alt={`${p.name}: eras, records and shows, as one card`} loading="lazy" />
              <ShareProfile slug={slug} name={p.name} />
            </div>
            {(fee || a.bookable) && (
              <div className="apr-card apr-book" id="book">
                <span className="k-m" style={{ color: "var(--k-pc)" }}>Book {p.name}</span>
                {fee && <b className="k-d" style={{ fontSize: 28 }}>From {inrShort(fee.min)}</b>}
                <p>Club, festival or private. Send the date, city and room. You agree in one thread and both sign a contract.</p>
                <ButtonLink variant="key" href="#ask">Ask for a date</ButtonLink>
              </div>
            )}
            {!a.claimed && (
              <Link className="apr-card" href="/claim" style={{ textDecoration: "none" }}><span className="k-m">Is this you?</span><b>Claim this page</b><p>See who follows you and where, pin fan notes, post dates, take bookings.</p></Link>
            )}
          </>
        }
      />

      {/* ── Around them: two tight rows of chips, not two long lists (Param, 10 Nov 2026) ── */}
      {(a.playedWith.length > 0 || similar.length > 0) && (
        <section className="k-wrap k-section ap-around">
          {similar.length > 0 && (
            <div>
              <div className="ap-around-h"><h2 className="k-d">If you like {p.name}</h2><Link href="/artists" className="k-b">All artists</Link></div>
              <ul className="ap-chips">
                {similar.slice(0, 12).map((s) => (
                  <li key={s.n}><a className="ap-chip" href={s.u ?? "#"} target={s.internal ? undefined : "_blank"} rel="noopener" title={s.why ?? undefined}><Avatar name={s.n} img={s.img} /><b>{s.n}</b></a></li>
                ))}
              </ul>
            </div>
          )}
          {a.playedWith.length > 0 && (
            <div>
              <div className="ap-around-h"><h2 className="k-d">On the bill with</h2></div>
              <ul className="ap-chips">
                {a.playedWith.slice(0, 12).map((c) => (
                  <li key={c.slug}><a className="ap-chip" href={`/${c.slug}`} title={c.why ?? undefined}><Avatar name={c.name} img={c.img} /><b>{c.name}</b></a></li>
                ))}
              </ul>
            </div>
          )}
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

const fanDay = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return { d: String(d.getUTCDate()), m: d.toLocaleDateString("en-GB", { month: "short", weekday: "short", timeZone: "UTC" }) };
};

/** What a fan should look out for: a tour, then the newest thing written, filmed or done. Real rows only. */
function lookOut(a: ArtistV2, latestId: string | null): { t: string; sub: string; href: string; ext: boolean; icon: string } | null {
  if (a.touring.length) {
    const cities = [...new Set(a.touring.map((t) => t.city))].slice(0, 3).join(", ");
    return { t: `On tour: ${cities}`, sub: a.touring[0].note ?? "Dates posted on On tour", href: "/tour", ext: false, icon: "✈" };
  }
  const night = a.ccdNights.find((n) => n.upcoming);
  if (night) return { t: night.title, sub: "Playing a Cats Can Dance night", href: night.url, ext: true, icon: "★" };
  type C = { y: number; t: string; sub: string; href: string; icon: string };
  const c: C[] = [
    ...a.press.filter((x) => x.y != null).map((x) => ({ y: x.y as number, t: x.title, sub: `Written up in ${x.publication}`, href: x.url, icon: "✎" })),
    ...a.videos.filter((x) => x.y != null).map((x) => ({ y: x.y as number, t: x.title, sub: `New to watch${sourceName(x.url) ? ` on ${sourceName(x.url)}` : ""}`, href: x.url, icon: "▶" })),
    ...a.moments.filter((m) => m.kind === "mile" && m.id !== latestId).map((m) => ({ y: m.y, t: m.t, sub: [m.date, m.sub].filter(Boolean).join(" · "), href: m.src ?? "#past", icon: "◆" })),
  ].sort((x, y) => y.y - x.y);
  const top = c[0];
  return top ? { t: top.t.slice(0, 90), sub: top.sub.slice(0, 90), href: top.href, ext: top.href.startsWith("http"), icon: top.icon } : null;
}
