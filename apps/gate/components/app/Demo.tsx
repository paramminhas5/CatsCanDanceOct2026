"use client";
/**
 * Try it before signing in (plan ccd/v2-plan.md 5.4): the Parties, Guests and Door tabs open as working
 * examples when nobody is signed in. Every name and number here is example data and says so on screen.
 * If the visitor already started a party in Make a party, the Parties example uses their draft.
 * Nothing is saved; signing in or making a party is one tap away on every screen.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, Gls, Icon, Step, Top, dayShort, lookOf } from "./ui";

const todayIST = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + 5.5 * 36e5 + n * 864e5).toISOString().slice(0, 10);
type Draft = { v: Record<string, string>; look: string; entry: "rsvp" | "tickets"; who: "link" | "listed" };
const readDraft = (): Draft | null => { try { const d = localStorage.getItem("host_party_draft"); return d ? (JSON.parse(d) as Draft) : null; } catch { return null; } };

/** The strip on top of every example screen. */
export function DemoBar({ line, cta = "Make yours", href = "/make" }: { line: string; cta?: string; href?: string }) {
  return (
    <div className="demo-bar rise" role="note">
      <span className="demo-tag">Example</span>
      <span className="b" style={{ flex: 1, fontSize: 13, color: "var(--tx)" }}>{line}</span>
      <Link href={href} className="pill" style={{ background: "var(--pc)", color: "var(--pi)", boxShadow: "none", flex: "none" }}>{cta}</Link>
    </div>
  );
}

