/**
 * The Artists front page (boards W39-Artists and W39-ArtistsForArtists). One page, two sides:
 * fans and promoters (discover, shop, book) and artists (tours, contracts, fans, bookings).
 * The side lives in the URL (?side=artists) so it works without JavaScript and can be shared.
 */
import Link from "next/link";
import { ButtonLink, SectionHead, Sleeve, Cat, Icon, Readout } from "@ccd/ui";
import { ArtistTile, Segmented, Tick } from "@/components/bits";
import { coverUrl } from "@/lib/artist-v2";
import { getFront } from "@/lib/front";
import { dayParts } from "@/lib/artist-page";
import { ccd } from "@/lib/site";

export const revalidate = 300;

export default async function Front({ searchParams }: { searchParams: Promise<{ side?: string }> }) {
  const sp = await searchParams;
  const artistSide = sp.side === "artists";
  const f = await getFront();
  return (
    <main className="k-root">
      <section className="k-wrap pt-8 md:pt-10">
        <Segmented label="Who this is for" items={[{ href: "/", label: "For fans and promoters", on: !artistSide }, { href: "/?side=artists", label: "For artists", on: artistSide }]} />
        {artistSide ? <StageArtists count={f.count} /> : <StageFans count={f.count} />}
      </section>
      {artistSide ? <ArtistSections count={f.count} /> : <FanSections f={f} />}
    </main>
  );
}

function StageFans({ count }: { count: number }) {
  return (
    <div className="k-rvs relative mt-6 overflow-hidden rounded-[28px] p-8 text-[#0a0a0b] md:min-h-[560px] md:p-16"
      style={{ background: "radial-gradient(90% 110% at 70% 20%, color-mix(in srgb, var(--k-pc) 85%, #fff), var(--k-pc) 50%, color-mix(in srgb, var(--k-pc) 75%, #000))" }}>
      <div className="relative z-10 max-w-[600px]">
        <h1 className="k-d text-[52px] md:text-[80px]" style={{ color: "#0a0a0b" }}>Every artist, and everything they put out.</h1>
        <p className="mt-5 text-[18px] leading-relaxed opacity-80 md:text-[19px]">Buy their music, see when they play next and get tickets, or book them for your night.</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/artists" className="k-btn k-btn--l no-underline" style={{ background: "#0a0a0b", color: "#fff" }}>See all {count || ""} artists</Link>
          <Link href="/artists?mode=book" className="text-[16px] font-semibold text-[#0a0a0b]">Book for a night</Link>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-6 right-8 hidden md:block"><Cat name="lime" height={260} /></div>
    </div>
  );
}

function StageArtists({ count }: { count: number }) {
  return (
    <div className="k-rvs relative mt-6 overflow-hidden rounded-[28px] bg-[#0e0f11] p-8 md:min-h-[560px] md:p-16" style={{ boxShadow: "inset 0 0 0 2px var(--k-pc)" }}>
      <div className="relative z-10 max-w-[620px]">
        <h1 className="k-d text-[48px] md:text-[76px]">Tours, bookings, contracts and fans. In one place.</h1>
        <p className="k-b mt-5 text-[18px] md:text-[19px]">Claim your page and run your career from your phone. Free to start.</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <ButtonLink variant="key" size="l" href="/claim">Claim your page</ButtonLink>
          <Link href="/me" className="text-[16px] font-semibold">Already claimed? Open your page</Link>
        </div>
        {count > 0 && <div className="mt-10 max-w-[420px]"><Readout cells={[{ value: count, label: "Artists with a page" }, { value: "Free", label: "To claim" }]} /></div>}
      </div>
      <div className="pointer-events-none absolute bottom-6 right-8 hidden md:block"><Cat name="lime" height={240} /></div>
    </div>
  );
}

