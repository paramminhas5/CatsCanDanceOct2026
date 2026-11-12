/**
 * /tickets/order?o=<order>&e=<email>[&new=1]: your tickets for one order.
 * Tickets as stubs with QR codes, then what to do next: calendar, directions, share, crew.
 * Without a valid link it falls back to the "email me my tickets" form instead of loading forever.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import TicketPass from "@/components/tickets/TicketPass";
import FindTickets from "@/components/tickets/FindTickets";
import { AddToCalendar, DirectionsLink, ShareButton } from "@/components/tickets/NightTools";
import { orderTickets, type PassTicket } from "@/lib/booking";
import { supabase } from "@/lib/supabase";
import { sendSignInLink, useMe } from "@/lib/plans";
import SignInCode from "@/components/SignInCode";
import { getEventContent, getStaticEventRow } from "@/content/events";
import { directionsUrl, displayDate, displayTime } from "@/lib/nights";
import type { EventRow } from "@/types/events";

const SITE = "https://catscandance.com";

export default function Order() {
  const router = useRouter();
  const o = typeof router.query.o === "string" ? router.query.o : "";
  const e = typeof router.query.e === "string" ? router.query.e : "";
  const fresh = router.query.new === "1";
  const [tickets, setTickets] = useState<PassTicket[] | null>(null);
  const [ev, setEv] = useState<EventRow | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (!o || !e) { setTickets([]); return; }
    let live = true;
    let attempt = 0;
    const load = async () => {
      const list = await orderTickets(o, e);
      if (!live) return;
      // A paid order can take a few seconds to confirm: retry quietly for about 20 seconds.
      if (list.length === 0 && attempt < 6) { attempt++; setTimeout(load, 3500); return; }
      setTickets(list);
      const slug = list[0]?.event_slug;
      if (slug) {
        const { data } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
        if (live) setEv((data as EventRow | null) ?? getStaticEventRow(slug));
      }
    };
    load();
    return () => { live = false; };
  }, [router.isReady, o, e]);

  const content = ev ? getEventContent(ev) : null;
  const time = ev ? displayTime(content?.doors_time ?? ev.start_time) : null;
  const first = tickets?.[0];
  const when = ev ? [displayDate(ev), time].filter(Boolean).join(" · ") : first?.event_date ? displayDate({ slug: first.event_slug, title: "", event_date: first.event_date }) : "";
  const venue = ev ? [ev.venue, ev.city].filter(Boolean).join(", ") : first?.venue ?? null;
  const pageUrl = typeof window !== "undefined" ? window.location.href : `${SITE}/tickets/order`;
  const waiting = tickets === null;
  const none = tickets !== null && tickets.length === 0;

  return (
    <>
      <SEO title="Your tickets · Cats Can Dance" description="Your Cats Can Dance tickets." path="/tickets/order" noindex />
      <main className="bg-electric-blue min-h-screen">
        <Nav />
        <section className="container pt-28 md:pt-36 pb-16 md:pb-24">
          {waiting ? (
            <div className="max-w-md" aria-busy="true">
              <h1 className="font-display text-cream text-5xl md:text-7xl leading-[0.85] mb-6" style={{ filter: "drop-shadow(5px 5px 0 hsl(var(--ink)))" }}>
                {o ? "PRINTING YOUR TICKETS" : "YOUR TICKETS"}
              </h1>
              <div className="h-[520px] border-4 border-ink bg-cream/70 chunk-shadow" />
            </div>
          ) : none ? (
            <div className="max-w-xl">
              <h1 className="font-display text-cream text-5xl md:text-7xl leading-[0.85] mb-6" style={{ filter: "drop-shadow(5px 5px 0 hsl(var(--ink)))" }}>
                {o ? "WE CAN'T FIND THESE TICKETS" : "FIND YOUR TICKETS"}
              </h1>
              <p className="text-cream text-lg font-medium mb-6 max-w-[55ch]">
                {o ? "The link may be incomplete, or a payment is still being confirmed. Enter the email you booked with and we'll send your tickets again."
                  : "Enter the email you booked with and we'll send your tickets again."}
              </p>
              <FindTickets />
            </div>
          ) : (
            <div className="grid gap-10 lg:grid-cols-[400px_1fr] lg:gap-14 items-start">
              <div className="grid gap-8">
                {tickets!.map((t, i) => (
                  <TicketPass key={t.code} t={t} when={when} venue={venue} index={i} total={tickets!.length} fresh={fresh} />
                ))}
              </div>

              <div className="text-cream lg:sticky lg:top-28">
                <h1 className="font-display text-5xl md:text-7xl leading-[0.85] mb-5" style={{ filter: "drop-shadow(5px 5px 0 hsl(var(--ink)))" }}>
                  {fresh ? "YOU'RE IN." : "YOUR TICKETS"}
                </h1>
                <p className="text-lg md:text-xl font-medium max-w-[50ch] mb-8">
                  {tickets!.length > 1 ? `${tickets!.length} tickets` : "Your ticket"} for {first?.event_title ?? "the night"}, {when}.
                  {" "}Booked with {e}. Show the QR code at the door, one per person.
                </p>

                <ol className="grid gap-4 mb-8 max-w-lg">
                  <Step n={1} title="Put it in your calendar">
                    {ev && <AddToCalendar night={ev} time={content?.doors_time ?? ev.start_time} url={pageUrl} tone="dark" />}
                  </Step>
                  <Step n={2} title="Bring your friends">
                    {first && <ShareButton tone="dark" label="Share the night" title={`Cats Can Dance: ${first.event_title ?? ""}`}
                      text={`I'm going to Cats Can Dance ${first.event_title ?? ""}, ${when}. Get a ticket:`} url={`${SITE}/nights/${first.event_slug}`} />}
                  </Step>
                  <Step n={3} title="Find the venue">
                    <DirectionsLink tone="dark" href={directionsUrl(ev?.venue ?? first?.venue, ev?.city, content?.venue_map_url)} />
                  </Step>
                  <Step n={4} title="See who's going, find a crew">
                    {first && <CrewStep slug={first.event_slug} email={e} fresh={fresh} />}
                  </Step>
                </ol>

                <p className="text-sm text-cream/85 max-w-[55ch]">
                  Can&apos;t make it? Pass your ticket on at face value through <Link href="/whats-on#pass-it-on" className="underline font-bold">Pass it on</Link>.
                  Keep this page&apos;s link, or find your tickets any time at <Link href="/tickets" className="underline font-bold">catscandance.com/tickets</Link>.
                </p>
              </div>
            </div>
          )}
        </section>
        <Footer />
      </main>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-3 items-start">
      <span className="font-display text-2xl text-acid-yellow tabular leading-none pt-1">{n}</span>
      <div><p className="font-bold text-lg mb-2">{title}</p>{children}</div>
    </li>
  );
}

/** Ticket buyers get an account automatically: a sign-in code goes to the booking email once, after checkout. */
function CrewStep({ slug, email, fresh }: { slug: string; email: string; fresh: boolean }) {
  const me = useMe();
  const [sent, setSent] = useState<"no" | "sent" | "failed">("no");
  useEffect(() => {
    if (!me.ready || me.signedIn || !fresh || !email) return;
    const flag = `ccd:link-sent:${slug}:${email.toLowerCase()}`;
    try { if (localStorage.getItem(flag)) { setSent("sent"); return; } } catch {}
    sendSignInLink(email, `/me?n=${encodeURIComponent(slug)}`).then((r) => {
      setSent(r.ok ? "sent" : "failed");
      if (r.ok) { try { localStorage.setItem(flag, "1"); } catch {} }
    });
  }, [me.ready, me.signedIn, fresh, email, slug]);
  const cta = "inline-flex font-display text-sm md:text-base px-4 py-2.5 border-4 border-ink bg-acid-yellow text-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform";
  if (me.signedIn) return <Link href={`/me?n=${encodeURIComponent(slug)}`} className={cta}>Open Your nights</Link>;
  if (sent === "sent") return <div className="max-w-md border-4 border-ink bg-cream text-ink p-5"><SignInCode email={email} next={`/me?n=${encodeURIComponent(slug)}`} /></div>;
  return (
    <div className="grid gap-2">
      <p className="text-cream/90">Sign in with {email || "your booking email"} to see who else is going and join a crew.</p>
      <button type="button" className={cta + " justify-self-start"} onClick={async () => { const r = await sendSignInLink(email, `/me?n=${encodeURIComponent(slug)}`); setSent(r.ok ? "sent" : "failed"); }}>
        Email me a code
      </button>
      {sent === "failed" && <p className="text-sm text-acid-yellow font-bold">Could not send the code. Try again in a minute.</p>}
    </div>
  );
}
