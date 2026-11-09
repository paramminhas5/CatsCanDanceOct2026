import type { GetStaticProps } from "next";
import NightsSuite, { type NightsProps } from "@/suite/NightsSuite";
import { getCcdEvents, getSceneEvents, splitEvents } from "@/lib/ccd-db";
import { todayIST } from "@/lib/nights";

export default NightsSuite;

/** Served at /nights (rewrite). Our nights split into upcoming and past, plus this week's count. */
export const getStaticProps: GetStaticProps<NightsProps> = async () => {
  const today = todayIST();
  const until = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  const [all, scene] = await Promise.all([getCcdEvents(), getSceneEvents()]);
  const { upcoming, past } = splitEvents(all);
  const weekCount = scene.filter((e) => e.event_date && e.event_date >= today && e.event_date <= until).length;
  return { props: { upcoming, past, weekCount }, revalidate: 600 };
};
