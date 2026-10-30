import type { Metadata } from "next";
import Link from "next/link";
import { getCcdEvents, getScenePicks, splitEvents } from "@/lib/db";
import { CcdEventCard, SceneRows, eventsSchema } from "../components";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Prowl: underground dance music events in India",
  description:
    "A hand-picked list of house, techno, disco, breaks and drum & bass events in Bengaluru, Mumbai, Delhi and Goa, plus Cats Can Dance nights.",
};

export default async function ProwlPage({ searchParams }: { searchParams: { city?: string } }) {
  const [ccd, scene] = await Promise.all([getCcdEvents(), getScenePicks(120)]);
  const { upcoming } = splitEvents(ccd);
  const cities = Array.from(new Set(scene.map((e) => e.city).filter(Boolean))).sort() as string[];
  const city = searchParams.city && cities.includes(searchParams.city) ? searchParams.city : null;
  const shown = city ? scene.filter((e) => e.city === city) : scene;

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsSchema(upcoming, shown)) }} />
      <section className="block">
        <div className="wrap">
          <span className="tag">Find</span>
          <h1 style={{ fontSize: "clamp(40px,8vw,96px)", marginTop: 14 }}>Prowl</h1>
          <p style={{ fontSize: 20, maxWidth: "52ch" }}>
            The nights across India we think are worth leaving the house for. Nothing is listed until we have checked it.
          </p>
          <div className="btns"><Link href="/prowl/submit" className="btn">Submit an event</Link></div>
        </div>
      </section>
      {upcoming.length > 0 && (
        <section className="block">
          <div className="wrap">
            <div className="head"><h2>Our nights</h2></div>
            <div className="grid">{upcoming.map((e) => <CcdEventCard key={e.slug} e={e} />)}</div>
          </div>
        </section>
      )}
      <section className="block" id="scene">
        <div className="wrap">
          <div className="head"><h2>Scene picks</h2></div>
          {cities.length > 0 && (
            <div className="filters">
              <Link href="/prowl#scene" className={city ? "" : "on"}>All</Link>
              {cities.map((c) => (
                <Link key={c} href={`/prowl?city=${encodeURIComponent(c)}#scene`} className={c === city ? "on" : ""}>{c}</Link>
              ))}
            </div>
          )}
          <SceneRows events={shown} />
        </div>
      </section>
    </main>
  );
}
