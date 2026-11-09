"use client";
/** Pick the night (the door home). Lists every night you can run the door for, soonest first. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Led } from "@ccd/ui";
import { fetchNights, todayIST, type NightRow } from "@/lib/door";

export default function DoorNights() {
  const [rows, setRows] = useState<NightRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fetchNights().then((r) => (r.ok ? setRows(r.nights ?? []) : (setErr(r.error ?? "Could not load"), setRows([])))); }, []);
  if (!rows) return <p className="k-b" aria-busy="true">Loading your nights</p>;
  const today = todayIST();
  const sorted = [...rows].sort((a, b) => Math.abs(Date.parse(a.event_date ?? a.date ?? today) - Date.parse(today)) - Math.abs(Date.parse(b.event_date ?? b.date ?? today) - Date.parse(today)));
  if (err) return <p className="k-note k-note--warn">{err}</p>;
  if (!sorted.length) return <p className="k-b">You are not on the door for any night. The host adds you by email.</p>;
  return (
    <ul className="m-0 list-none p-0">
      {sorted.map((n) => {
        const d = n.event_date ?? n.date;
        const tonight = d === today;
        return (
          <li key={n.slug}>
            <Link className="k-li" href={`/door/${n.slug}`}>
              <Led state={tonight ? "on" : "off"}>{tonight ? "Tonight" : d ?? "No date"}</Led>
              <span className="min-w-0 flex-1"><b>{n.title}</b><small>{[n.venue, n.city, `${n.inside}/${n.expected} in`].filter(Boolean).join(" · ")}</small></span>
              <span className="text-sm font-semibold">Open</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
