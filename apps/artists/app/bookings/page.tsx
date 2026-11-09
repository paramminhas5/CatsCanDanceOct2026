import Link from "next/link";
import type { Metadata } from "next";
import BookingsList from "@/components/BookingsList";
import { getMember, firstName } from "@/lib/auth";
import ArtistApp from "@/components/app/ArtistApp";

export const metadata: Metadata = { title: "Bookings", robots: { index: false } };

export default async function Bookings() {
  const member = await getMember();
  return (
    <ArtistApp initial={member ? (firstName(member) ?? "?").charAt(0).toUpperCase() : null}>
      <h1 className="d" style={{ fontSize: 40, margin: 0 }}>Bookings</h1>
      <div className="b" style={{ marginBottom: 18 }}>Every ask, and where it is on the way to the gig. A lit dot means it is your turn.</div>
      <BookingsList signedIn={!!member} />
      {!member && <p className="b" style={{ fontSize: 13, marginTop: 20 }}><Link href="/sign-in?next=/bookings">Sign in</Link> to see your asks on any device.</p>}
    </ArtistApp>
  );
}
