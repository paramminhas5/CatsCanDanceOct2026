import type { GetStaticProps } from "next";
import { select } from "@/lib/ccd-db";
import { todayIST } from "@/lib/nights";
import EpisodesSuite, { type Ep } from "@/suite/EpisodesSuite";

/** /nights (rewrite to /events): our Episodes. The next one up top, a crew, points, then every past one. */
export default EpisodesSuite;

export const getStaticProps: GetStaticProps<{ next: Ep | null; past: Ep[] }> = async () => {
  const today = todayIST();
  const rows = await select<Ep>("events?promoter_id=is.null&host_id=is.null&published=not.is.false&select=slug,title,event_date,start_time,venue,city,poster_url,lineup&order=event_date.desc&limit=40", 300);
  const up = rows.filter((e) => (e.event_date ?? "") >= today).sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const past = rows.filter((e) => (e.event_date ?? "") < today);
  return { props: { next: up[0] ?? null, past }, revalidate: 300 };
};
