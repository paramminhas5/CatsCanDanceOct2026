import type { Metadata } from "next";
import { getCcdEvents, getScenePicks } from "@/lib/db";
import { CcdEventCard, SceneRows, eventsSchema } from "../components";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Events: underground dance music in Bengaluru and India",
  description:
    "Cats Can Dance club nights plus a hand-picked list of house, techno, disco, breaks and drum & bass events in Bengaluru, Mumbai, Delhi and Goa.",
};

export default async function EventsPage() {
  const [ccd, scene] = await Promise.all([getCcdEvents(), getScenePicks(80)]);
  const cities = Array.from(new Set(scene.map((e) => e.city).filter(Boolean))) as string[];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsSchema(ccd, scene)) }} />
      <section className="block">
        <div className="wrap">
          <h1 style={{ fontSize: "clamp(40px,8vw,96px)" }}>Events</h1>
          <p className="lede" style={{ fontSize: 20, maxWidth: "50ch" }}>
            Our own nights first. Below that, the other parties across India we think are worth leaving the house for.
          </p>
        </div>
      </section>
      <section className="block">
        <div className="wrap">
          <div className="head"><h2>CCD nights</h2></div>
          {ccd.length ? (
            <div className="grid">{ccd.map((e) => <CcdEventCard key={e.slug} e={e} />)}</div>
          ) : (
            <p className="muted">Next Episode announced soon.</p>
          )}
        </div>
      </section>
      <section className="block" id="scene">
        <div className="wrap">
          <div className="head">
            <h2>Scene picks</h2>
            {cities.length > 0 && <p className="muted" style={{ margin: 0 }}>{cities.join(" · ")}</p>}
          </div>
          <SceneRows events={scene} />
        </div>
      </section>
    </main>
  );
}
