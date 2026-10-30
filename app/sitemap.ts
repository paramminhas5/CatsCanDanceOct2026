import type { MetadataRoute } from "next";
import { getArtists, getCcdEvents, getPosts, getScenes } from "@/lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://catscandance.com";
  const [artists, events, posts, scenes] = await Promise.all([getArtists(), getCcdEvents(), getPosts(), getScenes()]);
  const top = ["", "/episodes", "/prowl", "/litter", "/tour", "/nine-lives", "/journal", "/guides", "/scratch", "/catwalk"];
  return [
    ...top.map((p, i) => ({ url: `${base}${p}`, changeFrequency: (i < 5 ? "daily" : "weekly") as "daily" | "weekly", priority: i === 0 ? 1 : i < 5 ? 0.9 : 0.6 })),
    ...events.map((e) => ({ url: `${base}/episodes/${e.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...artists.map((a) => ({ url: `${base}/litter/${a.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...posts.map((p) => ({ url: `${base}/journal/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...scenes.map((s) => ({ url: `${base}/guides/${s.kind}/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
