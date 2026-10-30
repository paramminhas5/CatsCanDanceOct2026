import type { Metadata } from "next";
import { getCcdEvents, splitEvents } from "@/lib/db";
import { CcdEventCard, eventsSchema } from "../components";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Episodes: Cats Can Dance club nights in Bengaluru",
  description: "Every Cats Can Dance night: dates, venues, lineups and RSVP. Small rooms, pets welcome.",
};

export default async function EpisodesPage() {
  const all = await getCcdEvents();
  const { upcoming, past } = splitEvents(all);
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsSchema(all, [])) }} />
      <section className="block">
        <div className="wrap">
          <span className="tag">Go</span>
          <h1 style={{ fontSize: "clamp(40px,8vw,96px)", marginTop: 14 }}>Episodes</h1>
          <p style={{ fontSize: 20, maxWidth: "50ch" }}>Our own nights. Small rooms, a tight lineup, RSVP only.</p>
        </div>
      </section>
      <section className="block">
        <div className="wrap">
          <div className="head"><h2>Coming up</h2></div>
          {upcoming.length ? (
            <div className="grid">{upcoming.map((e) => <CcdEventCard key={e.slug} e={e} />)}</div>
          ) : (
            <p className="muted">Next Episode announced soon. Follow @catscan.dance.</p>
          )}
        </div>
      </section>
      <section className="block">
        <div className="wrap">
          <div className="head"><h2>Past Episodes</h2></div>
          <div className="grid">{past.map((e) => <CcdEventCard key={e.slug} e={e} />)}</div>
        </div>
      </section>
    </main>
  );
}
