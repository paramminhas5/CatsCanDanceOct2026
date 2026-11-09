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

type Tab = "scan" | "guests" | "walkin" | "count";

const good = (r: ScanResult) => r.kind === "admit" || r.kind === "back" || r.kind === "out";
const tone = (r: ScanResult) => (r.kind === "out" ? "bg-electric-blue text-cream" : good(r) ? "bg-acid-yellow text-ink" : r.kind === "already" || r.kind === "void" ? "bg-magenta text-cream" : "bg-orange text-ink");
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

  if (!data) {
    return (
      <div className="min-h-[100dvh] bg-ink text-cream grid place-items-center p-6 text-center">
        <div>
          <p className="font-display text-3xl">{err ? "Can't open the door" : "Loading the list…"}</p>
          {err && <p className="mt-3 text-cream/80">{err}</p>}
          <Link href="/door" className="inline-block mt-6 underline">All nights</Link>
        </div>
      </div>
    );
  }

  const c = counts(data);
  const cap = data.night.capacity ?? null;
  const pct = cap ? Math.min(100, Math.round((c.inside / cap) * 100)) : null;

  return (
    <div className="min-h-[100dvh] bg-ink text-cream flex flex-col">
      {/* Header: the number that matters, and whether this phone is in sync */}
      <header className="sticky top-0 z-20 bg-ink border-b-4 border-cream px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-3">
          <Link href="/door" className="min-w-0">
            <p className="text-xs text-cream/60 truncate">{device} · {data.night.venue ?? ""}</p>
            <p className="font-display text-lg leading-tight truncate">{data.night.title}</p>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <SyncPill online={online} waiting={queue.length} lastSync={lastSync} />
            <Link href={`/door/${slug}/${data.settings.lead ? "setup" : "report"}`} aria-label={data.settings.lead ? "Night setup" : "Door report"}
              className="text-xs font-bold px-2 py-1 border-2 border-cream">{data.settings.lead ? "Setup" : "Report"}</Link>
          </div>
        </div>
        <div className="mt-2 flex items-end gap-3">
          <p className="font-display text-5xl leading-none tabular-nums">{c.inside}</p>
          <p className="text-cream/70 pb-1">in{c.expected ? ` · ${c.expected} on the list` : ""}{cap ? ` · cap ${cap}` : ""}</p>
        </div>
        {(data.settings.age_check || data.settings.note) && (
          <p className="mt-2 text-sm font-bold text-acid-yellow">{[data.settings.age_check ? "Check ID for everyone" : null, data.settings.note].filter(Boolean).join(" · ")}</p>
        )}
        {pct !== null && (
          <div className="mt-2 h-2 bg-cream/15" aria-hidden>
            <div className={`h-2 ${pct >= 95 ? "bg-magenta" : pct >= 80 ? "bg-orange" : "bg-acid-yellow"}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-4 pb-28">
        {/* The scanner stays mounted so the camera keeps running between tabs; it only reads codes on the Scan tab. */}
        <div className={tab === "scan" ? "" : "hidden"}><ScanTab onScan={onScan} onCode={onCode} paused={!!result || tab !== "scan"} mode={mode} setMode={setMode} /></div>
        {tab === "guests" && <GuestsTab data={data} onTicket={admitTicket} onRsvp={(id, n) => act({ id: uid(), kind: "rsvp", at: now(), rsvp: id, count: n })}
          onGuest={(id, n) => act({ id: uid(), kind: "guest", at: now(), guest: id, count: n })}
          onUndo={(code) => act({ id: uid(), kind: "undo_ticket", at: now(), code })}
          onPass={(t) => { act({ id: uid(), kind: t.out_at ? "ticket" : "passout", at: now(), code: t.code }); setToast({ text: t.out_at ? `${t.name || "Guest"} is back in.` : `${t.name || "Guest"} is on a pass-out.` }); }} />}
        {tab === "walkin" && <WalkinTab data={data} slug={slug} onAdd={(w) => { act({ id: uid(), kind: "walkin", at: now(), walk: w }); setToast({ text: `${w.name}${w.party > 1 ? ` +${w.party - 1}` : ""} added.`, undo: () => act({ id: uid(), kind: "void_walkin", at: now(), walk: w.id }) }); }}
          onVoid={(id) => act({ id: uid(), kind: "void_walkin", at: now(), walk: id })} />}
        {tab === "count" && <CountTab data={data} />}
      </main>

      {/* Scan result: the whole screen, readable from arm's length */}
      {result && (
        <button type="button" onClick={() => setResult(null)} className={`fixed inset-0 z-40 ${tone(result)} flex flex-col items-center justify-center p-6 text-center`}>
          <p className="font-display text-5xl sm:text-7xl leading-none">{headline(result)}</p>
          {"name" in result && <p className="font-display text-3xl sm:text-5xl mt-6 break-words max-w-full">{result.name}</p>}
          {"tier" in result && result.tier && <p className="text-xl mt-2 opacity-80">{result.tier}</p>}
          {(result.kind === "admit" || result.kind === "back") && data.settings.age_check && <p className="mt-5 font-display text-2xl px-4 py-2 border-4 border-ink bg-cream">Check ID</p>}
          {result.kind === "out" && <p className="text-xl mt-4">They keep their place. Scan them again on the way back in.</p>}
          {result.kind === "back" && <p className="text-xl mt-4">Back from a pass-out.</p>}
          {result.kind === "already_out" && <p className="text-xl mt-4">Already on a pass-out. Switch to In to let them back.</p>}
          {result.kind === "not_in" && <p className="text-xl mt-4">This ticket was never checked in. Switch to In.</p>}
          {result.kind === "already" && <p className="text-xl mt-4">Checked in at {timeIST(result.at)}. Ask for another ticket or check by name.</p>}
          {result.kind === "void" && <p className="text-xl mt-4">This ticket was refunded or cancelled.</p>}
          {result.kind === "wrong_night" && <p className="text-xl mt-4">This ticket is for {result.event}.</p>}
          {result.kind === "check_name" && <p className="text-xl mt-4">{online ? "No ticket with this code." : "Offline, and this code is not on the saved list."} Search their name in Guests.</p>}
          {result.kind === "not_found" && <p className="text-xl mt-4">No ticket with this code. Search their name in Guests.</p>}
          <p className="mt-8 font-mono text-sm opacity-60">{result.code}</p>
          <p className="mt-2 text-sm opacity-60">Tap to scan the next one</p>
        </button>
      )}

      {toast && (
        <div className="fixed left-3 right-3 bottom-24 z-30 bg-cream text-ink border-4 border-ink shadow-[4px_4px_0_0_hsl(var(--acid-yellow))] p-3 flex items-center gap-3">
          <p className="flex-1 text-sm font-bold">{toast.text}</p>
          {toast.undo && <button type="button" className="font-display px-3 py-2 border-4 border-ink bg-acid-yellow" onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>}
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-ink border-t-4 border-cream grid grid-cols-4" aria-label="Door">
        {([["scan", "Scan"], ["guests", "Guests"], ["walkin", "Walk-in"], ["count", "Count"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined}
            className={`font-display py-4 text-base border-r-4 last:border-r-0 border-cream ${tab === k ? "bg-acid-yellow text-ink" : "text-cream"}`}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function SyncPill({ online, waiting, lastSync }: { online: boolean; waiting: number; lastSync: number }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(t); }, []);
  const ago = lastSync ? Math.round((Date.now() - lastSync) / 60000) : null;
  const label = !online ? `Offline${waiting ? ` · ${waiting} to send` : ""}` : waiting ? `Sending ${waiting}` : ago === null ? "Connecting" : ago < 1 ? "Up to date" : `Synced ${ago}m ago`;
  const cls = !online ? "bg-magenta text-cream" : waiting ? "bg-orange text-ink" : "bg-cream text-ink";
  return <span className={`shrink-0 text-xs font-bold px-2 py-1 border-2 border-cream ${cls}`} role="status">{label}</span>;
}

function ScanTab({ onScan, onCode, paused, mode, setMode }: { onScan: (c: string) => void; onCode: (c: string) => void; paused: boolean; mode: "in" | "out"; setMode: (m: "in" | "out") => void }) {
  const [code, setCode] = useState("");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 border-4 border-cream" role="group" aria-label="Scan mode">
        <button type="button" onClick={() => setMode("in")} aria-pressed={mode === "in"} className={`font-display py-3 ${mode === "in" ? "bg-acid-yellow text-ink" : ""}`}>In</button>
        <button type="button" onClick={() => setMode("out")} aria-pressed={mode === "out"} className={`font-display py-3 border-l-4 border-cream ${mode === "out" ? "bg-electric-blue text-cream" : ""}`}>Out (pass-out)</button>
      </div>
      <Scanner onCode={onScan} paused={paused} />
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) { onCode(code); setCode(""); } }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ticket code"
          autoCapitalize="characters" autoCorrect="off" spellCheck={false} inputMode="text"
          className="flex-1 min-w-0 bg-cream text-ink border-4 border-cream p-3 font-mono uppercase text-lg" />
        <button className="font-display px-5 bg-acid-yellow text-ink border-4 border-cream">Check</button>
      </form>
      <p className="text-sm text-cream/60">{mode === "in" ? "Green: let them in. Red: already in or refunded. Orange: wrong night or not on the list, so check their name." : "Scanning people out. They keep their place and come back in with one scan on In."}</p>
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

function Counter({ label, n, of, set }: { label: string; n: number; of: number; set: (n: number) => void }) {
  return (
    <div className="shrink-0 flex items-center gap-1">
      <button type="button" aria-label={`One fewer for ${label}`} onClick={() => set(n - 1)} disabled={n === 0}
        className="w-11 h-11 border-4 border-cream font-display text-xl disabled:opacity-30">−</button>
      <span className="w-12 text-center font-display tabular-nums">{n}/{of}</span>
      <button type="button" aria-label={`One more for ${label}`} onClick={() => set(n + 1)} disabled={n >= of}
        className="w-11 h-11 border-4 border-ink bg-acid-yellow text-ink font-display text-xl disabled:opacity-30">+</button>
      {of > 1 && n < of && <button type="button" onClick={() => set(of)} className="ml-1 text-sm underline min-h-[44px] px-1">All</button>}
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
    for (const r of data.rsvps) out.push({ k: "rsvp", key: r.id, name: r.name, sub: `List${r.party > 1 ? ` · party of ${r.party}` : ""}${r.in_count ? ` · ${r.in_count} in` : ""}`, done: r.in_count >= r.party, id: r.id, party: r.party, inCount: r.in_count });
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
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name or code" type="search" autoComplete="off"
        className="w-full bg-cream text-ink border-4 border-cream p-3 text-lg" />
      <div className="flex gap-2">
        {([["waiting", "Not in yet"], ["in", "In"], ["all", "Everyone"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setShow(k)} className={`font-display text-sm px-3 py-2 border-4 border-cream ${show === k ? "bg-acid-yellow text-ink" : ""}`}>{label}</button>
        ))}
      </div>
      <p className="text-sm text-cream/60">{rows.length} {rows.length === 1 ? "person" : "people"}</p>
      <ul className="space-y-2">
        {rows.slice(0, 200).map((r) => (
          <li key={r.key} className={`border-4 ${r.done ? "border-cream/30 text-cream/60" : "border-cream"} p-3 flex items-center gap-3`}>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-tight break-words">{r.name}</p>
              <p className="text-xs text-cream/60 mt-0.5 break-all">{r.sub}</p>
            </div>
            {r.k === "ticket" && (r.done ? (
              <div className="shrink-0 flex items-center gap-1">
                <button type="button" onClick={() => onPass(r.t)} className={`font-display text-sm px-3 py-2 border-4 ${r.t.out_at ? "border-ink bg-acid-yellow text-ink" : "border-cream text-cream"}`}>{r.t.out_at ? "Back in" : "Out"}</button>
                <button type="button" onClick={() => onUndo(r.t.code)} className="text-sm underline min-h-[44px] px-2">Undo</button>
              </div>
            ) : <button type="button" onClick={() => onTicket(r.t)} className="shrink-0 font-display px-4 py-3 bg-acid-yellow text-ink border-4 border-ink">In</button>)}
            {r.k === "rsvp" && <Counter label={r.name} n={r.inCount} of={r.party} set={(n) => onRsvp(r.id, n)} />}
            {r.k === "guest" && (
              <div className="shrink-0 flex items-center gap-1">
                {r.g.proof && <button type="button" onClick={() => openProof(r.g.proof as string)} className="text-sm underline min-h-[44px] px-1">Ticket</button>}
                {r.g.party > 1 ? <Counter label={r.name} n={r.g.in_count} of={r.g.party} set={(n) => onGuest(r.g.id, n)} />
                  : r.done ? <button type="button" onClick={() => onGuest(r.g.id, 0)} className="text-sm underline min-h-[44px] px-2">Undo</button>
                  : <button type="button" onClick={() => onGuest(r.g.id, 1)} className="font-display px-4 py-3 bg-acid-yellow text-ink border-4 border-ink">In</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="text-cream/70">{q ? "Nobody by that name. Add them as a walk-in if you're letting them in." : "Nobody here."}</p>}
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
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required autoComplete="off" className="w-full bg-cream text-ink border-4 border-cream p-3 text-lg" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" inputMode="tel" autoComplete="off" className="w-full bg-cream text-ink border-4 border-cream p-3" />
        <div className="flex items-center gap-3">
          <span className="text-sm text-cream/70 w-16">People</span>
          <button type="button" onClick={() => setParty(Math.max(1, party - 1))} className="w-12 h-12 border-4 border-cream font-display text-xl" aria-label="One fewer">−</button>
          <span className="font-display text-2xl w-8 text-center tabular-nums">{party}</span>
          <button type="button" onClick={() => setParty(Math.min(20, party + 1))} className="w-12 h-12 border-4 border-ink bg-acid-yellow text-ink font-display text-xl" aria-label="One more">+</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[["upi", "UPI"], ["cash", "Cash"], ["card", "Card"], ["comp", "Comp"]].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setMethod(k)} className={`font-display px-4 py-3 border-4 border-cream ${method === k ? "bg-acid-yellow text-ink" : ""}`}>{label}</button>
          ))}
        </div>
        {method !== "comp" && (
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Amount paid, ₹ (total)" inputMode="numeric" className="w-full bg-cream text-ink border-4 border-cream p-3 text-lg" />
        )}
        {method === "upi" && amt > 0 && (qr ? (
          <div className="bg-cream text-ink border-4 border-cream p-3 flex items-center gap-3">
            <img src={qr} alt={`UPI QR for ₹${amt}`} className="w-36 h-36 shrink-0" />
            <p className="text-sm">Ask them to scan this with any UPI app. It pays <b>₹{amt.toLocaleString("en-IN")}</b> to {vpa}. Add them once you see it paid.</p>
          </div>
        ) : !vpa ? (
          <p className="text-xs text-cream/60">No UPI id set for this night, so there is no pay QR. {data.settings.lead ? <Link href={`/door/${slug}/setup`} className="underline">Add one in setup.</Link> : "The door lead can add one."}</p>
        ) : null)}
        <button className="w-full font-display text-xl py-4 bg-acid-yellow text-ink border-4 border-ink">Add {party > 1 ? `${party} people` : "walk-in"}</button>
      </form>

      <div>
        <p className="font-display text-lg">Door tonight</p>
        <p className="text-cream/70 text-sm">{c.walkins} walk-in{c.walkins === 1 ? "" : "s"}{Object.keys(c.takings).length ? ` · ${Object.entries(c.takings).map(([m, v]) => `${m.toUpperCase()} ₹${v.toLocaleString("en-IN")}`).join(" · ")}` : ""}</p>
        <ul className="mt-2 space-y-2">
          {data.walkins.slice(0, 50).map((w) => (
            <li key={w.id} className="border-4 border-cream/40 p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold break-words">{w.name}{w.party > 1 ? ` +${w.party - 1}` : ""}</p>
                <p className="text-xs text-cream/60">{timeIST(w.at)} · {w.method === "comp" ? "Comp" : `${w.method.toUpperCase()} ₹${w.amount.toLocaleString("en-IN")}`}</p>
              </div>
              <button type="button" onClick={() => onVoid(w.id)} className="text-sm underline min-h-[44px] px-2">Remove</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CountTab({ data }: { data: DoorData }) {
  const c = counts(data);
  const a = arrivals(data);
  const max = Math.max(1, ...a.map((x) => x.n));
  const cap = data.night.capacity;
  const stat = (label: string, v: string | number, sub?: string) => (
    <div className="border-4 border-cream p-3">
      <p className="text-xs text-cream/60 uppercase tracking-wide">{label}</p>
      <p className="font-display text-3xl tabular-nums leading-tight">{v}</p>
      {sub && <p className="text-xs text-cream/60">{sub}</p>}
    </div>
  );
  const takings = Object.values(c.takings).reduce((s, v) => s + v, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {stat("Inside", c.inside, cap ? `${Math.max(0, cap - c.inside)} spaces left` : undefined)}
        {stat("Not in yet", Math.max(0, c.expected - c.ticketsIn - c.listIn - c.outsideIn), `of ${c.expected} on the list`)}
        {stat("Tickets", `${c.ticketsIn}/${c.tickets}`)}
        {stat("Free list", `${c.listIn}/${c.list}`)}
        {c.outside > 0 && stat("Outside tickets", `${c.outsideIn}/${c.outside}`, "District, BookMyShow and other lists")}
        {stat("Walk-ins", c.walkins)}
        {c.out > 0 && stat("On a pass-out", c.out, "not counted inside")}
        {stat("Door takings", `₹${takings.toLocaleString("en-IN")}`)}
      </div>
      <div>
        <p className="font-display text-lg">Arrivals every 15 minutes</p>
        {a.length === 0 ? <p className="text-cream/70 text-sm">Nobody in yet.</p> : (
          <div className="mt-2 flex items-end gap-1 h-32 border-b-4 border-cream" role="img" aria-label={`Arrivals per 15 minutes, peak ${max}`}>
            {a.map((x) => (
              <div key={x.t} className="flex-1 h-full flex flex-col items-center justify-end min-w-0" title={`${timeIST(new Date(x.t).toISOString())}: ${x.n}`}>
                <div className="w-full bg-acid-yellow" style={{ height: `${(x.n / max) * 100}%` }} />
              </div>
            ))}
          </div>
        )}
        {a.length > 0 && (
          <div className="flex justify-between text-xs text-cream/60 mt-1">
            <span>{timeIST(new Date(a[0].t).toISOString())}</span>
            <span>{timeIST(new Date(a[a.length - 1].t).toISOString())}</span>
          </div>
        )}
      </div>
    </div>
  );
}
