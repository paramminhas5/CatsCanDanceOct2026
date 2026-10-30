import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import QRCode from "qrcode";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";

type T = { code: string; tier: string | null; holder_name: string; event_slug: string; event_title: string | null; event_date: string | null; venue: string | null; checked_in: boolean };

export default function Order() {
  const { query } = useRouter();
  const [tickets, setTickets] = useState<T[] | null>(null);
  const [qr, setQr] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!query.o || !query.e) return;
    supabase.rpc("my_tickets", { p_order: query.o, p_email: query.e }).then(async ({ data }) => {
      const list = (data as T[]) ?? [];
      setTickets(list);
      const m: Record<string, string> = {};
      for (const t of list) m[t.code] = await QRCode.toDataURL(t.code, { margin: 1, width: 220 });
      setQr(m);
    });
  }, [query.o, query.e]);

  return (
    <>
      <SEO title="Your tickets" description="Your Cats Can Dance tickets." path="/tickets/order" noindex />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <PageHero eyebrow="TICKETS" title="YOU'RE IN." bg="bg-electric-blue" textColor="text-cream" eyebrowColor="text-acid-yellow"><p>Show the QR code at the door.</p></PageHero>
        <section className="container py-12 grid gap-6 md:grid-cols-2 max-w-3xl">
          {tickets === null ? <p>Loading...</p> : tickets.length === 0 ? <p className="border-4 border-ink p-6">No tickets found for this link. If you just paid, wait a minute and refresh.</p> :
            tickets.map((t) => (
              <div key={t.code} className="border-4 border-ink bg-cream p-5 chunk-shadow text-center">
                <p className="font-display text-xl">{t.event_title ?? t.event_slug}</p>
                <p className="text-sm">{[t.event_date, t.venue, t.tier].filter(Boolean).join(" · ")}</p>
                {qr[t.code] && <img src={qr[t.code]} alt={`QR code for ticket ${t.code}`} className="mx-auto my-3" width={220} height={220} />}
                <p className="font-mono tracking-widest">{t.code}</p>
                <p className="text-sm mt-1">{t.holder_name}{t.checked_in ? " · checked in" : ""}</p>
              </div>
            ))}
        </section>
        <Footer />
      </main>
    </>
  );
}
