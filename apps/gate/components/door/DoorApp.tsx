"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/refs, react-hooks/purity, react-hooks/set-state-in-effect, react/no-unescaped-entities, @next/next/no-img-element --
   Ported unchanged from apps/ccd, where this door runs in production. The stricter React compiler rules in this app
   flag patterns it relies on (the scan loop reads refs during render; camera and audio APIs are typed loosely).
   Rewrite to the new rules in a later pass, with the door e2e test (scripts/door/e2e.cjs) as the guard. */
/**
 * The door for one night. Four tabs, thumb-reachable at the bottom:
 *   Scan    camera, instant green or red, holder name and tier, undo
 *   Guests  search tickets, free list, outside tickets and walk-ins by name; tap to check in; party counter for the list
 * Outside tickets (District, BookMyShow, Skillbox and any CSV, migration 060) are imported in setup and scan like ours.
 *   Walk-in add someone at the door, with what they paid
 *   Count   inside, expected, capacity, arrivals per 15 minutes, door takings
 * Scan has two modes: In (the default) and Out, for pass-outs. A guest scanned out comes back in with one scan.
 * Night settings (ID check, a note, UPI for door payments) come from door_settings; the lead edits them at /door/<night>/setup.
 * Works offline: the list lives on the phone and actions queue until there is signal (src/lib/door.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Scanner from "@/components/door/Scanner";
import {
  applyLocal, arrivals, cleanCode, counts, deviceName, fetchList, loadCache, loadQueue, localCheck, localCheckOut, localGuest, saveCache, saveQueue,
  sendOp, serverCheck, serverGuestCheck, sourceLabel, timeIST, uid, upiLink, withPending, type DGuest, type DoorData, type DTicket, type Op, type ScanResult,
} from "@/lib/door";
import { supabase } from "@/lib/supabase/browser";
import QRCode from "qrcode";
import { boardVars } from "@ccd/ui";

type Tab = "scan" | "guests" | "walkin" | "count";

const good = (r: ScanResult) => r.kind === "admit" || r.kind === "back" || r.kind === "out";
/** Door status colours: green let in, blue pass-out, red stop, orange check their name. */
const TONE = { in: { bg: "#2BD47D", ink: "#062B16" }, out: { bg: "#3B82F6", ink: "#FFFFFF" }, no: { bg: "#FF5A5F", ink: "#2B0607" }, warn: { bg: "#FFB020", ink: "#2B1A00" } } as const;
const toneOf = (r: ScanResult): keyof typeof TONE => (r.kind === "out" ? "out" : good(r) ? "in" : r.kind === "already" || r.kind === "void" ? "no" : "warn");
const HEAD: Record<ScanResult["kind"], string> = {
  admit: "Let them in", back: "Welcome back", out: "Pass-out", already: "Already in", void: "Refunded", wrong_night: "Wrong night",
  not_found: "Not a ticket", check_name: "Not on this list", already_out: "Already out", not_in: "Not checked in",
};
const headline = (r: ScanResult) => HEAD[r.kind];

function beep(ok: boolean) {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = (beep as any).ctx || ((beep as any).ctx = new Ctx());
    const play = (f: number, t0: number, d: number) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = "square"; g.gain.value = 0.06;
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + d);
    };
    if (ok) play(1320, 0, 0.09); else { play(220, 0, 0.14); play(180, 0.18, 0.2); }
  } catch { /* no sound: the colour still says it */ }
  try { navigator.vibrate?.(ok ? 40 : [80, 60, 120]); } catch { /* not supported */ }
}