function FanSections({ f }: { f: Awaited<ReturnType<typeof getFront>> }) {
  return (
    <>
      {f.start.length > 0 && (
        <section className="k-wrap k-section">
          <SectionHead title="All artists" sub="DJs, live acts, VJs and photographers. Follow them to hear about new music and dates." right={<ButtonLink variant="key" size="s" href="/artists">See all {f.count}</ButtonLink>} />
          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {f.start.map((a) => <ArtistTile key={a.slug} {...a} />)}
          </div>
        </section>
      )}
      {f.nights.length > 0 && (
        <section className="k-wrap k-section">
          <SectionHead title="Playing soon" sub="Artists from here on nights coming up. Tickets are with the night." />
          <ul className="mt-7 list-none p-0">
            {f.nights.map((n) => {
              const d = dayParts(n.day);
              return (
                <li key={n.id} className="k-rv grid items-center gap-x-6 gap-y-1 border-t border-[var(--k-hair)] py-4 md:grid-cols-[120px_1fr_1fr_160px]">
                  <span className="k-m !text-[var(--k-tx)]">{d.day}</span>
                  <span className="text-[19px] font-semibold">{n.artists.map((a, i) => <span key={a.slug}>{i > 0 && ", "}<Link href={`/${a.slug}`}>{a.name}</Link></span>)}</span>
                  <span className="k-b truncate">{[n.venue, n.city].filter(Boolean).join(", ")}</span>
                  <a href={n.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 whitespace-nowrap text-[15px] font-semibold md:justify-end">Tickets <Icon name="chev" size={13} stroke={2.2} /></a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {f.releases.length > 0 && (
        <section className="k-wrap k-section">
          <SectionHead title="New music" sub="The newest releases from artists here." />
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-9 pr-6 md:grid-cols-4 md:gap-x-10">
            {f.releases.map((r) => (
              <Link key={`${r.slug}-${r.title}`} href={`/${r.slug}/music`} className="k-rvs block no-underline">
                <Sleeve title={r.title} label={r.label} cover={coverUrl(r.albumId, "big")} fontSize={30} />
                <b className="mt-4 block truncate text-[16px] font-semibold">{r.title}</b>
                <span className="k-b block truncate text-[14px]">{r.artist} · {r.type}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="k-wrap k-section">
        <div className="k-surface k-rvs grid items-center gap-10 rounded-[28px] p-8 md:grid-cols-2 md:p-16">
          <div>
            <h2 className="k-d text-[44px] md:text-[56px]">Book for a night</h2>
            <p className="k-b mt-4 text-[18px]">Pick a date, a city and a budget. See who is free. One ask can go to up to three people: a DJ, a VJ and a photographer.</p>
            <ul className="mt-6 list-none p-0"><Tick>Rates set by the artists</Tick><Tick>Replies in the app or on WhatsApp</Tick><Tick>Nothing to pay to ask</Tick></ul>
            <div className="mt-7"><ButtonLink variant="key" size="l" href="/artists?mode=book">Book for a date</ButtonLink></div>
          </div>
          <div className="hidden justify-center md:flex"><Cat name="lime" height={260} /></div>
        </div>
      </section>
      <section className="k-wrap k-section">
        <p className="k-b">Throwing the party yourself? <a href={ccd.home()} className="font-semibold text-[var(--k-tx)]">Find nights on Nights</a>, or host one with Host.</p>
      </section>
    </>
  );
}

const FEATURES = [
  { t: "Bookings", d: "Asks arrive with the date, the fee and the venue. Accept, counter or decline, then five steps to the gig.", href: "/bookings" },
  { t: "Tours", d: "Put a tour up. Fans in each city hear first, and promoters there can ask for a date.", href: "/me/tour" },
  { t: "Contracts", d: "One contract, signed by both, in the same thread. Switches on soon.", href: "/me/contract" },
  { t: "Fans", d: "See where your fans are, and tell a city when you announce.", href: "/me/fans" },
];

function ArtistSections({ count }: { count: number }) {
  return (
    <>
      <section className="k-wrap k-section">
        <SectionHead title="Run it from your phone" sub="Everything that used to live in DMs, spreadsheets and PDFs." />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {FEATURES.map((x) => (
            <Link key={x.t} href={x.href} className="k-surface k-rvs block rounded-[28px] p-8 no-underline md:p-10">
              <h3 className="k-d m-0 text-[40px]">{x.t}</h3>
              <p className="k-b mt-3 text-[17px]">{x.d}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="k-wrap k-section">
        <div className="k-rvs relative overflow-hidden rounded-[28px] p-8 text-[#0a0a0b] md:p-16" style={{ background: "var(--k-pc)" }}>
          <h2 className="k-d max-w-[820px] text-[48px] md:text-[72px]" style={{ color: "#0a0a0b" }}>Your page is probably already here.</h2>
          <p className="mt-4 max-w-[640px] text-[18px] opacity-80">{count ? `${count} artists have pages from nights we list.` : "Artists get pages from nights we list."} Claim yours, then set your rates and your dates.</p>
          <div className="mt-7"><Link href="/claim" className="k-btn k-btn--l no-underline" style={{ background: "#0a0a0b", color: "#fff" }}>Claim your page</Link></div>
        </div>
      </section>
    </>
  );
}
