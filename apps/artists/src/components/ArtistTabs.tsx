import { Tabs } from "@ccd/ui";

/** The artist page tabs (boards A40-Artist, A40-ArtistMusic, A40-ArtistShows). Tabs with nothing in them are left out. */
export default function ArtistTabs({ slug, current, music, shows }: { slug: string; current: "overview" | "music" | "shows"; music: number; shows: number }) {
  const items = [
    { href: `/${slug}`, label: "Overview" },
    ...(music ? [{ href: `/${slug}/music`, label: "Music", count: music }] : []),
    ...(shows ? [{ href: `/${slug}/shows`, label: "Shows", count: shows }] : []),
  ];
  const cur = current === "overview" ? `/${slug}` : `/${slug}/${current}`;
  return <Tabs label="Artist" current={cur} items={items} />;
}
