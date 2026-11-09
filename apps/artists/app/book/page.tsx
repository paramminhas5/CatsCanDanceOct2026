/**
 * Book for a night: the ask for one to three artists (boards F38-A-Book, F38-A-Offer, H39-BookArtists).
 * Reached from All artists in booking mode, or from an artist's page.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Readout, Knob, Icon } from "@ccd/ui";
import AskForm from "@/components/AskForm";
import { Empty } from "@/components/bits";
import { getDeskArtists } from "@/lib/booking-desk-server";
import { BUDGETS, rateFrom, inrShort, isIsoDay, dayShort } from "@/lib/desk";
import { displayName } from "@/lib/artist-v2";
import { todayIST } from "@/lib/db";

export const metadata: Metadata = { title: "Book for a night", robots: { index: false } };

type SP = { a?: string | string[]; date?: string; city?: string; budget?: string };

export default async function Book({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const today = todayIST();
  const wanted = [...new Set((Array.isArray(sp.a) ? sp.a : sp.a ? [sp.a] : []).filter((x) => /^[a-z0-9-]{1,80}$/.test(x)))];
  const date = isIsoDay(sp.date) && sp.date >= today ? sp.date : "";
  const city = (sp.city ?? "").slice(0, 60);
  const budget = BUDGETS.some((b) => b.key === sp.budget) ? (sp.budget as string) : "";
  const { artists } = wanted.length ? await getDeskArtists() : { artists: [] };
  const picks = wanted.map((s) => artists.find((a) => a.slug === s)).filter((a): a is NonNullable<typeof a> => !!a).slice(0, 3);
  const dropped = wanted.length - picks.length;

  if (!picks.length) {
    return (
      <main className="k-root"><section className="k-wrap py-16">
        <Empty title="Pick who to ask first" line="Choose a date and up to three artists. One ask goes to all of them." action={<ButtonLink variant="key" href="/artists?mode=book">See who is free</ButtonLink>} />
      </section></main>
    );
  }
  const names = Object.fromEntries(picks.map((a) => [a.slug, displayName(a.name)]));
  const rates = picks.map((a) => rateFrom(a)).filter((n): n is number => n != null);

  return (
    <main className="k-root">
      <section className="k-wrap grid gap-12 pt-10 md:grid-cols-[1fr_420px] md:pt-14">
        <div>
          <Link href={`/artists?mode=book${date ? `&date=${date}` : ""}`} className="k-b inline-flex items-center gap-1 text-sm"><Icon name="back" size={14} />Back to who is free</Link>
          <h1 className="k-d mt-4 text-[48px] md:text-[64px]">{picks.length === 1 ? `Ask ${names[picks[0].slug]}` : "One ask, sent to each"}</h1>
          <p className="k-b mt-3 text-[17px]">Tell them about the night. They reply in the app or on WhatsApp, with a yes, a counter or a no.</p>
          {dropped > 0 && <p className="k-note k-note--warn mt-5">One ask goes to three people at most, so we kept the first three.</p>}
          <div className="mt-8"><AskForm picks={picks.map((a) => ({ slug: a.slug, name: names[a.slug], rate: rateFrom(a) ? inrShort(rateFrom(a) as number) : null }))} date={date} city={city} budget={budget} today={today} names={names} /></div>
        </div>
        <aside className="grid content-start gap-5">
          <div className="k-plinth p-6">
            <span className="k-m">In this ask</span>
            <ul className="mt-4 grid list-none gap-3 p-0">
              {picks.map((a) => (
                <li key={a.slug} className="flex items-center gap-3">
                  <span className="h-12 w-12 flex-none overflow-hidden rounded-full bg-[#222]">
                    {a.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.photo_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1"><b className="block truncate">{names[a.slug]}</b><span className="k-b text-[13px]">{rateFrom(a) ? `From ${inrShort(rateFrom(a) as number)}` : "Rate on request"}</span></span>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid place-items-center"><Knob size={150} label="Offer" /></div>
            <div className="mt-6"><Readout cells={[{ value: date ? dayShort(date) : null, label: "Date" }, { value: rates.length ? inrShort(Math.min(...rates)) : null, label: "Rates from" }, { value: picks.length, label: "Artists" }]} /></div>
          </div>
          <p className="k-b text-sm">Asking is free. Deposits and contracts switch on later; until then you agree the details in the thread.</p>
        </aside>
      </section>
    </main>
  );
}
