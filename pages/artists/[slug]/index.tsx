/**
 * /artists/[slug] — Artist profile page.
 *
 * getServerSideProps fetches the COMPLETE artist profile directly from
 * Supabase — no self-HTTP calls, no client double-fetch.
 *
 * Before (broken pattern):
 *   1. getStaticProps → fetch(`${baseUrl}/api/artists/${slug}`)  ← self-HTTP, slow
 *   2. Client mounts  → fetch(`/api/artists/${slug}/full`)       ← second fetch
 *   Result: loading spinner on every visit, ISR cold-start latency
 *
 * After (correct pattern):
 *   1. getServerSideProps → getArtistFullProfile(slug)           ← direct DB
 *   2. ArtistDetail receives initialProfile prop                  ← skips all client fetches
 *   Result: full content in HTML on first byte, zero loading spinners
 *
 * SEO: bio, genres, gigs, connections all in HTML → Google indexes everything.
 * Social cards: artist photo + bio in og:image/og:description on share.
 * Vercel Edge: 2-min cache, 5-min stale-while-revalidate.
 */
import type { GetServerSideProps } from "next";
import Head from "next/head";
import ArtistDetailPage from "@/pages/ArtistDetail";
import { getArtistFullProfile } from "@/lib/db/artists";
import ArtistPageV2 from "@/components/artist-v2/ArtistPageV2";
import { artistPageV2On, getArtistV2, coverUrl, displayName, type ArtistV2 } from "@/lib/artist-v2";
import type {
  Artist,
  EventAppearance,
  ArtistConnection,
  ArtistDate,
  ArtistMilestone,
  ArtistRelease,
  ArtistPress,
  ArtistSocialStats,
  ArtistStats,
  ArtistFact,
} from "@/lib/db/types";

// ── Full profile shape passed as props ────────────────────────────────────────

export interface FullProfile {
  artist:        Artist;
  appearances:   EventAppearance[];
  connections:   ArtistConnection[];
  upcomingDates: ArtistDate[];
  milestones:    ArtistMilestone[];
  socialStats:   ArtistSocialStats | null;
  socialHistory: ArtistSocialStats[];
  discography:   ArtistRelease[];
  press:         ArtistPress[];
  stats:         ArtistStats;
  facts:         ArtistFact[];
}

interface Props {
  profile?: FullProfile;
  v2?:      ArtistV2;
  slug:    string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ArtistSlugPage({ profile, v2, slug }: Props) {
  if (v2) return <ArtistV2Page a={v2} />;
  if (!profile) return null;
  const { artist } = profile;

  const SITE  = "https://catscandance.com";
  const city  = artist.based_city ?? artist.from_city ?? "India";
  const genre = (artist.genres ?? []).slice(0, 3).join(", ");
  const desc  = artist.bio
    ? artist.bio.slice(0, 155) + (artist.bio.length > 155 ? "…" : "")
    : `${artist.name} is a ${genre} artist from ${city}. Book, follow, and explore their full profile on Cats Can Dance.`;
  const ogImg = artist.photo_url ?? `${SITE}/og-image.jpg`;
  const url   = `${SITE}/artists/${artist.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type":    "MusicGroup",
    name:       artist.name,
    url,
    image:      ogImg,
    description: desc,
    genre:      artist.genres ?? [],
    ...(artist.instagram && {
      sameAs: [`https://instagram.com/${artist.instagram.replace("@", "")}`],
    }),
  };

  return (
    <>
      <Head>
        <title>{`${artist.name} — Artist Profile | Cats Can Dance`}</title>
        <meta name="description"         content={desc} />
        <link rel="canonical"            href={url} />
        {/* Open Graph */}
        <meta property="og:title"        content={`${artist.name} — Artist Profile`} />
        <meta property="og:description"  content={desc} />
        <meta property="og:url"          content={url} />
        <meta property="og:type"         content="profile" />
        <meta property="og:image"        content={ogImg} />
        <meta property="og:image:alt"    content={`${artist.name} artist photo`} />
        <meta property="og:site_name"    content="Cats Can Dance" />
        {/* Twitter */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={`${artist.name} — Cats Can Dance`} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image"       content={ogImg} />
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      {/*
        Pass the complete pre-fetched profile as initialProfile.
        ArtistDetail checks: if initialProfile is set → skip all useEffect fetches.
        The component renders immediately with full data — no loading state.
      */}
      <ArtistDetailPage
        initialArtist={artist as any}
        initialProfile={profile as any}
        slug={slug}
      />
    </>
  );
}

