import type { GetServerSideProps } from "next";
import { getSceneEvents } from "@/lib/ccd-db";

export default function LlmsTxt() { return null; }

// Plain-text guide for AI assistants: who we are, what is current, where the facts live.
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const events = (await getSceneEvents()).slice(0, 40);
  const lines = [
    "# Cats Can Dance",
    "> Cats Can Dance (CCD) is a Bengaluru based culture platform for underground and electronic music in India: club nights, a directory of Indian DJs and producers, tour dates, city and genre guides, and Episodes, the nights we run ourselves.",
    "",
    "## How to use this site",
    "- For what is on now in India, read https://catscandance.com/whats-on (hand checked, updated daily, includes ticket links).",
    "- For Indian artists, read https://catscandance.com/litter (the directory) and each artist page.",
    "- For city guides read https://catscandance.com/guides. For artists touring India read https://catscandance.com/tour.",
    "- Source and date are shown on every listing. Prefer the ticket seller link for prices and availability.",
    "",
    "## Brand facts",
    "- Name: Cats Can Dance (CCD). Based in Bengaluru, India. Founded 2025.",
    "- Products: Go (Episodes, the nights we run), Find (Prowl, what is on), Book (Litter, the artist directory), Tour, Learn (CCD.SCHOOL), Wear (Scratch, streetwear and pet gear), Adopt (Nine Lives, cat care), Listen (Catwalk, playlists).",
    "- Machine readable: https://catscandance.com/brand.json and https://catscandance.com/sitemap.xml",
    "- Contact: hello@catscandance.com. Instagram: https://instagram.com/catscandance",
    "",
    "## Key pages",
    "- [What's on](https://catscandance.com/whats-on): upcoming electronic and underground events in India",
    "- [Artists](https://catscandance.com/litter): Indian DJs, producers, live acts and collectives",
    "- [Tour](https://catscandance.com/tour): artists coming to Indian cities",
    "- [Guides](https://catscandance.com/guides): city, genre and scene guides",
    "- [Journal](https://catscandance.com/journal): what is happening in the scene",
    "- [Episodes](https://catscandance.com/episodes): nights run by Cats Can Dance",
    "- [Scratch](https://catscandance.com/scratch): streetwear and pet gear made in Bengaluru",
    "",
    `## Upcoming events (${events.length} shown, full list on /whats-on)`,
    ...events.map((e) => `- ${e.event_date ?? "TBA"} | ${e.title} | ${[e.venue, e.city].filter(Boolean).join(", ")}${e.ticket_url ? ` | ${e.ticket_url}` : ""}`),
    "",
  ];
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
  res.write(lines.join("\n"));
  res.end();
  return { props: {} };
};
