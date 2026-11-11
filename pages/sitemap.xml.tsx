import { GetServerSideProps } from "next";
import { CITY_SCENES, GLOBAL_SCENES, GENRE_PAGES } from "@/content/scenes";

const BASE = "https://catscandance.com";

function url(loc: string, priority: string, changefreq: string, lastmod?: string) {
  return `  <url>
    <loc>${BASE}${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <lastmod>${lastmod ?? new Date().toISOString().split("T")[0]}</lastmod>
  </url>`;
}

function buildSitemap(artistSlugs: string[], promoterSlugs: string[] = [], nights: { slug: string; updated_at?: string | null }[] = []): string {
  const today = new Date().toISOString().split("T")[0];

  const staticUrls = [
    url("/", "1.0", "weekly", today),
    url("/whats-on", "0.95", "weekly", today),
    url("/about", "0.8", "monthly"),
    url("/nights", "1.0", "daily", today),
    url("/tour", "0.8", "daily", today),
    url("/llms.txt", "0.5", "daily", today),
    url("/guides", "0.8", "weekly", today),
    url("/talent", "0.8", "weekly", today),
    url("/playbook", "0.6", "monthly"),
    url("/artists", "0.95", "weekly", today),
    url("/promoters", "0.85", "weekly", today),
    url("/shop", "0.85", "weekly", today),
    url("/journal", "0.9", "weekly", today),
    url("/videos", "0.7", "monthly"),
    url("/listen", "0.7", "monthly"),
    url("/press", "0.6", "monthly"),
    url("/media", "0.6", "monthly"),
    url("/pets", "0.7", "monthly"),
    url("/adopt", "0.7", "monthly"),
    url("/bengaluru-underground-dance-music", "0.9", "monthly"),
    url("/bengaluru-techno-events", "0.85", "monthly"),
    url("/bengaluru-house-parties", "0.85", "monthly"),
    url("/submit-event", "0.6", "monthly"),
    url("/for-artists", "0.75", "monthly"),
    url("/for-venues", "0.75", "monthly"),
    url("/promote", "0.7", "monthly"),
    url("/gate", "0.75", "monthly"),
    url("/points", "0.6", "monthly"),
    url("/for-investors", "0.7", "monthly"),
  ];

  const cityUrls = CITY_SCENES.map(c =>
    url(`/scene/${c.slug}`, "0.9", "weekly", today)
  );

  const genreUrls = GENRE_PAGES.map(g =>
    url(`/genres/${g.slug}`, "0.85", "monthly")
  );

  const sceneUrls = GLOBAL_SCENES.map(s =>
    url(`/scenes/${s.slug}`, "0.8", "monthly")
  );

  const artistUrls = artistSlugs.map(slug =>
    url(`/artists/${slug}`, "0.8", "monthly", today)
  );

  const promoterUrls = promoterSlugs.map((slug) => url(`/promoters/${slug}`, "0.7", "weekly", today));
  const nightUrls = nights.map((n) => url(`/nights/${n.slug}`, "0.8", "weekly", (n.updated_at ?? today).slice(0, 10)));

  const allUrls = [
    ...staticUrls,
    ...cityUrls,
    ...genreUrls,
    ...sceneUrls,
    ...artistUrls,
    ...promoterUrls,
    ...nightUrls,
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allUrls.join("\n")}
</urlset>`;
}

export default function SitemapXml() {
  // Rendered server-side only — component never actually renders
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Fetch all approved artist slugs directly from Supabase — no self-HTTP
  let artistSlugs: string[] = [];
  try {
    const { sbGet, pq, eqf, ord } = await import("@/lib/db/supabase");
    const artists = await sbGet<{ slug: string }>(
      "artists",
      pq({ ...eqf("status", "approved"), ...ord("name"), "select": "slug" }),
    );
    artistSlugs = artists.map((a) => a.slug).filter(Boolean);
  } catch {
    // silently skip — sitemap still works without artist slugs
  }

  // Promoters that qualify for a page (migration 057) and published nights, ours and promoters'.
  let promoterSlugs: string[] = [];
  let nights: { slug: string; updated_at?: string | null }[] = [];
  try {
    const { rpc, select } = await import("@/lib/ccd-db");
    const [p, n] = await Promise.all([
      rpc<{ slug: string }[]>("promoters_public", {}).catch(() => []),
      select<{ slug: string; updated_at: string | null }>("events?published=is.true&select=slug,updated_at&order=event_date.desc&limit=500", 3600).catch(() => []),
    ]);
    promoterSlugs = (p ?? []).map((x) => x.slug).filter(Boolean);
    nights = (n ?? []).filter((x) => x.slug && !/^test-/.test(x.slug));
  } catch {
    // skip: the rest of the sitemap still works
  }

  const sitemap = buildSitemap(artistSlugs, promoterSlugs, nights);

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=43200");
  res.write(sitemap);
  res.end();

  return { props: {} };
};
