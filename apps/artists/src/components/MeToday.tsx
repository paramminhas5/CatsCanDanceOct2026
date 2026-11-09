"use client";
/**
 * Today (board F38-A-Today): what needs you now. Fans, asks waiting on you and open days in the readout,
 * your next booked or playing day as the ticket, and a to-do list built from what is missing.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";
import { myArtist, loadMyThreads, loadCalendar, loadMySettings, type ThreadRow, type DayRow, type MySettings } from "@/lib/booking-desk";
import { dayLong, dayShort, STAGE_LABEL } from "@/lib/desk";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const I = (d: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export default function MeToday() {
  const [me, setMe] = useState<{ slug: string; name: string } | null | undefined>(undefined);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [settings, setSettings] = useState<MySettings | null>(null);
  const [fans, setFans] = useState<number | null>(null);
  useEffect(() => {
    const today = new Date();
    const until = new Date(Date.now() + 90 * 86400000);
    myArtist().then((r) => setMe(r.ok ? r.data : null));
    loadMyThreads(true).then((r) => setThreads(r.rows.filter((x) => x.role === "artist"))).catch(() => {});
    loadCalendar(iso(today), iso(until)).then((r) => r.ok && setDays(r.data ?? []));
    loadMySettings().then((r) => r.ok && setSettings(r.data));
    supabaseBrowser().rpc("my_fans").then(({ data }: { data: unknown }) => { const d = data as { ok?: boolean; total?: number } | null; if (d?.ok) setFans(d.total ?? 0); });
  }, []);
  if (me === undefined) return <p className="b" aria-busy="true">Loading your day</p>;
  if (me === null) {
    return (
      <div className="rise" style={{ marginTop: 6, borderRadius: 22, background: "var(--pc)", color: "var(--pi)", padding: "22px 18px", position: "relative", overflow: "hidden" }}>
        <img src="/cats/lime.webp" alt="" style={{ position: "absolute", right: -6, bottom: -10, height: 120, animation: "bob 3.2s ease-in-out infinite" }} />
        <div className="d" style={{ fontSize: 32, color: "var(--pi)", maxWidth: 230 }}>No page linked yet</div>
        <div style={{ fontSize: 14, opacity: 0.75, marginTop: 6, maxWidth: 220 }}>Claim your page and we link it to this account once we have checked it is you.</div>
        <Link href="/claim" className="pill lg" style={{ marginTop: 16, background: "#0A0A0A", color: "var(--pc)", boxShadow: "none", display: "inline-flex" }}>Claim your page</Link>
      </div>
    );
  }
  const waiting = threads.filter((t) => t.last_actor !== "artist" && ["sent", "seen", "countered"].includes(t.stage));
  const next = days.filter((d) => d.state !== "open").sort((a, b) => a.day.localeCompare(b.day))[0];
  const open = days.filter((d) => d.state === "open").length;
  const nextThread = next ? threads.find((t) => t.event_date === next.day) : undefined;
  const todo = [
    waiting.length ? { t: `${waiting.length} booking ${waiting.length === 1 ? "ask" : "asks"}`, s: waiting.slice(0, 2).map((w) => [w.org ?? w.name, w.event_date ? dayShort(w.event_date) : null].filter(Boolean).join(", ")).join("; "), href: "/bookings", d: "M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 13h5l1 2h4l1-2h5" } : null,
    !settings?.formats?.length ? { t: "Set your rates", s: "Promoters see them before they ask", href: "/me/page", d: "M12 3v18M17 7.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5 2.2 3 5 3.5 5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" } : null,
    !open ? { t: "Mark the days you are free", s: "So you show up on a promoter's date", href: "/me/page#days", d: "M3.5 6.5h17v13h-17zM3.5 10.5h17M8 3v4M16 3v4" } : null,
    { t: "Put your next tour up", s: "Fans in each city hear when a date is set", href: "/me/tour", d: "M12 20.6s-6.4-5.5-6.4-10.6a6.4 6.4 0 0 1 12.8 0c0 5.1-6.4 10.6-6.4 10.6zM12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" },
  ].filter(Boolean) as { t: string; s: string; href: string; d: string }[];
  return (
    <>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="d" style={{ fontSize: 40, margin: 0 }}>Today</h1>
          <Link href={`/${me.slug}`} className="b" style={{ textDecoration: "none" }}>{me.name}</Link>
        </div>
        <img src="/cats/dance.webp" alt="" style={{ height: 76, animation: "hop 1.6s ease-in-out infinite" }} />
      </div>
      <div className="sf rise" style={{ marginTop: 16, borderRadius: 18, padding: "4px 0" }}>
        <div className="gls" style={{ borderTop: 0, borderBottom: 0 }}>
          <div><div className="v">{fans != null ? fans.toLocaleString("en-IN") : "–"}</div><div className="m">Fans</div></div>
          <div><div className="v">{waiting.length}</div><div className="m">Asks</div></div>
          <div><div className="v">{open}</div><div className="m">Open days</div></div>
        </div>
      </div>
      {next ? (
        <Link href={nextThread ? `/bookings/${nextThread.id}` : "/me/tour"} className="rise" style={{ display: "block", position: "relative", marginTop: 14, borderRadius: 18, padding: "16px 18px", background: "#F2EFE7", color: "#141414", textDecoration: "none", transform: "rotate(-.6deg)" }}>
          <span className="m" style={{ color: "rgba(20,20,20,.6)" }}>Next {next.state === "playing" ? "show" : "booking"}, {dayShort(next.day)}</span>
          {nextThread && <span className="art-stamp">{STAGE_LABEL[nextThread.stage]}</span>}
          <div className="d" style={{ fontSize: 26, marginTop: 6, color: "#141414" }}>{nextThread?.org ?? next.city ?? dayLong(next.day)}</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{[next.city, next.note].filter(Boolean).join(" · ") || dayLong(next.day)}</div>
        </Link>
      ) : (
        <div className="sf rise" style={{ marginTop: 14, borderRadius: 18, padding: "16px 18px" }}><b style={{ fontSize: 15 }}>Nothing booked in the next 90 days</b><div className="b" style={{ fontSize: 13, marginTop: 2 }}>Mark your free days so promoters find you on their date.</div></div>
      )}
      <h2 className="d" style={{ fontSize: 24, margin: "26px 0 4px" }}>To do</h2>
      {todo.map((x) => (
        <Link key={x.t} href={x.href} className="rw rise" style={{ padding: "12px 0" }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: "rgba(182,239,54,.12)", color: "var(--pc)" }}>{I(x.d)}</span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{x.t}</span><span className="b" style={{ display: "block", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.s}</span></span>
          {I("M9 6l6 6-6 6")}
        </Link>
      ))}
      <div className="hl" />
      <div className="brow" style={{ marginTop: 20 }}>
        <Link className="key" href="/me/tour" style={{ flex: 1 }}>Post a tour</Link>
        <Link className="btn" href={`/${me.slug}`} style={{ flex: 1, background: "rgba(255,255,255,.08)" }}>See your page</Link>
      </div>
    </>
  );
}
