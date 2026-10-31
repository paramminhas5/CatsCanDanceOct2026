import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Front and center on the homepage: the next CCD night with tickets on sale.
export default function TicketsStrip() {
  const [ev, setEv] = useState<{ slug: string; title: string; event_date: string | null; venue: string | null } | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("events").select("slug,title,event_date,venue").eq("published", true).gte("event_date", new Date().toISOString().slice(0, 10)).order("event_date").limit(5);
      for (const e of data ?? []) {
        const t = await supabase.rpc("public_tiers", { p_slug: (e as any).slug });
        if ((t.data as any[])?.length) { setEv(e as any); return; }
      }
    })();
  }, []);
  if (!ev) return null;
  return (
    <section className="bg-acid-yellow border-y-4 border-ink">
      <div className="container py-6 flex flex-wrap items-center justify-between gap-4">
        <div><p className="font-display text-2xl text-ink">{ev.title}</p><p className="text-ink">{[ev.event_date, ev.venue].filter(Boolean).join(" · ")}</p></div>
        <Link href={`/tickets/${ev.slug}`} className="font-display uppercase px-6 py-3 border-4 border-ink bg-ink text-cream">Get tickets</Link>
      </div>
    </section>
  );
}
