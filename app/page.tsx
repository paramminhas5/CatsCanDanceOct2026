import Link from "next/link";
import { getCcdEvents, getScenePicks, getArtists } from "@/lib/db";
import { CcdEventCard, SceneRows, ArtistCard, eventsSchema } from "./components";

export const revalidate = 300;

export default async function Home() {
  const [ccd, scene, artists] = await Promise.all([getCcdEvents(), getScenePicks(8), getArtists()]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = ccd.filter((e) => (e.event_date ? e.event_date >= today : e.status === "upcoming"));
  const residents = artists.filter((a) => a.is_resident);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsSchema(upcoming, scene)) }} />
      <section className="hero">
        <div className="wrap">
          <div>
            <span className="tag">Bengaluru · House · Disco · Breaks · UKG · D&amp;B</span>
            <h1 style={{ marginTop: 18 }}>Every cat has a rhythm.</h1>
            <p className="lede">
              Small rooms, curated lineups, no commercial EDM. Bring your pet.
            </p>
            <div className="btns">
              <Link href="/events" className="btn">See what&apos;s on</Link>
              <a href="mailto:hello@catscandance.com?subject=Booking" className="btn alt">Play for CCD</a>
            </div>
          </div>
          <img className="cat" src="/img/cat-dj-hero.png" alt="CCD cat on the decks" />
        </div>
      </section>

      <div className="marquee" aria-hidden>
        <span>
          {"RSVP ONLY ✦ SMALL ROOMS ✦ BIG SOUND ✦ PETS WELCOME ✦ NO TOP 40 ✦ ".repeat(6)}
        </span>
      </div>

      <section className="block">
        <div className="wrap">
          <div className="head">
            <h2>CCD nights</h2>
            <Link href="/events" className="btn sm">All events</Link>
          </div>
          {upcoming.length ? (
            <div className="grid">{upcoming.slice(0, 6).map((e) => <CcdEventCard key={e.slug} e={e} />)}</div>
          ) : (
            <p className="muted">Next Episode announced soon. Follow @catscan.dance.</p>
          )}
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="head">
            <div>
              <h2>Scene picks</h2>
              <p className="muted" style={{ margin: "10px 0 0" }}>Other nights across India we&apos;d go to.</p>
            </div>
            <Link href="/events#scene" className="btn sm alt">More picks</Link>
          </div>
          <SceneRows events={scene} />
        </div>
      </section>

      {residents.length > 0 && (
        <section className="block">
          <div className="wrap">
            <div className="head">
              <h2>Residents</h2>
              <Link href="/artists" className="btn sm">All artists</Link>
            </div>
            <div className="grid">{residents.map((a) => <ArtistCard key={a.slug} a={a} />)}</div>
          </div>
        </section>
      )}
    </main>
  );
}