export default function DoorApp({ slug }: { slug: string }) {
  const device = useMemo(() => (typeof window === "undefined" ? "Door" : deviceName()), []);
  const [data, setData] = useState<DoorData | null>(null);
  const [queue, setQueue] = useState<Op[]>([]);
  const [online, setOnline] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("scan");
  const [mode, setMode] = useState<"in" | "out">("in");
  const modeRef = useRef(mode); modeRef.current = mode;
  const [result, setResult] = useState<ScanResult | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [lastSync, setLastSync] = useState<number>(0);
  const dataRef = useRef<DoorData | null>(null);
  const queueRef = useRef<Op[]>([]);
  const syncing = useRef(false);
  dataRef.current = data; queueRef.current = queue;

  // Load: the phone's copy first (instant, offline), then the server.
  useEffect(() => {
    let live = true;
    Promise.all([loadCache(slug), loadQueue(slug)]).then(([c, q]) => {
      if (!live) return;
      setQueue(q);
      if (c) setData((d) => d ?? withPending(c, q));
    });
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    return () => { live = false; };
  }, [slug]);

  const refresh = useCallback(async () => {
    const r = await fetchList(slug);
    if (!r.ok || !r.data) { if (!dataRef.current) setErr(r.error ?? "Could not load the list."); return false; }
    saveCache(slug, r.data);
    setData(withPending(r.data, queueRef.current));
    setErr(""); setLastSync(Date.now());
    return true;
  }, [slug]);

  const flush = useCallback(async () => {
    if (syncing.current || !navigator.onLine) return;
    syncing.current = true;
    try {
      let q = [...queueRef.current];
      while (q.length) {
        const op = q[0];
        const r = await sendOp(slug, op, device);
        if (!r.ok) {
          // Network or auth trouble: keep it queued. A rule the server rejects (e.g. not on this list) is dropped.
          if (/fetch|network|Failed|JWT|timeout/i.test(r.error ?? "")) break;
        }
        if (op.kind === "ticket" && r.result?.result === "already") {
          const at = r.result.at ? timeIST(r.result.at) : "";
          setToast({ text: `${r.result.name || "That ticket"} was already in${at ? ` at ${at}` : ""} on another door.` });
        }
        q = q.slice(1);
        queueRef.current = q; setQueue(q); saveQueue(slug, q);
      }
      if (!q.length) await refresh();
    } finally { syncing.current = false; }
  }, [slug, device, refresh]);

  useEffect(() => {
    refresh().then(() => flush());
    const on = () => { setOnline(true); flush(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    const t = setInterval(() => { if (navigator.onLine) { if (queueRef.current.length) flush(); else refresh(); } }, 12000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); clearInterval(t); };
  }, [refresh, flush]);

  // Keep the screen awake while the door is open.
  useEffect(() => {
    let lock: any = null;
    const get = async () => { try { lock = await (navigator as any).wakeLock?.request("screen"); } catch { /* not supported */ } };
    get();
    const vis = () => { if (document.visibilityState === "visible") get(); };
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); try { lock?.release(); } catch { /* ignore */ } };
  }, []);

  const act = useCallback((op: Op) => {
    setData((d) => (d ? applyLocal(d, op) : d));
    const q = [...queueRef.current, op];
    queueRef.current = q; setQueue(q); saveQueue(slug, q);
    flush();
  }, [slug, flush]);

  const now = () => new Date().toISOString();

  const admitTicket = useCallback((t: DTicket) => {
    act({ id: uid(), kind: "ticket", at: now(), code: t.code });
    setToast({ text: `${t.name || "Guest"} is in.`, undo: () => act({ id: uid(), kind: "undo_ticket", at: now(), code: t.code }) });
  }, [act]);

  // A scan: answer from the phone's list straight away; ask the server only about codes it doesn't know.
  const onCode = useCallback(async (raw: string) => {
    const d = dataRef.current; if (!d) return;
    const code = cleanCode(raw);
    if (!code) return;
    let r: ScanResult;
    if (modeRef.current === "out") {
      r = localCheckOut(d, code);
      if (r.kind === "out") act({ id: uid(), kind: "passout", at: now(), code });
    } else {
      r = localCheck(d, code);
      const g = r.kind === "check_name" ? localGuest(d, raw) : null;
      if (r.kind === "admit" || r.kind === "back") {
        act({ id: uid(), kind: "ticket", at: now(), code });
      } else if (g) {
        // An outside ticket (District, BookMyShow, any imported list): the whole party goes in on one scan.
        const tier = `${sourceLabel(g.source)}${g.party > 1 ? ` · party of ${g.party}` : ""}`;
        if (g.in_count >= g.party && g.in_at) r = { kind: "already", name: g.name || "Guest", tier, at: g.in_at, code };
        else { r = { kind: "admit", name: g.name || "Guest", tier, code, party: g.party }; act({ id: uid(), kind: "guest", at: now(), guest: g.id, count: g.party }); }
      } else if (r.kind === "check_name" && navigator.onLine) {
        const s = await serverCheck(slug, code, device);
        if (s && s.kind !== "not_found") { r = s; if (s.kind === "admit" || s.kind === "back") refresh(); }
        else {
          const o = await serverGuestCheck(slug, raw, device);
          if (o) { r = o; if (o.kind === "admit") refresh(); } else if (s) r = s;
        }
      }
    }
    beep(good(r));
    setResult(r);
  }, [act, slug, device, refresh]);

  // The camera keeps seeing the phone that was just scanned. Ignore the same code for 20 seconds,
  // so the door doesn't flash red at a guest who was let in a moment ago. Typed codes are always checked.
  const recent = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const onScan = useCallback((raw: string) => {
    const code = cleanCode(raw);
    if (code === recent.current.code && Date.now() - recent.current.at < 20000) return;
    recent.current = { code, at: Date.now() };
    onCode(raw);
  }, [onCode]);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), good(result) && !data?.settings.age_check ? 1600 : 3200);
    return () => clearTimeout(t);
  }, [result, data?.settings.age_check]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const shell = (children: React.ReactNode) => (
    <div className="dk">
      <div className="v4 app door-app" style={{ ...boardVars("#FFE600", "#0A0A0A"), ["--amb" as string]: result ? TONE[toneOf(result)].bg : "#FFE600" } as React.CSSProperties}>
        <div className="door-amb" aria-hidden="true" />
        {children}
      </div>
    </div>
  );

  if (!data) {
    return shell(
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", position: "relative" }}>
        <div>
          <img src="/cats/yellow.webp" alt="" style={{ height: 110, animation: "bob 3s ease-in-out infinite" }} />
          <div className="d" style={{ fontSize: 30, marginTop: 12 }}>{err ? "Can't open the door" : "Loading the list"}</div>
          {err && <p className="b" style={{ marginTop: 10 }}>{err}</p>}
          <Link href="/door" className="pill lg" style={{ marginTop: 18, display: "inline-flex" }}>All nights</Link>
        </div>
      </div>,
    );
  }

  const c = counts(data);
  const cap = data.night.capacity ?? null;
  const pct = cap ? Math.min(100, Math.round((c.inside / cap) * 100)) : null;
  const undoable = result?.kind === "admit" && data.tickets.some((t) => t.code === result.code);

  return shell(
    <>
      <div className="top4" style={{ position: "sticky", top: 0, zIndex: 20 }}>
        <Link className="ic40" href="/door" aria-label="All nights"><Ico d="M6 6l12 12M18 6L6 18" /></Link>
        <span style={{ flex: 1 }} />
        <SyncPill online={online} waiting={queue.length} lastSync={lastSync} />
        <Link className="ic40" href={`/door/${slug}/${data.settings.lead ? "setup" : "report"}`} aria-label={data.settings.lead ? "Night setup" : "Door report"}>
          {data.settings.lead ? <Ico d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /> : <Ico d="M4 20V10M10 20V4M16 20v-7M22 20H2" />}
        </Link>
      </div>

      {tab === "scan" && (
        <div style={{ position: "relative", padding: "6px 20px 0", textAlign: "center", flex: "none" }}>
          <div className="m" style={{ color: "rgba(255,255,255,.75)" }}>{data.night.title}</div>
          <div className="d door-count" style={{ fontSize: 96, marginTop: 6, lineHeight: 0.95 }} key={c.inside}>{c.inside}</div>
          <div className="b" style={{ color: "rgba(255,255,255,.7)" }}>{c.expected ? `of ${c.expected} expected` : "in tonight"}{cap ? `, room for ${cap}` : ""}</div>
          {pct !== null && <div style={{ margin: "12px auto 0", width: 180, height: 4, borderRadius: 2, background: "rgba(255,255,255,.12)", overflow: "hidden" }} aria-hidden><i style={{ display: "block", height: 4, width: `${pct}%`, background: pct >= 95 ? "#FF5A5F" : pct >= 80 ? "#FFB020" : "var(--pc)", transition: "width .6s" }} /></div>}
          {(data.settings.age_check || data.settings.note) && <div className="pill" style={{ marginTop: 12, background: "var(--pc)", color: "var(--pi)", boxShadow: "none" }}>{[data.settings.age_check ? "Check ID for everyone" : null, data.settings.note].filter(Boolean).join(". ")}</div>}
        </div>
      )}

      <main style={{ position: "relative", flex: 1, padding: "16px 20px 120px" }}>
        {/* The scanner stays mounted so the camera keeps running between tabs; it only reads codes on the Scan tab. */}
        <div style={{ display: tab === "scan" ? "block" : "none" }}><ScanTab onScan={onScan} onCode={onCode} paused={!!result || tab !== "scan"} mode={mode} setMode={setMode} /></div>
        {tab === "guests" && <GuestsTab data={data} onTicket={admitTicket} onRsvp={(id, n) => act({ id: uid(), kind: "rsvp", at: now(), rsvp: id, count: n })}
          onGuest={(id, n) => act({ id: uid(), kind: "guest", at: now(), guest: id, count: n })}
          onUndo={(code) => act({ id: uid(), kind: "undo_ticket", at: now(), code })}
          onPass={(t) => { act({ id: uid(), kind: t.out_at ? "ticket" : "passout", at: now(), code: t.code }); setToast({ text: t.out_at ? `${t.name || "Guest"} is back in.` : `${t.name || "Guest"} is on a pass-out.` }); }} />}
        {tab === "walkin" && <WalkinTab data={data} slug={slug} onAdd={(w) => { act({ id: uid(), kind: "walkin", at: now(), walk: w }); setToast({ text: `${w.name}${w.party > 1 ? ` +${w.party - 1}` : ""} added.`, undo: () => act({ id: uid(), kind: "void_walkin", at: now(), walk: w.id }) }); }}
          onVoid={(id) => act({ id: uid(), kind: "void_walkin", at: now(), walk: id })} />}
        {tab === "count" && <CountTab data={data} />}
      </main>

      {/* Scan result: the screen takes the colour and the card says it, readable from arm's length. Tap to scan the next one. */}
      {result && (
        <div className="door-result" role="alert" onClick={() => setResult(null)} style={{ background: `color-mix(in srgb, ${TONE[toneOf(result)].bg} 34%, rgba(5,5,5,.86))` }}>
          <div className="door-card" style={{ background: TONE[toneOf(result)].bg, color: TONE[toneOf(result)].ink }}>
            <div className="row" style={{ gap: 14 }}>
              <span style={{ width: 52, height: 52, borderRadius: 26, background: "rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <Ico d={good(result) ? "M5 12.5l4.5 4.5L19 7.5" : "M12 8v5M12 16.5v.5"} w={3} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 30, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.05 }}>{headline(result)}</span>
                <span style={{ display: "block", fontSize: 17, opacity: 0.85, marginTop: 4, wordBreak: "break-word" }}>{["name" in result ? result.name : null, "tier" in result ? result.tier : null].filter(Boolean).join(", ")}</span>
              </span>
              {undoable && <button type="button" className="m" style={{ background: "none", border: 0, color: "inherit", opacity: 0.85, cursor: "pointer", padding: 8 }} onClick={(e) => { e.stopPropagation(); act({ id: uid(), kind: "undo_ticket", at: now(), code: result.code }); setResult(null); setToast({ text: "Undone. They are not in." }); }}>Undo</button>}
            </div>
            {(result.kind === "admit" || result.kind === "back") && data.settings.age_check && <div style={{ marginTop: 14, fontSize: 20, fontWeight: 700, padding: "8px 14px", borderRadius: 14, background: "rgba(0,0,0,.18)", display: "inline-block" }}>Check ID</div>}
            <div style={{ fontSize: 15, marginTop: 10, opacity: 0.9 }}>
              {result.kind === "out" && "They keep their place. Scan them again on the way back in."}
              {result.kind === "back" && "Back from a pass-out."}
              {result.kind === "already_out" && "Already on a pass-out. Switch to In to let them back."}
              {result.kind === "not_in" && "This ticket was never checked in. Switch to In."}
              {result.kind === "already" && `Checked in at ${timeIST(result.at)}. Ask for another ticket or check by name.`}
              {result.kind === "void" && "This ticket was refunded or cancelled."}
              {result.kind === "wrong_night" && `This ticket is for ${result.event}.`}
              {result.kind === "check_name" && `${online ? "No ticket with this code." : "Offline, and this code is not on the saved list."} Search their name in Guests.`}
              {result.kind === "not_found" && "No ticket with this code. Search their name in Guests."}
            </div>
            <div className="m" style={{ marginTop: 12, color: "inherit", opacity: 0.6 }}>{result.code}</div>
          </div>
        </div>
      )}

      {toast && (
        <div className="sf rise" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 98, width: "calc(min(100%, 480px) - 32px)", zIndex: 35, padding: "12px 14px", borderRadius: 18, display: "flex", alignItems: "center", gap: 12, background: "rgba(26,26,29,.95)" }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{toast.text}</span>
          {toast.undo && <button type="button" className="pill" style={{ background: "var(--pc)", color: "var(--pi)", boxShadow: "none", border: 0, cursor: "pointer" }} onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>}
        </div>
      )}

      <nav className="dock" aria-label="Door">
        {([["scan", "Scan", "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"], ["guests", "Guests", "M9 12.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3.5 19c.9-2.8 3-4.3 5.5-4.3s4.6 1.5 5.5 4.3M16.5 10.6a2.6 2.6 0 1 0 0-5.2M16 13.3c2.2.1 3.9 1.4 4.6 3.9"], ["walkin", "Walk-in", "M12 5v14M5 12h14"], ["count", "Count", "M4 20V10M10 20V4M16 20v-7M22 20H2"]] as [Tab, string, string][]).map(([k, label, d]) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined} className={tab === k ? "on" : ""} style={{ border: 0, background: tab === k ? undefined : "none", fontFamily: "inherit", cursor: "pointer" }}>
            <Ico d={d} s={20} w={1.8} />{label}
          </button>
        ))}
      </nav>
    </>,
  );
}

