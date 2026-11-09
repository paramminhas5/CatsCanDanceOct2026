"use client";
/**
 * Who's coming (board H39-RSVP), from the host's side. The list is door_list (RSVPs and tickets) plus
 * door_guests_list (outside tickets), so it is the same list the door checks. Pick the party at the top
 * when there is more than one coming up.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchList, fetchNights, todayIST, sourceLabel, type DoorData, type NightRow } from "@/lib/door";
import { Avatar, Gls, Icon, SignInCard, Top } from "./ui";

type Person = { key: string; name: string; sub: string; tag: string; lit: boolean };

export default function Guests({ night, signedIn }: { night: string; signedIn: boolean }) {
  const router = useRouter();
  const [nights, setNights] = useState<NightRow[] | null>(null);
  const [d, setD] = useState<DoorData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    fetchNights().then((r) => setNights(r.ok ? r.nights ?? [] : (setErr(r.error ?? "Could not load"), [])));
  }, [signedIn]);
  const today = todayIST();
  const up = useMemo(() => (nights ?? []).filter((n) => (n.event_date ?? "9999") >= today).sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? "")), [nights, today]);
  const slug = night || up[0]?.slug || nights?.[0]?.slug || "";
  useEffect(() => {
    if (!slug) return;
    let live = true;
    fetchList(slug).then((r) => { if (!live) return; if (r.ok && r.data) setD(r.data); else setErr(r.error ?? "Could not load the list"); });
    return () => { live = false; };
  }, [slug]);

  if (!signedIn) return <><Top back="/parties" /><SignInCard next="/guests" title="Who's coming" line="Sign in to see who said they are coming to your party." /></>;
  if (nights && !slug) return <><Top back="/parties" /><SignInCard next="/make" title="No party yet" line="Make a party and the people who say they are coming show up here." /></>;

  const cur = d && d.night.slug === slug ? d : null;
  const people: Person[] = cur ? [
    ...cur.rsvps.map((r) => ({ key: `r${r.id}`, name: r.name, sub: r.party > 1 ? `Going, plus ${r.party - 1 === 1 ? "one" : r.party - 1}` : "Going", tag: r.in_count > 0 ? "In" : "Going", lit: r.in_count === 0 })),
    ...cur.tickets.filter((t) => !t.void).map((t) => ({ key: `t${t.code}`, name: t.name ?? "Ticket", sub: t.tier ? `Ticket, ${t.tier}` : "Ticket", tag: t.in_at ? "In" : "Ticket", lit: !t.in_at })),
    ...(cur.guests ?? []).map((g) => ({ key: `g${g.id}`, name: g.name ?? g.code ?? "Guest", sub: `${sourceLabel(g.source)}${g.party > 1 ? `, party of ${g.party}` : ""}`, tag: g.in_count > 0 ? "In" : "Outside", lit: g.in_count === 0 })),
  ].sort((a, b) => a.name.localeCompare(b.name)) : [];
  const going = cur ? cur.rsvps.reduce((a, r) => a + r.party, 0) + cur.tickets.filter((t) => !t.void).length + (cur.guests ?? []).reduce((a, g) => a + g.party, 0) : null;
  const inside = cur ? cur.rsvps.reduce((a, r) => a + r.in_count, 0) + cur.tickets.filter((t) => t.in_at && !t.out_at && !t.void).length + (cur.guests ?? []).reduce((a, g) => a + g.in_count, 0) + cur.walkins.reduce((a, w) => a + w.party, 0) : null;
  const shown = q ? people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : people;
  const url = typeof window === "undefined" ? `/i/${slug}` : `${window.location.origin}/i/${slug}`;
  const share = async () => {
    try { if (navigator.share) { await navigator.share({ title: cur?.night.title ?? "You are invited", url }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* the link is on screen */ }
  };

  return (
    <>
      <Top back="/parties" right={cur?.night.title ?? ""} />
      <div style={{ padding: "4px 20px 0" }}><h1 className="cur" style={{ fontSize: 36, margin: 0 }}>Who&rsquo;s coming</h1></div>
      {up.length > 1 && (
        <div className="row" style={{ gap: 6, padding: "12px 20px 0", overflowX: "auto" }}>
          {up.map((n) => <button key={n.slug} type="button" className={`pill lg${n.slug === slug ? " on" : ""}`} onClick={() => router.replace(`/guests?night=${n.slug}`)}>{n.title}</button>)}
        </div>
      )}
      <div style={{ padding: "16px 20px 0" }}><Gls cells={[{ label: "Coming", value: going }, { label: "Inside", value: inside }, { label: "Capacity", value: cur?.night.capacity ?? "Open" }]} /></div>
      <div className="sf row" style={{ margin: "14px 20px 0", padding: "12px 14px", borderRadius: 16, gap: 10 }}>
        <span style={{ opacity: 0.8 }}><Icon i="link" /></span>
        <span style={{ flex: 1, fontSize: 14, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url.replace(/^https?:\/\//, "")}</span>
        <button type="button" className="pill" style={{ height: 30 }} onClick={share}>{copied ? "Copied" : "Copy"}</button>
      </div>
      {people.length > 8 && <div style={{ padding: "12px 20px 0" }}><input className="fld" type="search" placeholder="Find a name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a name" /></div>}
      <div style={{ padding: "4px 20px 0" }}>
        {err && <p className="err" role="alert">{err}</p>}
        {!cur && !err && <p className="b" aria-busy="true" style={{ padding: "14px 0" }}>Loading the list</p>}
        {cur && people.length === 0 && <p className="b" style={{ padding: "14px 0" }}>Nobody yet. Share the invite and names land here as people say they are coming.</p>}
        {shown.map((p) => (
          <div key={p.key} className="rw rise" style={{ padding: "11px 0" }}>
            <Avatar name={p.name} />
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{p.name}</span><span className="b" style={{ display: "block", fontSize: 13 }}>{p.sub}</span></span>
            <span className="m" style={{ color: p.lit ? "var(--pc)" : undefined }}>{p.tag}</span>
          </div>
        ))}
        {people.length > 0 && <div className="hl" />}
      </div>
      <div style={{ flex: 1, minHeight: 20 }} />
      <div className="brow" style={{ padding: "16px 20px 0" }}>
        <Link className="btn" href={`/door/${slug}`} style={{ flex: 1 }}>Open the door</Link>
        <button type="button" className="key" style={{ flex: 1.2 }} onClick={share}><Icon i="share" />Share the link</button>
      </div>
    </>
  );
}
