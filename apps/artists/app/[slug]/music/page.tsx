/** An artist's music, every release (board A40-ArtistMusic). Filter by type through ?type=. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Sleeve, Pill, ButtonLink, Icon } from "@ccd/ui";
import ArtistTabs from "@/components/ArtistTabs";
import FollowButton from "@/components/FollowButton";
import { coverUrl } from "@/lib/artist-v2";
import { getArtistPage, inrShort } from "@/lib/artist-page";
import { isSlug } from "@/lib/db";
import { RESERVED } from "@/lib/site";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ type?: string }> };
const TYPES: [string, string][] = [["", "All"], ["album", "Albums"], ["ep", "EPs"], ["single", "Singles"]];
const NAME: Record<string, string> = { album: "Album", ep: "EP", single: "Single", remix: "Remix", compilation: "Compilation" };

async function load(slug: string) {
  return isSlug(slug) && !RESERVED.has(slug) ? getArtistPage(slug) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: `${p.name}: music`, description: `${p.counts.records} releases by ${p.name}.` } : { title: "Not found", robots: { index: false } };
}

export default async function Music({ params, searchParams }: Props) {
  const { slug } = await params;
  const { type = "" } = await searchParams;
  const p = await load(slug);
  if (!p) notFound();
  const t = TYPES.some(([k]) => k === type) ? type : "";
  const list = t ? p.releases.filter((r) => r.type === t) : p.releases;
  const count = (k: string) => (k ? p.releases.filter((r) => r.type === k).length : p.releases.length);
  return (
    <main className="k-root">
      <section className="k-wrap pt-10">
        <Link href={`/${slug}`} className="k-b inline-flex items-center gap-1 text-sm"><Icon name="back" size={14} />{p.name}</Link>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <h1 className="k-d flex-1 text-[48px] md:text-[72px]">{p.name}</h1>
          <FollowButton slug={slug} name={p.name} size="m" />
          {p.fee && <ButtonLink href={`/book?a=${slug}`}>Book from {inrShort(p.fee.min)}</ButtonLink>}
        </div>
        <div className="mt-8"><ArtistTabs slug={slug} current="music" music={p.counts.records} shows={p.counts.shows} /></div>
        <div className="mt-6 flex flex-wrap gap-2">
          {TYPES.filter(([k]) => count(k) > 0).map(([k, label]) => <Pill key={k} href={`/${slug}/music${k ? `?type=${k}` : ""}`} on={k === t}>{label} {count(k)}</Pill>)}
        </div>
      </section>
      <section className="k-wrap pt-10">
        <ul className="grid list-none grid-cols-2 gap-x-6 gap-y-10 p-0 pr-6 md:grid-cols-4 md:gap-x-10 lg:grid-cols-5">
          {list.map((r) => {
            const href = r.links[0]?.url;
            return (
              <li key={r.id}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener" className="block no-underline"><Sleeve title={r.t} label={r.label} cover={coverUrl(r.albumId, "big")} fontSize={28} /></a>
                ) : <Sleeve title={r.t} label={r.label} cover={coverUrl(r.albumId, "big")} fontSize={28} />}
                <b className="mt-4 block truncate text-[16px] font-semibold">{r.t}</b>
                <span className="k-b block truncate text-[13px]">{[NAME[r.type] ?? "Release", r.date, r.label].filter(Boolean).join(" · ")}</span>
                {r.links.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                    {r.links.slice(0, 3).map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener" style={{ color: "var(--k-t2)" }}>{l.label}</a>)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