function Ico({ d, s = 18, w = 2 }: { d: string; s?: number; w?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

function SyncPill({ online, waiting, lastSync }: { online: boolean; waiting: number; lastSync: number }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(t); }, []);
  const ago = lastSync ? Math.round((Date.now() - lastSync) / 60000) : null;
  const label = !online ? `No signal${waiting ? `, ${waiting} to sync` : ""}` : waiting ? `Sending ${waiting}` : ago === null ? "Connecting" : ago < 1 ? "Up to date" : `Synced ${ago}m ago`;
  const dot = !online ? "#FF5A5F" : waiting ? "#FFB020" : ago === null ? "rgba(255,255,255,.4)" : "#2BD47D";
  return <span className="pill" style={{ background: "rgba(10,10,11,.6)" }} role="status"><i style={{ width: 8, height: 8, borderRadius: 4, background: dot, boxShadow: `0 0 8px ${dot}` }} />{label}</span>;
}

function ScanTab({ onScan, onCode, paused, mode, setMode }: { onScan: (c: string) => void; onCode: (c: string) => void; paused: boolean; mode: "in" | "out"; setMode: (m: "in" | "out") => void }) {
  const [code, setCode] = useState("");
  return (
    <div>
      <Scanner onCode={onScan} paused={paused} />
      <div className="row" style={{ gap: 6, justifyContent: "center", marginTop: 18 }} role="group" aria-label="Scan mode">
        <button type="button" onClick={() => setMode("in")} aria-pressed={mode === "in"} className={`pill lg${mode === "in" ? " on" : ""}`}>In</button>
        <button type="button" onClick={() => setMode("out")} aria-pressed={mode === "out"} className="pill lg" style={mode === "out" ? { background: "#3B82F6", color: "#fff", boxShadow: "none" } : undefined}>Out, pass-out</button>
      </div>
      <form className="row" style={{ gap: 8, marginTop: 16 }} onSubmit={(e) => { e.preventDefault(); if (code.trim()) { onCode(code); setCode(""); } }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Or type the ticket code" aria-label="Ticket code"
          autoCapitalize="characters" autoCorrect="off" spellCheck={false} inputMode="text" className="fld" style={{ marginTop: 0, flex: 1, minWidth: 0, fontFamily: "var(--font-mono), monospace", textTransform: "uppercase" }} />
        <button className="pill lg" style={{ height: 50, background: "var(--pc)", color: "var(--pi)", boxShadow: "none" }}>Check</button>
      </form>
      <p className="b" style={{ fontSize: 13, marginTop: 12, textAlign: "center" }}>{mode === "in" ? "Green: let them in. Red: already in or refunded. Orange: check their name." : "Scanning people out. They keep their place and come back in with one scan on In."}</p>
    </div>
  );
}

type Row =
  | { k: "ticket"; key: string; name: string; sub: string; done: boolean; t: DTicket }
  | { k: "rsvp"; key: string; name: string; sub: string; done: boolean; id: string; party: number; inCount: number }
  | { k: "walk"; key: string; name: string; sub: string; done: true }
  | { k: "guest"; key: string; name: string; sub: string; done: boolean; g: DGuest };

/** The guest's own screenshot of an outside ticket. Signed link, readable only by this night's door (migration 060 storage policy). */
async function openProof(path: string) {
  const w = window.open("", "_blank");
  const { data } = await supabase().storage.from("ticket-proofs").createSignedUrl(path, 300);
  if (data?.signedUrl && w) w.location.href = data.signedUrl; else w?.close();
}

const inBtn = { background: "var(--pc)", color: "var(--pi)", boxShadow: "none", border: 0, cursor: "pointer", height: 36, padding: "0 16px", fontWeight: 600 } as React.CSSProperties;
const linkBtn = { background: "none", border: 0, color: "var(--t2)", cursor: "pointer", fontSize: 13, padding: "8px 6px", font: "inherit" } as React.CSSProperties;

function Counter({ label, n, of, set }: { label: string; n: number; of: number; set: (n: number) => void }) {
  return (
    <div className="row" style={{ gap: 6, flex: "none" }}>
      <button type="button" className="ic40" aria-label={`One fewer for ${label}`} onClick={() => set(n - 1)} disabled={n === 0} style={{ width: 34, height: 34, border: 0, color: "inherit", cursor: "pointer", opacity: n === 0 ? 0.3 : 1 }}><Ico d="M5 12h14" s={14} /></button>
      <span style={{ width: 40, textAlign: "center", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{n}/{of}</span>
      <button type="button" className="ic40" aria-label={`One more for ${label}`} onClick={() => set(n + 1)} disabled={n >= of} style={{ width: 34, height: 34, border: 0, cursor: "pointer", background: "var(--pc)", color: "var(--pi)", opacity: n >= of ? 0.3 : 1 }}><Ico d="M12 5v14M5 12h14" s={14} /></button>
      {of > 1 && n < of && <button type="button" onClick={() => set(of)} style={linkBtn}>All</button>}
    </div>
  );
}

function GuestsTab({ data, onTicket, onRsvp, onGuest, onUndo, onPass }: { data: DoorData; onTicket: (t: DTicket) => void; onRsvp: (id: string, n: number) => void; onGuest: (id: string, n: number) => void; onUndo: (code: string) => void; onPass: (t: DTicket) => void }) {
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"waiting" | "all" | "in">("waiting");
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const t of data.tickets) {
      if (t.void) continue;
      out.push({ k: "ticket", key: t.code, name: t.name || "Guest", sub: `${t.tier ?? "Ticket"} · ${t.code}${t.in_at ? ` · in ${timeIST(t.in_at)}` : ""}${t.out_at ? ` · out since ${timeIST(t.out_at)}` : ""}`, done: !!t.in_at, t });
    }
    for (const r of data.rsvps) out.push({ k: "rsvp", key: r.id, name: r.name, sub: `Guest list${r.party > 1 ? ` · party of ${r.party}` : ""}${r.in_count ? ` · ${r.in_count} in` : ""}`, done: r.in_count >= r.party, id: r.id, party: r.party, inCount: r.in_count });
    for (const w of data.walkins) out.push({ k: "walk", key: w.id, name: w.name, sub: `Walk-in${w.party > 1 ? ` · party of ${w.party}` : ""} · ${timeIST(w.at)}`, done: true });
    for (const g of data.guests ?? []) out.push({ k: "guest", key: g.code || g.id, name: g.name || "Guest", done: g.in_count >= g.party, g,
      sub: [sourceLabel(g.source), g.code, g.party > 1 ? `party of ${g.party}` : null, g.uploaded ? "added by the guest, check their ticket" : null, g.in_count ? `${g.in_count} in` : null].filter(Boolean).join(" · ") });
    const needle = q.trim().toLowerCase();
    return out
      .filter((r) => (show === "all" ? true : show === "in" ? r.done || (r.k === "rsvp" && r.inCount > 0) || (r.k === "guest" && r.g.in_count > 0) : !r.done))
      .filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.key.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, q, show]);

  return (
    <div>
      <h2 className="d" style={{ fontSize: 34, margin: 0 }}>Guests</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name or code" type="search" autoComplete="off" className="fld" style={{ marginTop: 12 }} aria-label="Search a name or code" />
      <div className="row" style={{ gap: 6, marginTop: 12 }}>
        {([["waiting", "Not in yet"], ["in", "In"], ["all", "Everyone"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setShow(k)} className={`pill lg${show === k ? " on" : ""}`}>{label}</button>
        ))}
        <span style={{ flex: 1 }} /><span className="m">{rows.length}</span>
      </div>
      <div style={{ marginTop: 8 }}>
        {rows.slice(0, 200).map((r) => (
          <div key={r.key} className="rw" style={{ padding: "11px 0", opacity: r.done ? 0.55 : 1 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 600, wordBreak: "break-word" }}>{r.name}</span>
              <span className="b" style={{ display: "block", fontSize: 12, wordBreak: "break-all" }}>{r.sub}</span>
            </span>
            {r.k === "ticket" && (r.done ? (
              <span className="row" style={{ gap: 4, flex: "none" }}>
                <button type="button" onClick={() => onPass(r.t)} className="pill" style={r.t.out_at ? inBtn : { border: 0, cursor: "pointer", height: 36 }}>{r.t.out_at ? "Back in" : "Out"}</button>
                <button type="button" onClick={() => onUndo(r.t.code)} style={linkBtn}>Undo</button>
              </span>
            ) : <button type="button" onClick={() => onTicket(r.t)} className="pill" style={inBtn}>Let in</button>)}
            {r.k === "rsvp" && <Counter label={r.name} n={r.inCount} of={r.party} set={(n) => onRsvp(r.id, n)} />}
            {r.k === "guest" && (
              <span className="row" style={{ gap: 4, flex: "none" }}>
                {r.g.proof && <button type="button" onClick={() => openProof(r.g.proof as string)} style={linkBtn}>Ticket</button>}
                {r.g.party > 1 ? <Counter label={r.name} n={r.g.in_count} of={r.g.party} set={(n) => onGuest(r.g.id, n)} />
                  : r.done ? <button type="button" onClick={() => onGuest(r.g.id, 0)} style={linkBtn}>Undo</button>
                  : <button type="button" onClick={() => onGuest(r.g.id, 1)} className="pill" style={inBtn}>Let in</button>}
              </span>
            )}
          </div>
        ))}
        {rows.length > 0 && <div className="hl" />}
      </div>
      {rows.length === 0 && <p className="b" style={{ marginTop: 14 }}>{q ? "Nobody by that name. Add them as a walk-in if you're letting them in." : "Nobody here."}</p>}
    </div>
  );
}