/* ── Parties ── */
export function PartiesDemo() {
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => { queueMicrotask(() => setDraft(readDraft())); }, []);
  const mine = !!draft?.v.title;
  const title = mine ? draft!.v.title : "Rooftop at Meera's";
  const date = (mine && draft!.v.date) || plusDays(6);
  const where = mine ? [draft!.v.where, draft!.v.city].filter(Boolean).join(", ") : "Indiranagar, Bengaluru";
  const until = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${todayIST()}T00:00:00Z`)) / 864e5);
  const lineup = mine ? (draft!.v.lineup ?? "").split(",").map((x) => x.trim()).filter(Boolean) : ["Two friends on the decks"];
  const look = lookOf(mine ? draft!.look : "yellow");
  const s = mine ? [
    { done: false, title: "Party page", sub: "Saved on this phone. Publish to get the link", href: "/make" },
    { done: draft!.who === "listed", title: "On Nights", sub: draft!.who === "listed" ? "Goes to CCD once you publish" : "Link only. Guests come through your invite", href: "/make" },
    { done: lineup.length > 0, title: "Artists", sub: lineup.length ? lineup.slice(0, 3).join(", ") : "Nobody booked yet", href: "/book", action: lineup.length ? undefined : "Book" },
    { done: false, title: "Gear", sub: "Decks, sound and lights, if you need them", href: "/gear", action: "Ask" },
    { done: true, title: draft!.entry === "tickets" ? "Tickets" : "Guest list", sub: draft!.entry === "tickets" ? "On your ticket link" : "Free with RSVP", href: "/guests" },
    { done: false, title: "The door", sub: `Opens ${dayShort(date)}`, href: "/door" },
    { done: false, title: "Report", sub: "Ready the morning after", href: "/door" },
  ] : [
    { done: true, title: "Party page", sub: "Live. 38 people are coming", href: "/make" },
    { done: false, title: "On Nights", sub: "Link only. Guests come through your invite", href: "/make" },
    { done: true, title: "Artists", sub: lineup.join(", "), href: "/book" },
    { done: false, title: "Gear", sub: "Decks, sound and lights, if you need them", href: "/gear", action: "Ask" },
    { done: true, title: "Guest list", sub: "Free with RSVP. 38 of 60", href: "/guests" },
    { done: false, title: "The door", sub: `Opens ${dayShort(date)}, 21:00`, href: "/door" },
    { done: false, title: "Report", sub: "Ready the morning after", href: "/door" },
  ];
  const doneN = s.filter((x) => x.done).length;
  return (
    <>
      <div style={{ padding: "0 16px" }}><DemoBar line={mine ? "Your draft, as it will look once it is live." : "This is how your party home looks. Tap around."} cta={mine ? "Publish" : "Make yours"} href="/make" /></div>
      <Link href="/make" className="rise" style={{ display: "block", margin: "10px 16px 0", borderRadius: 22, background: look.bg, color: look.ink, padding: "18px 18px 16px", flex: "none", textDecoration: "none" }}>
        <div className="row">
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Next: {dayShort(date)}{mine && draft!.v.time ? `, ${draft!.v.time}` : ", 21:00"}</span>
          <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>{until === 0 ? "Tonight" : until === 1 ? "Tomorrow" : until > 1 ? `In ${until} days` : ""}</span>
        </div>
        <div className="d" style={{ fontSize: 40, marginTop: 10, color: look.ink }}>{title}</div>
        <div style={{ fontSize: 14, opacity: 0.75, marginTop: 2 }}>{where || "Place to set"}</div>
        <div className="row host-progress" style={{ gap: 4, marginTop: 14 }}>
          {s.map((x, i) => <i key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: x.done ? look.ink : "rgba(0,0,0,.18)", animationDelay: `${i * 0.06}s` }} />)}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8, opacity: 0.7 }}>{doneN} of {s.length} done</div>
      </Link>
      <div style={{ padding: "8px 20px 0" }}>
        {s.map((x) => <div key={x.title} className="rise"><Step {...x} /></div>)}
        <div className="hl" />
        <p className="b" style={{ fontSize: 13, marginTop: 14 }}>Already host with us? <Link href="/sign-in?next=/parties" style={{ color: "var(--tx)", textDecoration: "underline" }}>Sign in</Link> to see your own parties.</p>
      </div>
    </>
  );
}

/* ── Guests: say yes or no, and watch the list fill ── */
const ASKED = [
  { name: "Sana Kapoor", sub: "Regular. Been to 5" },
  { name: "Mihir Rao", sub: "Regular. Been to 3" },
  { name: "Jaya N", sub: "First time" },
  { name: "Tanvi S", sub: "Been to 1" },
];
const GOING = ["Aditi K", "Arjun M", "Dev P", "Ishaan R", "Kavya B", "Meera J", "Nikhil T", "Riya D", "Rohan V", "Zoya A"];

export function GuestsDemo() {
  const [asked, setAsked] = useState(ASKED);
  const [going, setGoing] = useState(GOING.map((n, i) => ({ name: n, sub: i % 3 === 0 ? "Going, plus one" : "Going", party: i % 3 === 0 ? 2 : 1 })));
  const [said, setSaid] = useState<string | null>(null);
  const coming = going.reduce((a, g) => a + g.party, 0) + 24;
  const answer = (name: string, yes: boolean) => {
    const p = asked.find((a) => a.name === name);
    setAsked((l) => l.filter((a) => a.name !== name));
    if (yes && p) setGoing((l) => [{ name: p.name, sub: "Going. Their QR just went out", party: 1 }, ...l]);
    setSaid(yes ? `${name.split(" ")[0]} is in. Their QR went out by email.` : `${name.split(" ")[0]} gets a kind no.`);
  };
  return (
    <>
      <Top back="/parties" right="Rooftop at Meera's" />
      <div style={{ padding: "0 16px" }}><DemoBar line="Guests ask on your party page. You say yes or no here." /></div>
      <div style={{ padding: "10px 20px 0" }}><h1 className="cur" style={{ fontSize: 36, margin: 0 }}>Who&rsquo;s coming</h1></div>
      <div style={{ padding: "16px 20px 0" }}><Gls cells={[{ label: "Coming", value: coming }, { label: "Asked", value: asked.length }, { label: "Capacity", value: 60 }]} /></div>
      {asked.length > 0 && (
        <div style={{ padding: "18px 20px 0" }}>
          <div className="row"><span className="m" style={{ flex: 1 }}>Asked to come</span>{asked.length > 1 && <button type="button" className="pill" onClick={() => { asked.forEach((a) => answer(a.name, true)); setSaid("Everyone is in. Their QRs went out."); }}>Yes to all</button>}</div>
          {asked.map((p) => (
            <div key={p.name} className="rw rise" style={{ padding: "11px 0" }}>
              <Avatar name={p.name} />
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{p.name}</span><span className="b" style={{ display: "block", fontSize: 13 }}>{p.sub}</span></span>
              <button type="button" className="ic40" style={{ width: 40, height: 40 }} onClick={() => answer(p.name, false)} aria-label={`No to ${p.name}`}><Icon i="minus" size={16} /></button>
              <button type="button" className="ic40" style={{ width: 40, height: 40, background: "var(--pc)", color: "var(--pi)", boxShadow: "none" }} onClick={() => answer(p.name, true)} aria-label={`Yes to ${p.name}`}><Icon i="check" size={16} stroke={2.6} /></button>
            </div>
          ))}
        </div>
      )}
      {said && <p className="b rise" role="status" style={{ padding: "10px 20px 0", fontSize: 13, color: "var(--tx)" }}>{said}</p>}
      <div style={{ padding: "18px 20px 0" }}>
        <div className="m">Going</div>
        {going.map((p) => (
          <div key={p.name} className="rw rise" style={{ padding: "11px 0" }}>
            <Avatar name={p.name} />
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{p.name}</span><span className="b" style={{ display: "block", fontSize: 13 }}>{p.sub}</span></span>
            <span className="m" style={{ color: "var(--pc)" }}>Going</span>
          </div>
        ))}
        <p className="b" style={{ fontSize: 13, padding: "10px 0 0" }}>Plus 24 more. Tickets from District or Skillbox show here too once you import them.</p>
      </div>
    </>
  );
}

/* ── Door: scan, and the screen answers ── */
type Scan = { kind: "in" | "already" | "list" | "outside"; name: string; line: string };
const QUEUE: Scan[] = [
  { kind: "in", name: "Aditi K", line: "General. 1 of 2" },
  { kind: "list", name: "Rohan V", line: "Guest list, plus one. Both in" },
  { kind: "outside", name: "Kabir S", line: "District ticket. Matched" },
  { kind: "already", name: "Dev P", line: "Came in at 21:42. Pass-out? Tap to let back in" },
  { kind: "in", name: "Meera J", line: "Early entry" },
  { kind: "in", name: "Zoya A", line: "General. 2 of 2" },
];

export function DoorDemo() {
  const [inside, setInside] = useState(141);
  const [i, setI] = useState(-1);
  const [offline, setOffline] = useState(false);
  const flash = useRef<HTMLDivElement | null>(null);
  const cur = i >= 0 ? QUEUE[i % QUEUE.length] : null;
  const scan = () => {
    const n = i + 1;
    const s = QUEUE[n % QUEUE.length];
    setI(n);
    if (s.kind !== "already") setInside((x) => x + (s.kind === "list" ? 2 : 1));
    flash.current?.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 500, easing: "ease-out" });
    try { navigator.vibrate?.(s.kind === "already" ? [60, 40, 60] : 40); } catch { /* no buzz */ }
  };
  const ok = cur && cur.kind !== "already";
  return (
    <div style={{ padding: "0 16px 24px" }}>
      <DemoBar line="Tap scan to see what the door sees. This is an example night." cta="Make a party" />
      <div className="door-demo rise" style={{ ["--hit" as string]: ok ? "#12B76A" : cur ? "#E5484D" : "transparent" } as React.CSSProperties}>
        <div ref={flash} className="door-flash" aria-hidden="true" />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="m">{offline ? "No signal. 6 to sync" : "Online"}</span>
          <button type="button" className="pill" onClick={() => setOffline((v) => !v)}>{offline ? "Signal back" : "Drop the signal"}</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <div className="m">In tonight</div>
          <div className="d" style={{ fontSize: 88, lineHeight: 1 }} aria-live="polite">{inside}</div>
          <div className="b" style={{ fontSize: 13 }}>of 270 expected</div>
        </div>
        <div className="door-frame" aria-hidden="true"><i /><i /><i /><i /><b /></div>
        {cur ? (
          <div className="door-res rise" key={i} role="status" style={{ background: ok ? "#12B76A" : "#E5484D" }}>
            <Icon i={ok ? "check" : "minus"} size={22} stroke={3} />
            <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 17 }}>{ok ? "Let in" : "Already in"} · {cur.name}</b><span style={{ fontSize: 13, opacity: 0.85 }}>{cur.line}</span></span>
          </div>
        ) : <p className="b" style={{ textAlign: "center", marginTop: 10 }}>Point the camera at a ticket. Here, tap scan.</p>}
        <button type="button" className="key" style={{ width: "100%", marginTop: 14 }} onClick={scan}>Scan the next guest</button>
      </div>
      <p className="b" style={{ fontSize: 13, marginTop: 12 }}>Tickets, the guest list and tickets from other sites, on one screen. It keeps working with no signal and catches up when it can.</p>
    </div>
  );
}
