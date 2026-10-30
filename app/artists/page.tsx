import type { Metadata } from "next";
import { getArtists } from "@/lib/db";
import { ArtistCard } from "../components";

export const revalidate = 600;
export const metadata: Metadata = {
  title: "Artists: Indian electronic music DJs and producers",
  description: "CCD residents and the Indian electronic artists we rate, from Bengaluru and beyond.",
};

export default async function ArtistsPage() {
  const artists = await getArtists();
  const residents = artists.filter((a) => a.is_resident);
  const rest = artists.filter((a) => !a.is_resident);
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <h1 style={{ fontSize: "clamp(40px,8vw,96px)" }}>Artists</h1>
          <p style={{ fontSize: 20, maxWidth: "52ch" }}>
            Want to play a CCD night? Send a 30 to 60 minute mix, your IG and one line about you to{" "}
            <a href="mailto:hello@catscandance.com?subject=Booking">hello@catscandance.com</a>.
          </p>
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
      <section className="block">
        <div className="wrap">
          <div className="head"><h2>On our radar</h2><span className="muted">{rest.length} artists</span></div>
          <div className="grid">{rest.map((a) => <ArtistCard key={a.slug} a={a} />)}</div>
        </div>
      </section>
    </main>
  );
}
