"use client";
/** Pick the night (the door home). Every night you can run the door for, tonight first. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchNights, todayIST, type NightRow } from "@/lib/door";
import { Icon, dayShort } from "@/components/app/ui";

export default function DoorNights() {
  const [rows, setRows] = useState<NightRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fetchNights().then((r) => (r.ok ? setRows(r.nights ?? []) : (setErr(r.error ?? "Could not load"), setRows([])))); }, []);
  if (!rows) return <p className="b" style={{ padding: "14px 20px" }} aria-busy="true">Loading your nights</p>;
  const today = todayIST();
  const sorted = [...rows].sort((a, b) => Math.abs(Date.parse(a.event_date ?? a.date ?? today) - Date.parse(today)) - Math.abs(Date.parse(b.event_date ?? b.date ?? today) - Date.parse(today)));
  const tonight = sorted.find((n) => (n.event_date ?? n.date) === today);
  return (
    <div style={{ padding: "8px 20px 0" }}>
      {err && <p className="err" role="alert">{err}</p>}
      {tonight && (
        <Link href={`/door/${tonight.slug}`} className="rise" style={{ display: "block", marginTop: 8, borderRadius: 22, background: "var(--pc)", color: "var(--pi)", padding: "20px 18px", textDecoration: "none" }}>
          <div className="row"><span style={{ flex: 1, fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Tonight</span><span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>{tonight.inside} in of {tonight.expected}</span></div>
          <div className="d" style={{ fontSize: 40, marginTop: 8, color: "var(--pi)" }}>{tonight.title}</div>
          <div className="row" style={{ marginTop: 14, gap: 8, fontWeight: 600 }}><Icon i="door" />Open the door</div>
        </Link>
      )}
      {!sorted.length && !err && <p className="b" style={{ padding: "14px 0" }}>You are not on the door for any night. The host adds you by email.</p>}
      <div style={{ marginTop: 14 }}>
        {sorted.filter((n) => n !== tonight).map((n) => (
          <Link key={n.slug} href={`/door/${n.slug}`} className="rw rise" style={{ padding: "12px 0" }}>
            <span className="m" style={{ width: 92, flex: "none", color: "var(--tx)" }}>{dayShort(n.event_date ?? n.date)}</span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{n.title}</span><span className="b" style={{ display: "block", fontSize: 13 }}>{[n.venue, n.city].filter(Boolean).join(", ")}{n.expected ? ` · ${n.expected} expected` : ""}</span></span>
            <Icon i="next" size={14} color="rgba(242,240,235,.5)" />
          </Link>
        ))}
        {sorted.length > 0 && <div className="hl" />}
      </div>
    </div>
  );
}
