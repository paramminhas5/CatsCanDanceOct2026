/**
 * /artists/[slug]: the artist page from the live catscandance.com (artist page v2, board I), brought into the
 * suite build (Param, 13 Nov 2026: "the artist page was better, check out catscandance.com"). Eras rail, the
 * scrubber and player, releases, popular, watch and listen, shows, press, connections, fans also like.
 * Booking hands over to the Artists app.
 */
import type { GetServerSideProps } from "next";
import Head from "next/head";
import ArtistPage from "@/components/artist-v2/ArtistPage";
import Shell from "@/suite/Shell";
import { SuiteNav } from "@ccd/ui";
import { productLink } from "@ccd/brand";
import { getArtistV2, coverUrl, displayName, type ArtistV2 } from "@/lib/artist-v2";

type Props = { a: ArtistV2 };

function firstSentences(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  const parts = t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t];
  let out = "";
  for (const p of parts) { if ((out + p).trim().length > max) break; out += p; }
  return out.trim() || t.slice(0, max).replace(/\s\S*$/, "") + "…";
}

export default function ArtistSlugPage({ a }: Props) {
  const SITE = "https://catscandance.com";
  const url = `${SITE}/artists/${a.slug}`;
  const latest = a.releases.find((r) => r.albumId);
  const ogImg = a.photo ?? coverUrl(latest?.albumId ?? null, "xl") ?? `${SITE}/og-image.jpg`;
  const name = displayName(a.name);
  const desc = a.bio ? `${firstSentences(a.bio, 150)} Shows, releases and booking on Cats Can Dance.` : `${name}. Releases, shows and moments with sources, and 30 second previews, on Cats Can Dance.`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup", name: a.name, url, image: ogImg, description: desc,
    genre: a.genres.length ? a.genres : undefined,
    sameAs: [...new Set(a.links.map((l) => l.url))],
  };
  return (
    <>
      <Head>
        <title>{`${name}: shows, music and booking | Cats Can Dance`}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={`${name} on Cats Can Dance`} />
        <meta property="og:description" content={desc} />
        <meta property="og:image" content={ogImg} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      <Shell title={`${name}: shows, music and booking | Cats Can Dance`} description={desc}
        nav={<SuiteNav current="artists" account={{ href: "/me", label: "Your account" }} cta={{ href: productLink("artists", `/${a.slug}/book`), label: `Book ${name}` }}
          sub={[{ href: productLink("artists", "/artists"), label: "All artists" }, { href: productLink("artists", "/tour"), label: "On tour" }, { href: productLink("artists", "/claim"), label: "Claim your page" }]} />}>
        <ArtistPage a={a} />
      </Shell>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, res }) => {
  const slug = String(params?.slug ?? "");
  const a = await getArtistV2(slug);
  if (!a) return { notFound: true };
  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
  return { props: { a } };
};
