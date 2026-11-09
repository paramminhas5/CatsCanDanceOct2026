"use client";
/**
 * Your parties (board H39-Home): each party as one list, from the page to the money. Nights come from
 * door_nights (every night you can run the door for); promoter pages from myPromoters.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Readout, Led, Cat } from "@ccd/ui";
import { productLink } from "@ccd/brand";
import { fetchNights, todayIST, type NightRow } from "@/lib/door";
import { myPromoters, type MyPromoter } from "@/lib/promoters";

const day = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "Date to set");

export default function Parties() {
  const [nights, setNights] = useState<NightRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [promoters, setPromoters] = useState<MyPromoter[]>([]);
  useEffect(() => {
    fetchNights().then((r) => (r.ok ? setNights(r.nights ?? []) : (setErr(r.error ?? "Could not load"), setNights([]))));
    myPromoters().then(setPromoters).catch(() => {});
  }, []);
  if (!nights) return <p className="k-b" aria-busy="true">Loading your parties</p>;
  const today = todayIST();
  const up = nights.filter((n) => (n.event_date ?? n.date ?? "9999") >= today).reverse();
  const past = nights.filter((n) => (n.event_date ?? n.date ?? "9999") < today);
  return (
    <div className="grid gap-12">
      {err && <p className="k-note k-note--warn">{err}</p>}
      {up.length === 0 ? (
        <div className="k-surface grid justify-items-start gap-3 rounded-[22px] p-6">
          <Cat name="yellow" height={80} />
          <b className="text-[19px]">No parties coming up</b>
          <p className="k-b m-0">Make one and it lands here, with the invite, who is coming, artists, gear and the door in one list.</p>
          <Link href="/make" className="k-btn k-btn--key">Make a party</Link>
        </div>
      ) : (
        up.map((n) => <PartyCard key={n.slug} n={n} />)
      )}
      {promoters.length > 0 && (
        <section>
          <h2 className="k-d text-[28px]">Your promoter pages</h2>
          <ul className="mt-3 list-none p-0">
            {promoters.map((p) => (
              <li key={p.slug}><Link className="k-li" href={`/promote/${p.slug}`}><Led state={p.status === "approved" ? "on" : "warn"}>{p.status === "approved" ? "Live" : "In review"}</Led><span className="flex-1"><b>{p.name}</b><small>{[p.city, `${p.nights} nights`].filter(Boolean).join(" · ")}</small></span></Link></li>
            ))}
          </ul>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="k-d text-[28px]">Past parties</h2>
          <ul className="mt-3 list-none p-0">
            {past.slice(0, 12).map((n) => (
              <li key={n.slug}><Link className="k-li" href={`/door/${n.slug}/report`}><span className="k-m w-[110px] flex-none !text-[var(--k-tx)]">{day(n.event_date ?? n.date)}</span><span className="flex-1"><b>{n.title}</b><small>{[n.venue, n.city].filter(Boolean).join(", ")}</small></span><span className="text-sm font-semibold">Report</span></Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PartyCard({ n }: { n: NightRow }) {
  const date = n.event_date ?? n.date;
  const rows = [
    { t: "Party page", s: "On Nights", href: productLink("ccd", `/nights/${n.slug}`), ext: true },
    { t: "The invite", s: "Share this link", href: `/i/${n.slug}` },
    { t: "Who is coming", s: `${n.expected} expected`, href: `/door/${n.slug}?tab=guests` },
    { t: "Artists", s: "Book for this date", href: productLink("artists", `/artists?mode=book${date ? `&date=${date}` : ""}${n.city ? `&city=${encodeURIComponent(n.city)}` : ""}`), ext: true },
    { t: "Gear", s: "Decks, sound, lights", href: `/gear?night=${n.slug}` },
    { t: "The door", s: n.lead ? "You lead the door" : "You are on the door", href: `/door/${n.slug}` },
    { t: "Report", s: "Who came, and the takings", href: `/door/${n.slug}/report` },
  ];
  return (
    <article className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div>
        <span className="k-m" style={{ color: "var(--k-pc)" }}>{day(date)}</span>
        <h2 className="k-d mt-2 text-[40px] md:text-[56px]">{n.title}</h2>
        <p className="k-b mt-1">{[n.start_time?.slice(0, 5), n.venue, n.city].filter(Boolean).join(" · ")}</p>
        <ul className="mt-5 list-none p-0">
          {rows.map((r) => (
            <li key={r.t}>{r.ext ? <a className="k-li" href={r.href}><span className="k-chk" aria-hidden="true" /><span className="flex-1"><b>{r.t}</b><small>{r.s}</small></span></a> : <Link className="k-li" href={r.href}><span className="k-chk" aria-hidden="true" /><span className="flex-1"><b>{r.t}</b><small>{r.s}</small></span></Link>}</li>
          ))}
        </ul>
      </div>
      <aside className="grid content-start gap-4">
        <Readout cells={[{ value: n.expected || "0", label: "Expected" }, { value: n.inside || "0", label: "Inside" }, { value: n.capacity ?? null, label: "Capacity" }]} />
        <Link className="k-btn k-btn--key k-btn--l" href={`/door/${n.slug}`}>Open the door</Link>
      </aside>
    </article>
  );
}
