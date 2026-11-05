/**
 * /bookings/[id]/confirmed: the booking receipt. Who, where, when, fee, set, tech, travel and
 * cancellation terms, as agreed when the artist confirmed. Prints on one page.
 */
import ShareButton from "@/components/ShareButton";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import DeskShell, { NeedsUpdate, SignInNudge, btn, btnAlt } from "@/components/booking/DeskShell";
import { keyFor, loadThread, type Thread } from "@/lib/booking-desk";
import { dayLong, inrFull, roomLabel } from "@/lib/desk";
import { BOOKINGS_BASE, threadPath } from "@/lib/routes";

export default function Receipt() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const [t, setT] = useState<Thread | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "denied">("loading");
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (!/^[0-9a-f-]{36}$/i.test(id)) { setState("denied"); return; }
    const k = typeof router.query.k === "string" ? router.query.k : keyFor(id);
    setKey(k);
    loadThread(id, k).then((r) => {
      if (r.ok) { setT(r.data); setState("ok"); } else setState(r.missing ? "missing" : "denied");
    });
  }, [router.isReady, router.query.k, id]);

  const r = t?.request;
  const terms = (r?.terms ?? {}) as Record<string, string | null>;
  const ref = id.slice(0, 8).toUpperCase();

  return (
    <DeskShell title="Booking receipt" eyebrow="Booking receipt" heading="CONFIRMED." path={`/bookings/${id}/confirmed`}>
      {state === "loading" && <div className="h-60 border-4 border-ink/20 bg-ink/5" aria-busy="true" />}
      {state === "missing" && <NeedsUpdate what="Receipts come with the booking threads, which need a database update that is on its way." />}
      {state === "denied" && (
        <div className="border-4 border-ink bg-cream p-6 max-w-2xl"><p className="font-display text-2xl mb-3">We can&apos;t open this receipt.</p><SignInNudge /></div>
      )}
      {state === "ok" && t && r && r.stage !== "confirmed" && (
        <div className="border-4 border-ink bg-cream p-6 max-w-2xl">
          <p className="font-display text-2xl mb-2">Not confirmed yet.</p>
          <p className="text-ink/80 mb-4">The receipt shows once the organiser accepts the terms and the artist confirms.</p>
          <Link href={threadPath(id, key)} className={btn}>Back to the thread</Link>
        </div>
      )}
      {state === "ok" && t && r && r.stage === "confirmed" && (
        <>
          <div className="flex flex-wrap gap-3 mb-6 print:hidden">
            <button type="button" onClick={() => window.print()} className={btn}>Print or save as PDF</button>
            <Link href={threadPath(id, key)} className={btnAlt}>Back to the thread</Link>
            <Link href={BOOKINGS_BASE} className={btnAlt}>All requests</Link>
            {t.artist && (
              <ShareButton kind="booked" target={t.artist.slug} path={`/artists/${t.artist.slug}`}
                extra={{ ...(r.event_date ? { date: r.event_date } : {}), ...(r.city ? { city: r.city } : {}) }}
                text={`Booked: ${t.artist.name}${r.city ? `, ${r.city}` : ""}.`} label="Share: Booked" />
            )}
          </div>

          <article className="border-4 border-ink bg-cream text-ink chunk-shadow max-w-3xl print:shadow-none print:max-w-none">
            <header className="bg-ink text-cream px-6 py-5 flex flex-wrap items-baseline justify-between gap-3 print:bg-white print:text-black print:border-b-4 print:border-black">
              <div>
                <p className="font-display text-3xl leading-none">Booking confirmed</p>
                <p className="text-sm mt-1 opacity-80">Cats Can Dance · catscandance.com</p>
              </div>
              <p className="font-display text-acid-yellow text-xl tabular print:text-black">Ref {ref}</p>
            </header>

            <div className="px-6 py-6 grid gap-6 md:grid-cols-2">
              <Block title="Artist">
                <p className="font-display text-2xl leading-tight">{t.artist?.name}</p>
                {t.artist?.based_city && <p className="text-sm">Based in {t.artist.based_city}</p>}
              </Block>
              <Block title="Organiser">
                <p className="font-display text-2xl leading-tight">{r.name}</p>
                {r.org && <p className="text-sm">{r.org}</p>}
                {r.email && <p className="text-sm">{r.email}</p>}
              </Block>
            </div>

            <div className="perf" aria-hidden />

            <dl className="px-6 py-6 grid grid-cols-[140px_1fr] gap-x-4 gap-y-3">
              <Row k="When" v={r.event_date ? dayLong(r.event_date) : "To be set"} strong />
              <Row k="Where" v={[r.venue, r.city].filter(Boolean).join(", ") || "To be set"} strong />
              {r.room_size && <Row k="Room" v={roomLabel(r.room_size)!} />}
              <Row k="Set" v={r.set_terms || r.set_length || "As agreed in the thread"} />
              <Row k="Fee" v={r.fee_inr ? inrFull(r.fee_inr) : "As agreed in the thread"} strong />
              <Row k="Tech" v={terms.tech || "Not set by the artist. Agree it in the thread."} />
              {terms.rider && <Row k="Rider" v={terms.rider} />}
              <Row k="Travel" v={terms.travel_terms || "Not set by the artist. Agree it in the thread."} />
              {terms.included && <Row k="Included" v={terms.included} />}
              <Row k="Cancellation" v={terms.cancellation_terms || "Not set by the artist. If either side cancels, tell the other in the thread as early as you can."} />
              <Row k="Confirmed" v={r.confirmed_at ? new Date(r.confirmed_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" }) : ""} />
            </dl>

            <footer className="border-t-4 border-ink px-6 py-4 text-xs text-ink/70">
              The fee is paid directly between organiser and artist. CCD does not take payment or a commission on this booking. Questions: reply in the thread.
            </footer>
          </article>
        </>
      )}
    </DeskShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="text-xs font-bold uppercase tracking-widest text-ink/60 mb-1">{title}</p>{children}</div>;
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (<><dt className="text-sm font-bold uppercase tracking-wide text-ink/60 pt-0.5">{k}</dt><dd className={strong ? "font-display text-xl leading-tight" : "whitespace-pre-line"}>{v}</dd></>);
}
