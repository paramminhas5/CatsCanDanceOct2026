"use client";
/**
 * Bookings (board F38-A-Bookings): asks you sent and, for artists, asks sent to you. Signed-in members
 * load through my_booking_threads; visitors see the asks whose keys this device saved.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadMyThreads, savedKeys, type ThreadRow } from "@/lib/booking-desk";
import { STAGE_LABEL, dayShort, inrShort } from "@/lib/desk";

export default function BookingsList({ signedIn }: { signedIn: boolean }) {
  const [rows, setRows] = useState<ThreadRow[] | null>(null);
  const [tab, setTab] = useState<"artist" | "requester">("requester");
  useEffect(() => {
    loadMyThreads(signedIn).then((r) => {
      setRows(r.rows);
      if (r.rows.some((x) => x.role === "artist")) setTab("artist");
    }).catch(() => setRows([]));
  }, [signedIn]);
  if (!rows) return <p className="k-b" aria-busy="true">Loading your bookings</p>;
  const forMe = rows.filter((r) => r.role === "artist");
  const mine = rows.filter((r) => r.role === "requester");
  const list = tab === "artist" ? forMe : mine;
  const keys = new Map(savedKeys().map((k) => [k.id, k.key]));
  return (
    <div>
      {forMe.length > 0 && (
        <div role="tablist" aria-label="Bookings" className="k-tabs mb-2">
          <button role="tab" aria-selected={tab === "artist"} onClick={() => setTab("artist")} className={tabCls(tab === "artist")}>Asks for you <span>{forMe.length}</span></button>
          <button role="tab" aria-selected={tab === "requester"} onClick={() => setTab("requester")} className={tabCls(tab === "requester")}>Asks you sent <span>{mine.length}</span></button>
        </div>
      )}
      {list.length === 0 ? (
        <div className="k-surface grid justify-items-start gap-3 rounded-[22px] p-6">
          <b className="text-[18px]">{tab === "artist" ? "No asks yet" : "Nothing sent yet"}</b>
          <p className="k-b m-0">{signedIn ? "When you ask an artist, the thread lands here." : "Sign in to see every ask on any device. Asks sent from this device show here already."}</p>
          <a href={tab === "artist" ? "/me" : "/artists?mode=book"} className="k-btn k-btn--key">{tab === "artist" ? "Open your page" : "Book for a date"}</a>
        </div>
      ) : (
        <ul className="m-0 list-none p-0">
          {list.map((r) => {
            const k = r.key ?? keys.get(r.id) ?? null;
            const who = r.role === "artist" ? [r.name, r.org].filter(Boolean).join(", ") : r.artist ?? r.artist_slug;
            const waiting = r.role === "artist" ? r.last_actor !== "artist" && ["sent", "seen", "countered"].includes(r.stage) : r.last_actor === "artist" && ["interested", "countered", "accepted"].includes(r.stage);
            return (
              <li key={r.id}>
                <Link href={`/bookings/${r.id}${k ? `?k=${encodeURIComponent(k)}` : ""}`} className="k-li">
                  <span className={`k-led ${waiting ? "" : "k-led--off"}`}><span className="sr-only">{waiting ? "Your turn" : "Waiting"}</span></span>
                  <span className="min-w-0 flex-1">
                    <b>{who}</b>
                    <small>{[r.event_date ? dayShort(r.event_date) : null, r.city, r.fee_inr ? inrShort(r.fee_inr) : r.budget_band].filter(Boolean).join(" · ")}</small>
                  </span>
                  <span className="k-tag">{STAGE_LABEL[r.stage]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
const tabCls = (on: boolean) => `bg-transparent border-0 cursor-pointer px-0 py-3 text-[15px] font-semibold ${on ? "text-[var(--k-tx)] shadow-[inset_0_-2px_0_var(--k-pc)]" : "text-[var(--k-t3)]"}`;
