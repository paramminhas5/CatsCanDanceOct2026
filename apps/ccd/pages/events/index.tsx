import type { GetStaticProps } from "next";
import { Landing } from "@ccd/ui";
import FitWidth from "@ccd/ui/FitWidth";
import { html } from "@ccd/ui/boards/land-nights";
import { getSceneEvents } from "@/lib/ccd-db";
import { todayIST } from "@/lib/nights";
import Shell from "@/suite/Shell";

type Props = { weekCount: number };

/** The Nights landing (board W35-LandNights), served at /nights (rewrite). This week's count is live. */
export default function NightsLanding({ weekCount }: Props) {
  return (
    <Shell title="Nights: find a night, find your crew, come to ours | Cats Can Dance" description="The nights worth going to, picked by people who go out. Get a ticket, ask for the guest list, or go with a crew.">
      <Landing html={html} tryHref="/whats-on" tokens={{ WEEKCOUNT: String(weekCount) }} />
      <FitWidth selector=".w35 > .f" min={820} />
    </Shell>
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  const today = todayIST();
  const until = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  const scene = await getSceneEvents();
  const weekCount = scene.filter((e) => e.event_date && e.event_date >= today && e.event_date <= until).length;
  return { props: { weekCount }, revalidate: 600 };
};