function WalkinTab({ data, slug, onAdd, onVoid }: { data: DoorData; slug: string; onAdd: (w: { id: string; name: string; party: number; amount: number; method: string; at: string; phone?: string }) => void; onVoid: (id: string) => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [party, setParty] = useState(1); const [amount, setAmount] = useState(""); const [method, setMethod] = useState("upi");
  const c = counts(data);
  // UPI at the door: a QR for the exact amount, opened by any UPI app. Only when the lead has set a UPI id.
  const amt = Math.max(0, parseInt(amount || "0", 10) || 0);
  const vpa = data.settings.upi_vpa;
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (method !== "upi" || !vpa || amt <= 0) { setQr(""); return; }
    QRCode.toDataURL(upiLink(vpa, data.settings.upi_name, amt, `${data.night.title} door`), { margin: 1, width: 480 }).then(setQr).catch(() => setQr(""));
  }, [method, vpa, amt, data.settings.upi_name, data.night.title]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ id: uid(), name: name.trim(), party, amount: method === "comp" ? 0 : Math.max(0, parseInt(amount || "0", 10) || 0), method, at: new Date().toISOString(), phone: phone.trim() || undefined });
    setName(""); setPhone(""); setParty(1); setAmount("");
  };
  return (
    <div>
      <h2 className="d" style={{ fontSize: 34, margin: 0 }}>Walk-in</h2>
      <form onSubmit={submit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required autoComplete="off" className="fld" style={{ marginTop: 12 }} aria-label="Name" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone, if they want updates" inputMode="tel" autoComplete="off" className="fld" style={{ marginTop: 10 }} aria-label="Phone" />
        <div className="rw" style={{ padding: "12px 0", marginTop: 6, borderTop: 0 }}>
          <span style={{ flex: 1, fontSize: 15 }}>People</span>
          <button type="button" className="ic40" onClick={() => setParty(Math.max(1, party - 1))} aria-label="One fewer" style={{ width: 40, height: 40, border: 0, color: "inherit", cursor: "pointer" }}><Ico d="M5 12h14" /></button>
          <span className="d" style={{ fontSize: 26, width: 36, textAlign: "center" }}>{party}</span>
          <button type="button" className="ic40" onClick={() => setParty(Math.min(20, party + 1))} aria-label="One more" style={{ width: 40, height: 40, border: 0, cursor: "pointer", background: "var(--pc)", color: "var(--pi)" }}><Ico d="M12 5v14M5 12h14" /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[["upi", "UPI"], ["cash", "Cash"], ["card", "Card"], ["comp", "Comp"]].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setMethod(k)} className={`kp${method === k ? " lit" : ""}`} style={{ height: 46, ["--c" as string]: "var(--pc)", border: 0, background: "none", cursor: "pointer", font: "inherit" }}>
              <span className="cp" style={{ alignItems: "center", justifyContent: "center" }}><span className="l" style={{ fontSize: 13 }}>{label}</span></span>
            </button>
          ))}
        </div>
        {method !== "comp" && <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Amount paid, ₹ in total" inputMode="numeric" className="fld" style={{ marginTop: 16 }} aria-label="Amount paid" />}
        {method === "upi" && amt > 0 && (qr ? (
          <div className="sf" style={{ marginTop: 12, padding: 12, borderRadius: 18, display: "flex", gap: 12, alignItems: "center" }}>
            <img src={qr} alt={`UPI QR for ₹${amt}`} style={{ width: 132, height: 132, borderRadius: 10, flex: "none", background: "#fff" }} />
            <p style={{ fontSize: 14, margin: 0 }}>Ask them to scan this with any UPI app. It pays <b>₹{amt.toLocaleString("en-IN")}</b> to {vpa}. Add them once you see it paid.</p>
          </div>
        ) : !vpa ? (
          <p className="b" style={{ fontSize: 13, marginTop: 10 }}>No UPI id set for this night, so there is no pay QR. {data.settings.lead ? <Link href={`/door/${slug}/setup`} style={{ textDecoration: "underline" }}>Add one in setup.</Link> : "The door lead can add one."}</p>
        ) : null)}
        <button className="key" style={{ width: "100%", marginTop: 18, border: 0, cursor: "pointer", font: "inherit", fontWeight: 600 }}>Add {party > 1 ? `${party} people` : "walk-in"}</button>
      </form>

      <div style={{ marginTop: 26 }}>
        <div className="row"><span className="m" style={{ flex: 1 }}>Door tonight</span><span className="m">{c.walkins} walk-in{c.walkins === 1 ? "" : "s"}{Object.keys(c.takings).length ? `, ${Object.entries(c.takings).map(([m, v]) => `${m.toUpperCase()} ₹${v.toLocaleString("en-IN")}`).join(", ")}` : ""}</span></div>
        {data.walkins.slice(0, 50).map((w) => (
          <div key={w.id} className="rw" style={{ padding: "11px 0" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 600, wordBreak: "break-word" }}>{w.name}{w.party > 1 ? ` +${w.party - 1}` : ""}</span>
              <span className="b" style={{ display: "block", fontSize: 12 }}>{timeIST(w.at)} · {w.method === "comp" ? "Comp" : `${w.method.toUpperCase()} ₹${w.amount.toLocaleString("en-IN")}`}</span>
            </span>
            <button type="button" onClick={() => onVoid(w.id)} style={linkBtn}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountTab({ data }: { data: DoorData }) {
  const c = counts(data);
  const a = arrivals(data);
  const max = Math.max(1, ...a.map((x) => x.n));
  const cap = data.night.capacity;
  const takings = Object.values(c.takings).reduce((s, v) => s + v, 0);
  const rows: [string, string | number, string?][] = [
    ["Tickets", `${c.ticketsIn} of ${c.tickets}`],
    ["Guest list", `${c.listIn} of ${c.list}`],
    ...(c.outside > 0 ? [["Outside tickets", `${c.outsideIn} of ${c.outside}`] as [string, string]] : []),
    ["Walk-ins", c.walkins],
    ...(c.out > 0 ? [["On a pass-out", c.out, "not counted inside"] as [string, number, string]] : []),
    ["Door takings", `₹${takings.toLocaleString("en-IN")}`],
  ];
  return (
    <div>
      <h2 className="d" style={{ fontSize: 34, margin: 0 }}>Count</h2>
      <div style={{ marginTop: 14 }}>
        <div className="gls">
          <div><div className="m">Inside</div><div className="v">{c.inside}</div></div>
          <div><div className="m">Not in yet</div><div className="v">{Math.max(0, c.expected - c.ticketsIn - c.listIn - c.outsideIn)}</div></div>
          <div><div className="m">Room left</div><div className="v">{cap ? Math.max(0, cap - c.inside) : "Open"}</div></div>
        </div>
      </div>
      <div className="row" style={{ marginTop: 22 }}><span className="m" style={{ flex: 1 }}>Arrivals every 15 minutes</span>{a.length > 0 && <span className="m">Peak {max}</span>}</div>
      {a.length === 0 ? <p className="b" style={{ marginTop: 10 }}>Nobody in yet.</p> : (
        <>
          <div className="row" style={{ alignItems: "flex-end", gap: 4, height: 120, marginTop: 14 }} role="img" aria-label={`Arrivals per 15 minutes, peak ${max}`}>
            {a.map((x) => <div key={x.t} title={`${timeIST(new Date(x.t).toISOString())}: ${x.n}`} style={{ flex: 1, minWidth: 0, height: `${Math.max(4, (x.n / max) * 100)}%`, borderRadius: 4, background: x.n === max ? "var(--pc)" : "rgba(255,255,255,.16)" }} />)}
          </div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}><span className="m">{timeIST(new Date(a[0].t).toISOString())}</span><span className="m">{timeIST(new Date(a[a.length - 1].t).toISOString())}</span></div>
        </>
      )}
      <div style={{ marginTop: 18 }}>
        {rows.map(([l, v, s]) => <div key={l} className="rw" style={{ padding: "12px 0" }}><span style={{ flex: 1, fontSize: 15 }}>{l}{s && <span className="b" style={{ display: "block", fontSize: 12 }}>{s}</span>}</span><span style={{ fontSize: 15, fontWeight: 600 }}>{v}</span></div>)}
        <div className="hl" />
      </div>
    </div>
  );
}
