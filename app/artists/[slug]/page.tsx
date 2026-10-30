import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArtist, getArtists } from "@/lib/db";

export const revalidate = 600;

export async function generateStaticParams() {
  return (await getArtists()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await getArtist(params.slug);
  if (!a) return { title: "Artist" };
  return {
    title: `${a.name}: ${a.genres.slice(0, 2).join(", ")} ${a.kind === "musician" ? "DJ / producer" : a.kind}`,
    description: (a.bio ?? a.why ?? `${a.name} on Cats Can Dance.`).slice(0, 155),
  };
}

export default async function ArtistPage({ params }: { params: { slug: string } }) {
  const a = await getArtist(params.slug);
  if (!a) notFound();

  const links = [
    a.instagram && { label: "Instagram", href: a.instagram.startsWith("http") ? a.instagram : `https://instagram.com/${a.instagram.replace(/^@/, "")}` },
    a.soundcloud && { label: "SoundCloud", href: a.soundcloud },
    a.spotify && { label: "Spotify", href: a.spotify },
    a.website && { label: "Website", href: a.website },
  ].filter(Boolean) as { label: string; href: string }[];

  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: a.name,
    genre: a.genres,
    url: `https://catscandance.com/artists/${a.slug}`,
    sameAs: links.map((l) => l.href),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="block">
        <div className="wrap artist-head">
          <div>
            {a.is_resident && <span className="tag">CCD Resident</span>}
            <h1 style={{ fontSize: "clamp(40px,8vw,104px)", marginTop: 14 }}>{a.name}</h1>
            <p style={{ fontWeight: 700 }}>{[a.based_city, a.from_city && a.from_city !== a.based_city ? `from ${a.from_city}` : null].filter(Boolean).join(", ")}</p>
            <div className="chips" style={{ margin: "12px 0 20px" }}>
              {a.genres.map((g) => <span key={g} className="chip">{g}</span>)}
            </div>
            {a.bio && <p style={{ fontSize: 19, maxWidth: "60ch" }}>{a.bio}</p>}
            {a.why && a.why !== a.bio && <p className="muted" style={{ maxWidth: "60ch" }}><b>Why we rate them:</b> {a.why}</p>}
            {a.festivals.length > 0 && <p className="muted"><b>Played:</b> {a.festivals.join(", ")}</p>}
            {a.labels && <p className="muted"><b>Labels:</b> {a.labels}</p>}
            <div className="links" style={{ marginTop: 20 }}>
              {links.map((l) => (
                <a key={l.label} href={l.href} className="btn sm alt" target="_blank" rel="noreferrer">{l.label}</a>
              ))}
              {a.open_to_bookings && (
                <a className="btn sm" href={`mailto:hello@catscandance.com?subject=${encodeURIComponent(`Booking: ${a.name}`)}`}>Book via CCD</a>
              )}
            </div>
          </div>
          <div className="artist-photo">
            {a.photo_url ? <img src={a.photo_url} alt={a.name} /> : <img src="/img/cat-headphones-dance.png" alt="" style={{ width: "70%" }} />}
          </div>
        </div>
      </section>
    </main>
  );
}
