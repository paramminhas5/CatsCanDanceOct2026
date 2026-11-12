"use client";
/**
 * Party home (board H39-Home). The next party as the yellow card with its seven steps and a progress
 * bar, then the rest. Every step is worked out from real data: door_nights (expected, inside, capacity,
 * lead) plus the night's own row (listed, lineup, tickets or RSVP). Nothing is assumed done.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { productLink } from "@ccd/brand";
import { fetchNights, todayIST, type NightRow } from "@/lib/door";
import { myPromoters, type MyPromoter } from "@/lib/promoters";
import { supabase } from "@/lib/supabase/browser";
import { Icon, Step, dayShort } from "./ui";

type Extra = { slug: string; listed: boolean | null; host_id: string | null; promoter_id: string | null; lineup: string[] | null; ticket_url: string | null; rsvp_open: boolean | null; review_status: string | null };
const days = (d: string, today: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5);

export function steps(n: NightRow, x: Extra | undefined, today: string) {
  const date = n.event_date ?? n.date ?? "";
  const past = !!date && date < today;
  const tonight = date === today;
  const listed = x?.listed !== false && !x?.host_id;
  const lineup = x?.lineup?.filter(Boolean) ?? [];
  const book = `/book?night=${n.slug}`;
  return [
    { done: true, title: "Party page", sub: n.expected ? `Live. ${n.expected} ${n.expected === 1 ? "person is" : "people are"} coming` : "Live. Share the invite to fill it", href: `/i/${n.slug}` },
    { done: listed, title: "On Nights", sub: listed ? "Listed on catscandance.com" : "Link only. Guests come through your invite", href: listed ? productLink("ccd", `/nights/${n.slug}`) : `/i/${n.slug}`, external: listed },
    { done: lineup.length > 0, title: "Artists", sub: lineup.length ? lineup.slice(0, 3).join(", ") : "Nobody booked yet", href: book, action: lineup.length ? undefined : "Book" },
    { done: false, title: "Gear", sub: "Decks, sound and lights, if you need them", href: `/gear?night=${n.slug}`, action: "Ask" },
    { done: !!(x?.ticket_url || x?.rsvp_open), title: x?.ticket_url ? "Tickets" : "Guest list", sub: x?.ticket_url ? "On your ticket link" : x?.rsvp_open ? `Free with RSVP${n.capacity ? `. ${n.expected} of ${n.capacity}` : ""}` : "Closed", href: `/guests?night=${n.slug}` },
    { done: past || n.inside > 0, title: "The door", sub: past ? "Done" : tonight ? `Tonight${n.start_time ? `, from ${n.start_time.slice(0, 5)}` : ""}` : `Opens ${dayShort(date)}${n.start_time ? `, ${n.start_time.slice(0, 5)}` : ""}`, href: `/door/${n.slug}` },
    { done: past, title: "Report", sub: past ? "Who came, when, and what the door took" : "Ready the morning after", href: `/door/${n.slug}/report` },
  ];
}

export default function PartiesHome() {
  const [nights, setNights] = useState<NightRow[] | null>(null);
  const [extra, setExtra] = useState<Record<string, Extra>>({});
  const [err, setErr] = useState<string | null>(null);
  const [promoters, setPromoters] = useState<MyPromoter[]>([]);
  useEffect(() => {
    fetchNights().then(async (r) => {
      const list = r.ok ? r.nights ?? [] : [];
      if (!r.ok) setErr(r.error ?? "Could not load your parties");
      setNights(list);
      if (list.length) {
        const { data } = await supabase().from("events").select("slug,listed,host_id,promoter_id,lineup,ticket_url,rsvp_open,review_status").in("slug", list.map((n) => n.slug));
        setExtra(Object.fromEntries(((data as Extra[] | null) ?? []).map((e) => [e.slug, e])));
      }
    });
    myPromoters().then(setPromoters).catch(() => {});
  }, []);

  if (!nights) return <div style={{ padding: "40px 20px" }} className="b" aria-busy="true">Loading your parties</div>;
  const today = todayIST();
  const up = nights.filter((n) => (n.event_date ?? n.date ?? "9999") >= today).sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const past = nights.filter((n) => (n.event_date ?? n.date ?? "9999") < today);
  const next = up[0];
  const s = next ? steps(next, extra[next.slug], today) : [];
  const doneN = s.filter((x) => x.done).length;
  const until = next?.event_date ? days(next.event_date, today) : null;

  return (
    <>
      {err && <p className="err" style={{ padding: "0 20px" }} role="alert">{err}</p>}
      {next ? (
        <>
          <Link href={`/i/${next.slug}`} className="rise" style={{ display: "block", margin: "6px 16px 0", borderRadius: 22, background: "var(--pc)", color: "var(--pi)", padding: "18px 18px 16px", flex: "none", textDecoration: "none" }}>
            <div className="row">
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Next: {dayShort(next.event_date)}{next.start_time ? `, ${next.start_time.slice(0, 5)}` : ""}</span>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>{until === 0 ? "Tonight" : until === 1 ? "Tomorrow" : until != null ? `In ${until} days` : ""}</span>
            </div>
            <div className="d" style={{ fontSize: 40, marginTop: 10, color: "var(--pi)" }}>{next.title}</div>
            <div style={{ fontSize: 14, opacity: 0.75, marginTop: 2 }}>{[next.venue, next.city].filter(Boolean).join(", ") || "Place to set"}</div>
            <div className="row host-progress" style={{ gap: 4, marginTop: 14 }}>
              {s.map((x, i) => <i key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: x.done ? "#0A0A0A" : "rgba(0,0,0,.18)", animationDelay: `${i * 0.06}s` }} />)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8, opacity: 0.7 }}>{doneN} of {s.length} done</div>
          </Link>
          <div style={{ padding: "8px 20px 0" }}>
            {s.map((x) => <div key={x.title} className="rise"><Step {...x} /></div>)}
            <div className="hl" />
          </div>
        </>
      ) : (
        <div style={{ margin: "6px 16px 0", borderRadius: 22, background: "var(--pc)", color: "var(--pi)", padding: "22px 18px", position: "relative", overflow: "hidden" }} className="rise">
          <img src="/cats/yellow.webp" alt="" style={{ position: "absolute", right: -6, bottom: -10, height: 120, animation: "bob 3.2s ease-in-out infinite" }} />
          <div className="d" style={{ fontSize: 34, color: "var(--pi)", maxWidth: 230 }}>No party coming up</div>
          <div style={{ fontSize: 14, opacity: 0.75, marginTop: 6, maxWidth: 230 }}>Make one. The invite, who is coming, artists, gear and the door all land here.</div>
          <Link href="/make" className="pill lg" style={{ marginTop: 16, background: "#0A0A0A", color: "#FFE600", boxShadow: "none", display: "inline-flex" }}><Icon i="plus" size={14} stroke={2.6} />Make a party</Link>
        </div>
      )}

      {up.length > 1 && (
        <div style={{ padding: "26px 20px 0" }}>
          <div className="m">Also coming up</div>
          {up.slice(1).map((n) => (
            <Link key={n.slug} href={`/i/${n.slug}`} className="rw rise" style={{ padding: "12px 0" }}>
              <span className="m" style={{ width: 92, flex: "none", color: "var(--tx)" }}>{dayShort(n.event_date)}</span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{n.title}</span><span className="b" style={{ display: "block", fontSize: 13 }}>{n.expected} coming</span></span>
              <Icon i="next" size={14} color="rgba(242,240,235,.5)" />
            </Link>
          ))}
        </div>
      )}

      {promoters.length > 0 && (
        <div style={{ padding: "26px 20px 0" }}>
          <div className="m">Your promoter pages</div>
          {promoters.map((p) => (
            <Link key={p.slug} href={`/promote/${p.slug}`} className="rw" style={{ padding: "12px 0" }}>
              <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{p.name}</span><span className="b" style={{ display: "block", fontSize: 13 }}>{p.status === "approved" ? "Live" : "In review"}, {p.nights} nights</span></span>
              <Icon i="next" size={14} color="rgba(242,240,235,.5)" />
            </Link>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div style={{ padding: "26px 20px 0" }}>
          <div className="m">Past parties</div>
          {past.slice(0, 12).map((n) => (
            <Link key={n.slug} href={`/door/${n.slug}/report`} className="rw" style={{ padding: "12px 0" }}>
              <span className="m" style={{ width: 92, flex: "none", color: "var(--tx)" }}>{dayShort(n.event_date ?? n.date)}</span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{n.title}</span><span className="b" style={{ display: "block", fontSize: 13 }}>How it went</span></span>
              <Icon i="next" size={14} color="rgba(242,240,235,.5)" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
