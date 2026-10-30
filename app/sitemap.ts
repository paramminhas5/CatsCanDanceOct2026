import type { MetadataRoute } from "next";
import { getArtists } from "@/lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://catscandance.com";
  const artists = await getArtists();
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/artists`, changeFrequency: "weekly", priority: 0.8 },
    ...artists.map((a) => ({ url: `${base}/artists/${a.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
