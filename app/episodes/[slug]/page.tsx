import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCcdEvent, getCcdEvents, getArtists, rsvpCount, fmtLong } from "@/lib/db";
import { RpcForm } from "../../form";

export const revalidate = 120;

export async function generateStaticParams() {
  return (await getCcdEvents()).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const e = await getCcdEvent(params.slug);
  if (!e) return { title: "Episode" };
  const t = `Cats Can Dance ${e.title}${e.venue ? ` at ${e.venue}` : ""}`;
  return { title: t, description: (e.blurb ?? `${e.title} by Cats Can Dance in ${e.city ?? "Bengaluru"}.`).slice(0, 155) };
}

export default async function EpisodePage({ params }: { params: { slug: string } }) {
  const e = await getCcdEvent(params.slug);
  if (!e) notFound();
  const [artists, count] = await Promise.all([getArtists(), e.rsvp_open ? rsvpCount(e.slug) : Promise.resolve(0)]);
  const bySlugName = new Map(artists.map((a) => [a.name.toUpperCase(), a.slug]));
  const full = e.capacity != null && count >= e.capacity;

  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: `Cats Can Dance ${e.title}`,
    startDate: e.event_date,
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: e.venue ?? "TBA", address: e.city ?? "Bengaluru" },
    organizer: { "@type": "Organization", name: "Cats Can Dance", url: "https://catscandance.com" },
    performer: (e.lineup ?? []).map((n) => ({ "@type": "Person", name: n })),
    ...(e.poster_url ? { image: `https://catscandance.com${e.poster_url}` } : {}),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="block">
        <div className="wrap ep-head">
          <div>
            <p className="muted" style={{ margin: 0 }}><Link href="/episodes">Episodes</Link></p>
            <span className="tag" style={{ marginTop: 14 }}>{e.episode_no ? `Episode ${e.episode_no}` : e.title}</span>
            <h1 style={{ fontSize: "clamp(36px,7vw,88px)", marginTop: 14 }}>{e.venue ?? e.title}</h1>
            <p style={{ fontWeight: 700, fontSize: 20 }}>
              {fmtLong(e.event_date)}{e.start_time ? `, ${e.start_time}` : ""}
              <br />{[e.venue, e.city].filter(Boolean).join(", ")}
            </p>
            {e.blurb && <p style={{ fontSize: 19, maxWidth: "56ch" }}>{e.blurb}</p>}
            {e.pet_friendly && <p><span className="chip">Pet friendly</span></p>}
            {(e.lineup ?? []).length > 0 && (
              <>
                <h3 style={{ margin: "24px 0 10px" }}>Lineup</h3>
                <div className="chips">
                  {(e.lineup ?? []).map((n) => {
                    const slug = bySlugName.get(n.toUpperCase());
                    return slug ? (
                      <Link key={n} href={`/litter/${slug}`} className="chip" style={{ textDecoration: "none" }}>{n}</Link>
                    ) : (
                      <span key={n} className="chip">{n}</span>
                    );
                  })}
                </div>
              </>
            )}
            {e.recap && <p className="prose" style={{ marginTop: 24 }}>{e.recap}</p>}
          </div>
          {e.poster_url && <img className="poster" src={e.poster_url} alt={`${e.title} poster`} />}
        </div>
      </section>

      {e.rsvp_open ? (
        <section className="block">
          <div className="wrap">
            <h2 style={{ marginBottom: 20 }}>RSVP</h2>
            {full ? (
              <p>This one is full. Leave your email and we will tell you when the next Episode opens.</p>
            ) : (
              <RpcForm
                fn="rsvp"
                hidden={{ p_event_slug: e.slug }}
                fields={[
                  { name: "p_name", label: "Name", required: true },
                  { name: "p_email", label: "Email", type: "email", required: true },
                  { name: "p_plus_ones", label: "Plus ones (0 to 2)", type: "number" },
                ]}
                submit="RSVP"
                done="You are on the list. Check your email for the details closer to the night."
              />
            )}
          </div>
        </section>
      ) : (
        <section className="block">
          <div className="wrap">
            <h2 style={{ marginBottom: 20 }}>{e.event_date && e.event_date < new Date().toISOString().slice(0, 10) ? "Next one" : "RSVP opens soon"}</h2>
            <p style={{ maxWidth: "50ch" }}>Leave your email and we will tell you when the next Episode opens.</p>
            <RpcForm
              fn="signup"
              hidden={{ p_source: "episodes" }}
              fields={[{ name: "p_email", label: "Email", type: "email", required: true }]}
              submit="Tell me"
              done="Done. We will email you when the next Episode opens."
            />
          </div>
        </section>
      )}
    </main>
  );
}
