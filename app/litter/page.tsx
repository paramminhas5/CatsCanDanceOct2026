import type { Metadata } from "next";
import Link from "next/link";
import { getArtists } from "@/lib/db";
import { ArtistCard } from "../components";

export const revalidate = 600;
export const metadata: Metadata = {
  title: "Litter: Indian electronic music DJs and producers to book",
  description: "CCD residents and the Indian electronic artists we rate. Send a booking request or claim your profile.",
};

export default async function LitterPage() {
  const artists = await getArtists();
  const residents = artists.filter((a) => a.is_resident);
  const played = artists.filter((a) => !a.is_resident && a.played_ccd);
  const rest = artists
    .filter((a) => !a.is_resident && !a.played_ccd)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name));
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <span className="tag">Book</span>
          <h1 style={{ fontSize: "clamp(40px,8vw,96px)", marginTop: 14 }}>Litter</h1>
          <p style={{ fontSize: 20, maxWidth: "52ch" }}>
            The artists we rate. Open any profile to send a booking request. DJs and producers can claim a profile or join.
          </p>
          <div className="btns"><Link href="/litter/join" className="btn">Join Litter</Link></div>
        </div>
      </section>
      {residents.length > 0 && (
        <section className="block">
          <div className="wrap">
            <div className="head"><h2>Residents</h2></div>
            <div className="grid">{residents.map((a) => <ArtistCard key={a.slug} a={a} />)}</div>
          </div>
        </section>
      )}
      {played.length > 0 && (
        <section className="block">
          <div className="wrap">
            <div className="head"><h2>Played CCD</h2></div>
            <div className="grid">{played.map((a) => <ArtistCard key={a.slug} a={a} />)}</div>
          </div>
        </section>
      )}
      <section className="block">
        <div className="wrap">
          <div className="head"><h2>On our radar</h2><span className="muted">{rest.length} artists</span></div>
          <div className="grid">{rest.map((a) => <ArtistCard key={a.slug} a={a} />)}</div>
        </div>
      </section>
    </main>
  );
}
