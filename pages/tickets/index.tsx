/**
 * /tickets: find your tickets.
 * Signed-in members see every ticket bought with their login email. Anyone can have them emailed again.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import FindTickets from "@/components/tickets/FindTickets";
import { memberTickets, type PassTicket } from "@/lib/booking";
import { supabase } from "@/lib/supabase";
import { displayDate, todayIST } from "@/lib/nights";

type Group = { slug: string; title: string; date: string | null; venue: string | null; order: string; tickets: PassTicket[] };

export default function TicketsHome() {
  const [mine, setMine] = useState<PassTicket[] | null | undefined>(undefined);
  const [email, setEmail] = useState("");

  useEffect(() => {
    memberTickets().then(setMine).catch(() => setMine(null));
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? ""));
  }, []);

  const groups: Group[] = [];
  for (const t of mine ?? []) {
    const key = `${t.event_slug}:${t.order_id}`;
    let g = groups.find((x) => `${x.slug}:${x.order}` === key);
    if (!g) { g = { slug: t.event_slug, title: t.event_title ?? t.event_slug, date: t.event_date, venue: t.venue, order: t.order_id ?? "", tickets: [] }; groups.push(g); }
    g.tickets.push(t);
  }
  const today = todayIST();
  const upcoming = groups.filter((g) => !g.date || g.date >= today);
  const past = groups.filter((g) => g.date && g.date < today);

  return (
    <>
      <SEO title="Your tickets · Cats Can Dance" description="Find your Cats Can Dance tickets, or have them emailed to you again." path="/tickets" />
      <main className="bg-electric-blue min-h-screen">
        <Nav />
        <section className="container pt-28 md:pt-36 pb-16 md:pb-24 text-cream">
          <h1 className="font-display text-6xl md:text-8xl leading-[0.85] mb-6" style={{ filter: "drop-shadow(5px 5px 0 hsl(var(--ink)))" }}>
            YOUR TICKETS
          </h1>

          {mine && mine.length > 0 && (
            <div className="mb-14 grid gap-8">
              {upcoming.length > 0 && <TicketList title="Coming up" groups={upcoming} email={email} />}
              {past.length > 0 && <TicketList title="Been there" groups={past} email={email} muted />}
            </div>
          )}

          <div className="grid gap-10 lg:grid-cols-2 items-start">
            <div>
              <h2 className="font-display text-3xl md:text-4xl leading-none mb-3">{mine && mine.length > 0 ? "Booked with another email?" : "Lost your tickets?"}</h2>
              <p className="text-lg font-medium mb-5 max-w-[50ch]">Enter the email you booked with and we&apos;ll send them again, QR codes included.</p>
              <FindTickets />
            </div>
            {mine === null && (
              <div className="bg-ink border-4 border-ink p-6 chunk-shadow">
                <p className="font-display text-2xl leading-none mb-2">Members see every ticket here.</p>
                <p className="text-cream/85 mb-4">Join the club with the email you book with, and your tickets show up on this page.</p>
                <Link href="/join" className="inline-block font-display text-lg px-5 py-3 border-4 border-cream bg-acid-yellow text-ink">Join the club</Link>
              </div>
            )}
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}

function TicketList({ title, groups, email, muted }: { title: string; groups: Group[]; email: string; muted?: boolean }) {
  return (
    <div>
      <h2 className="font-display text-3xl leading-none mb-4">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <li key={`${g.slug}:${g.order}`}>
            <Link href={`/tickets/order?o=${g.order}&e=${encodeURIComponent(email)}`}
              className={`block border-4 border-ink chunk-shadow p-5 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform ${muted ? "bg-cream/80 text-ink" : "bg-cream text-ink"}`}>
              <p className="font-display text-2xl leading-none">{g.title.toUpperCase()}</p>
              <p className="font-bold mt-2">{g.date ? displayDate({ slug: g.slug, title: g.title, event_date: g.date }) : ""}</p>
              {g.venue && <p className="text-ink/75">{g.venue}</p>}
              <p className="mt-3 text-sm font-bold">{g.tickets.length} ticket{g.tickets.length > 1 ? "s" : ""}{g.tickets.some((t) => t.checked_in) ? " · checked in" : ""}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