// ── Server-side data fetching ─────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps<Props> = async ({
  params,
  res,
}) => {
  const slug = (params?.slug as string) ?? "";

  // Artist page v2 (board I) for every approved artist, behind the artist_page_v2 flag.
  // getArtistV2 returns null for anything not approved, which falls through to the old page.
  if (await artistPageV2On()) {
    const v2 = await getArtistV2(slug);
    if (v2) {
      res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
      return { props: { v2, slug } };
    }
  }

  // Cache at Vercel Edge for 2 min, serve stale for 5 min while revalidating
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=120, stale-while-revalidate=300",
  );

  // Single function — fetches artist + all relations in parallel, never throws
  const profile = await getArtistFullProfile(slug);

  // Artist not found → 404
  if (!profile) return { notFound: true };

  return { props: { profile, slug } };
};

// ── v2 page shell ───────────────────────────────────────────────────────────
function ArtistV2Page({ a }: { a: ArtistV2 }) {
  const SITE = "https://catscandance.com";
  const url = `${SITE}/litter/${a.slug}`;
  const latest = a.releases.find((r) => r.albumId);
  const ogImg = a.photo ?? coverUrl(latest?.albumId ?? null, "xl") ?? `${SITE}/og-image.jpg`;
  const name = displayName(a.name);
  const bioLine = a.bio ? a.bio.replace(/\s+/g, " ").slice(0, 150).replace(/\s\S*$/, "") : null;
  const desc = bioLine
    ? `${bioLine}. Releases, shows and story on Cats Can Dance.`
    : `${name}${a.line ? `, ${a.line.toLowerCase()}` : ""}. Releases, shows and moments with sources, and 30 second previews, on Cats Can Dance.`;
  // Structured data so search engines and AI assistants can tell releases, shows and links apart.
  const id = `${url}#artist`;
  const place = (venue: string | null, city: string | null) => ({
    "@type": "Place", name: venue ?? city ?? "TBA",
    address: { "@type": "PostalAddress", addressLocality: city ?? undefined, addressCountry: "IN" },
  });
  const events = [
    ...a.upcoming.map((e) => ({
      "@type": "MusicEvent", name: e.title, startDate: e.event_date, eventStatus: "https://schema.org/EventScheduled",
      location: place(e.venue, e.city), performer: { "@id": id }, url: e.ticket_url ?? undefined,
    })),
    ...a.ccdNights.filter((n) => n.upcoming && n.date).map((n) => ({
      "@type": "MusicEvent", name: n.title, startDate: n.date, eventStatus: "https://schema.org/EventScheduled",
      organizer: { "@type": "Organization", name: "Cats Can Dance", url: SITE }, performer: { "@id": id },
      url: `${SITE}${n.url}`, location: place(null, "Bengaluru"),
    })),
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicGroup", "@id": id, name: a.name, url, image: ogImg, description: desc,
        genre: a.genres.length ? a.genres : undefined,
        foundingLocation: a.city ? { "@type": "Place", name: a.city } : undefined,
        member: a.members ? a.members.split(/[,;&]| and /).map((m) => m.trim()).filter(Boolean).map((m) => ({ "@type": "Person", name: m })) : undefined,
        identifier: [
          { "@type": "PropertyValue", propertyID: "ccd", value: `ccd:artist:${a.slug}` },
          ...a.ids.filter((x) => x.scheme === "musicbrainz" || x.scheme === "wikidata" || x.scheme === "discogs").map((x) => ({ "@type": "PropertyValue", propertyID: x.scheme, value: x.value })),
        ],
        sameAs: [...new Set([...a.links.map((l) => l.url), ...a.ids.map((x) => x.url).filter((u): u is string => !!u)])],
        album: a.releases.filter((r) => !r.undated).slice(0, 30).map((r) => ({
          "@type": "MusicAlbum", name: r.t, datePublished: String(Math.floor(r.y)), byArtist: { "@id": id },
          albumReleaseType: r.type === "single" ? "https://schema.org/SingleRelease" : r.type === "ep" ? "https://schema.org/EPRelease" : r.type === "album" ? "https://schema.org/AlbumRelease" : undefined,
          recordLabel: r.label ? { "@type": "Organization", name: r.label } : undefined,
          url: r.src ?? undefined,
        })),
        event: events.length ? events : undefined,
      },
      {
        "@type": "ProfilePage", url, name: `${name} on Cats Can Dance`, mainEntity: { "@id": id },
        isPartOf: { "@type": "WebSite", name: "Cats Can Dance", url: SITE },
      },
    ],
  };
  return (
    <>
      <Head>
        <title>{`${name}: releases, shows and story | Cats Can Dance`}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={`${name} on Cats Can Dance`} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="profile" />
        <meta property="og:image" content={ogImg} />
        <meta property="og:site_name" content="Cats Can Dance" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={ogImg} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      <ArtistPageV2 a={a} />
    </>
  );
}
