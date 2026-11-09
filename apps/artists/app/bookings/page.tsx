import Link from "next/link";
import type { Metadata } from "next";
import BookingsList from "@/components/BookingsList";
import { getMember } from "@/lib/auth";

export const metadata: Metadata = { title: "Bookings", robots: { index: false } };

export default async function Bookings() {
  const member = await getMember();
  return (
    <main className="k-root">
      <section className="k-wrap max-w-[900px] py-12">
        <h1 className="k-d text-[48px] md:text-[64px]">Bookings</h1>
        <p className="k-b mt-3 mb-8 text-[17px]">Every ask, and where it is on the way to the gig. A lit dot means it is your turn.</p>
        <BookingsList signedIn={!!member} />
        {!member && <p className="k-b mt-8 text-sm"><Link href="/sign-in?next=/bookings">Sign in</Link> to see your asks on any device.</p>}
      </section>
    </main>
  );
}
