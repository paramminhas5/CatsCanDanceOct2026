/**
 * /door: pick tonight's night. Hosts and the CCD team only.
 */
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import DoorGate from "@/components/door/DoorGate";
import { deviceName, fetchNights, setDeviceName, type NightRow } from "@/lib/door";

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function Nights() {
  const [rows, setRows] = useState<NightRow[] | null>(null);
  const [err, setErr] = useState("");
  const [device, setDevice] = useState("");
  useEffect(() => {
    setDevice(deviceName());
    fetchNights().then((r) => { if (r.ok) setRows(r.nights ?? []); else setErr(r.error ?? "Could not load nights."); });
  }, []);
  const today = todayIST();
  const upcoming = (rows ?? []).filter((n) => (n.event_date ?? "") >= today).sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const past = (rows ?? []).filter((n) => (n.event_date ?? "") < today);

  const card = (n: NightRow) => {
    const tonight = n.event_date === today;
    return (
      <li key={n.slug}>
        <Link href={`/door/${n.slug}`} className={`block border-4 p-4 ${tonight ? "border-acid-yellow bg-acid-yellow text-ink" : "border-cream"}`}>
          <p className="text-sm font-bold">{tonight ? "Tonight" : n.date ?? n.event_date}{n.start_time ? ` · ${n.start_time}` : ""}</p>
          <p className="font-display text-2xl leading-tight mt-1">{n.title}</p>
          <p className="text-sm mt-1 opacity-80">{[n.venue, n.city].filter(Boolean).join(", ")}</p>
          <p className="text-sm mt-2 font-bold tabular-nums">{n.inside} in · {n.expected} on the list{n.capacity ? ` · cap ${n.capacity}` : ""}</p>
        </Link>
      </li>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-ink text-cream px-4 py-6">
      <div className="max-w-lg mx-auto">
        <p className="font-display text-acid-yellow text-sm tracking-widest">CCD DOOR</p>
        <h1 className="font-display text-4xl leading-none mt-1">Pick the night.</h1>
        <label className="block mt-4 text-sm text-cream/70">
          This phone is called
          <input value={device} onChange={(e) => { setDevice(e.target.value); setDeviceName(e.target.value || "Door"); }}
            className="block mt-1 w-full bg-cream text-ink border-4 border-cream p-2" />
        </label>
        {err && <p className="mt-6">{err}</p>}
        {!rows && !err && <p className="mt-6 text-cream/70">Loading…</p>}
        {rows && (
          <>
            <h2 className="font-display text-xl mt-8">Coming up</h2>
            {upcoming.length ? <ul className="mt-3 space-y-3">{upcoming.map(card)}</ul> : <p className="mt-2 text-cream/70">{rows.length ? "No nights coming up." : "You're not on a door yet. Ask the door lead to add the email you signed in with."}</p>}
            {past.length > 0 && (
              <>
                <h2 className="font-display text-xl mt-8">Last 30 days</h2>
                <ul className="mt-3 space-y-3">{past.map(card)}</ul>
              </>
            )}
          </>
        )}
        <p className="mt-10 text-sm text-cream/60">Load the night before doors open. The list stays on this phone, so scanning keeps working if the signal drops.</p>
      </div>
    </div>
  );
}

export default function DoorIndex() {
  return (
    <>
      <Head>
        <title>Door | Cats Can Dance</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#0a0a0a" />
      </Head>
      <DoorGate next="/door"><Nights /></DoorGate>
    </>
  );
}
