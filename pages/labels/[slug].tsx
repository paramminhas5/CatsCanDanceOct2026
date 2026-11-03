import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PageHero from "@/components/PageHero";
import { select } from "@/lib/ccd-db";

type Source = string | { url: string; note?: string };
type Label = {
  slug: string; name: string; city: string | null; country: string | null; founded: number | null; founders: string | null;
  genres: string[]; description: string | null; website: string | null; instagram: string | null; bandcamp: string | null; soundcloud: string | null;
  discogs_url: string | null; musicbrainz_url: string | null; roster_artist_slugs: string[]; sources: Source[];
};
type Roster = { slug: string; name: string };

const ext = (s: string | null) => (s ? (/^https?:\/\//i.test(s) ? s : `https://${s}`) : null);

export const getStaticPaths: GetStaticPaths = async () => {
  const rows = await select<{ slug: string }>("labels?select=slug", 600).catch(() => []);
  return { paths: rows.map((r) => ({ params: { slug: r.slug } })), fallback: "blocking" };
};

export const getStaticProps: GetStaticProps<{ label: Label; roster: Roster[] }> = async ({ params }) => {
  const s = String(params?.slug ?? "");
  const rows = await select<Label>(`labels?slug=eq.${encodeURIComponent(s)}&select=*`, 600).catch(() => []);
  if (!rows[0]) return { notFound: true, revalidate: 600 };
  const label = rows[0];
  const slugs = label.roster_artist_slugs ?? [];
  const roster = slugs.length ? await select<Roster>(`artists?status=eq.approved&slug=in.(${slugs.map(encodeURIComponent).join(",")})&select=slug,name&order=name.asc`, 600).catch(() => []) : [];
  return { props: { label, roster }, revalidate: 600 };
};

export default function LabelPage({ label: l, roster }: { label: Label; roster: Roster[] }) {
  const links = [["Website", ext(l.website)], ["Bandcamp", ext(l.bandcamp)], ["SoundCloud", ext(l.soundcloud)], ["Discogs", l.discogs_url], ["MusicBrainz", l.musicbrainz_url],
    ["Instagram", l.instagram ? `https://instagram.com/${l.instagram.replace(/^@/, "")}` : null]].filter(([, u]) => u) as [string, string][];
  const ld = { "@context": "https://schema.org", "@type": "Organization", name: l.name, url: ext(l.website) ?? undefined, foundingDate: l.founded ? String(l.founded) : undefined, description: l.description ?? undefined, sameAs: links.map(([, u]) => u) };
  return (
    <div className="min-h-screen bg-cream">
      <SEO title={`${l.name}, record label | Cats Can Dance`} description={l.description ?? `${l.name} is a record label from ${l.country ?? "India"}.`} path={`/labels/${l.slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Nav />
      <PageHero eyebrow="Label" title={l.name}>
        <p className="text-cream/90 max-w-2xl">{[l.city, l.country].filter(Boolean).join(", ")}{l.founded ? ` · since ${l.founded}` : ""}</p>
      </PageHero>
      <section className="container py-8 grid gap-8 max-w-3xl">
        {l.description && <p className="text-ink text-lg">{l.description}</p>}
        {l.founders && <p className="text-ink"><b>Founders:</b> {l.founders}</p>}
        {l.genres.length > 0 && <p className="text-ink"><b>Sound:</b> {l.genres.join(", ")}</p>}
        {links.length > 0 && <div className="flex flex-wrap gap-2">{links.map(([t, u]) => <a key={t} href={u} target="_blank" rel="noreferrer" className="text-sm font-display bg-ink text-cream px-3 py-1 border-2 border-ink">{t} ↗</a>)}</div>}
        {roster.length > 0 && (
          <div><h2 className="font-display text-2xl uppercase mb-2">On the CCD roster</h2>
            <ul className="flex flex-wrap gap-2">{roster.map((a) => <li key={a.slug}><Link href={`/artists/${a.slug}`} className="text-sm font-display bg-acid-yellow text-ink px-3 py-1 border-2 border-ink">{a.name}</Link></li>)}</ul></div>
        )}
        {l.sources?.length > 0 && (
          <div><h2 className="font-display text-xl uppercase mb-2">Sources</h2>
            <ul className="text-sm text-ink/70 list-disc pl-5">{l.sources.map((s, i) => { const u = typeof s === "string" ? s : s.url; return <li key={i}><a href={u} target="_blank" rel="noreferrer" className="underline break-all">{u}</a></li>; })}</ul></div>
        )}
        <p><Link href="/labels" className="font-display underline">← All labels</Link></p>
      </section>
      <Footer />
    </div>
  );
}
