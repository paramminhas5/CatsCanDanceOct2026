import Link from "next/link";
import { getCcdEvents, getScenePicks, getArtists, splitEvents } from "@/lib/db";
import { PRODUCTS } from "@/lib/products";
import { CcdEventCard, SceneRows, ArtistCard, eventsSchema } from "./components";

export const revalidate = 300;

export default async function Home() {
  const [ccd, scene, artists] = await Promise.all([getCcdEvents(), getScenePicks(8), getArtists()]);
  const { upcoming, past } = splitEvents(ccd);
  const residents = artists.filter((a) => a.is_resident);
  const feature = upcoming.length ? upcoming : past.slice(0, 2);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsSchema(upcoming, scene)) }} />
      <section className="hero">
        <div className="wrap">
          <div>
            <span className="tag">Bengaluru · House · Disco · Breaks · UKG · D&amp;B</span>
            <h1 style={{ marginTop: 18 }}>Every cat has a rhythm.</h1>
            <p className="lede">Small rooms, curated lineups, no commercial EDM. Bring your pet.</p>
            <div className="btns">
              <Link href="/episodes" className="btn">Go to an Episode</Link>
              <Link href="/prowl" className="btn alt">Find what&apos;s on</Link>
            </div>
          </div>
          <img className="cat" src="/img/cat-dj-hero.png" alt="CCD cat on the decks" />
        </div>
      </section>

      <div className="marquee" aria-hidden>
        <span>{"RSVP ONLY ✦ SMALL ROOMS ✦ BIG SOUND ✦ PETS WELCOME ✦ NO TOP 40 ✦ ".repeat(6)}</span>
      </div>

      <section className="block">
        <div className="wrap">
          <div className="head">
            <h2>{upcoming.length ? "Next Episode" : "Latest Episodes"}</h2>
            <Link href="/episodes" className="btn sm">All Episodes</Link>
          </div>
          {upcoming.length === 0 && <p className="muted">Next Episode announced soon. Follow @catscan.dance.</p>}
          <div className="grid">{feature.slice(0, 3).map((e) => <CcdEventCard key={e.slug} e={e} />)}</div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="head">
            <div>
              <h2>One cat, eight things</h2>
              <p className="muted" style={{ margin: "10px 0 0" }}>Each one does a single job. They all link to each other.</p>
            </div>
          </div>
          <div className="suite">
            {PRODUCTS.map((p) => {
              const inner = (
                <>
                  <span className="verb">{p.verb}</span>
                  <span className="nm">{p.name}</span>
                  <span>{p.line}</span>
                  {!p.live && <span className="soon">Coming soon</span>}
                </>
              );
              return p.external ? <a key={p.name} href={p.href}>{inner}</a> : <Link key={p.name} href={p.href}>{inner}</Link>;
            })}
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="head">
            <div>
              <h2>On Prowl</h2>
              <p className="muted" style={{ margin: "10px 0 0" }}>Other nights across India we&apos;d go to.</p>
            </div>
            <Link href="/prowl#scene" className="btn sm alt">More picks</Link>
          </div>
          <SceneRows events={scene} />
        </div>
      </section>

      {residents.length > 0 && (
        <section className="block">
          <div className="wrap">
            <div className="head">
              <h2>Residents</h2>
              <Link href="/litter" className="btn sm">Meet Litter</Link>
            </div>
            <div className="grid">{residents.map((a) => <ArtistCard key={a.slug} a={a} />)}</div>
          </div>
        </section>
      )}
    </main>
  );
}
