"use client";
/**
 * Gear for a party (board H39-Gear). There is no gear stock in the database yet, so this stays an honest
 * request: pick what you need with the steppers, and it goes to the CCD inbox through submit_contact.
 * We reply with what is free and the price for the night. No prices are shown until they are real.
 */
import { useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Icon } from "@/components/app/ui";

const KIT: { key: string; title: string; sub: string; glyph: React.ReactNode }[] = [
  { key: "Decks", title: "Decks", sub: "Two CDJs and a mixer", glyph: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="8" cy="12" r="2.6" /><circle cx="16" cy="12" r="2.6" /></> },
  { key: "Controller", title: "Controller", sub: "For a laptop set", glyph: <><rect x="3" y="7" width="18" height="10" rx="2" /><path d="M7 11h2M15 11h2M11 14h2" /></> },
  { key: "Sound", title: "Sound", sub: "Two tops and a sub", glyph: <><rect x="6" y="3" width="12" height="18" rx="2" /><circle cx="12" cy="14" r="3" /><circle cx="12" cy="7.5" r="1.2" /></> },
  { key: "Lights", title: "Lights", sub: "Washes and a strobe", glyph: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" /></> },
  { key: "Smoke", title: "Smoke", sub: "One machine, fluid in", glyph: <><path d="M4 15h11a3 3 0 1 0-3-3" /><path d="M4 19h14a2.5 2.5 0 1 0-2.5-2.5" /></> },
  { key: "VJ screen", title: "Screen or projector", sub: "For a VJ", glyph: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></> },
];

export default function GearForm({ night, title, date, city }: { night: string; title?: string; date?: string; city?: string }) {
  const [n, setN] = useState<Record<string, number>>({});
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, d: number) => setN((x) => ({ ...x, [k]: Math.max(0, Math.min(9, (x[k] ?? 0) + d)) }));
  const picked = Object.entries(n).filter(([, v]) => v > 0);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (String(fd.get("website") ?? "")) { setState("done"); return; }
    if (!picked.length) { setErr("Pick at least one thing."); return; }
    const lines = [`Gear request${night ? ` for ${night}` : ""}${title ? ` (${title})` : ""}`, `Date: ${fd.get("date") || "not set"}`, `City: ${fd.get("city") || "not set"}`, `Kit: ${picked.map(([k, v]) => `${v} x ${k}`).join(", ")}`, `Notes: ${fd.get("notes") || ""}`];
    setState("busy"); setErr(null);
    const { error } = await supabase().rpc("submit_contact", { p_name: String(fd.get("name") ?? ""), p_email: String(fd.get("email") ?? ""), p_message: lines.join("\n") });
    if (error) { setErr(error.message.replace(/^.*?:\s*/, "")); setState("idle"); return; }
    setState("done");
  };
  if (state === "done") return (
    <div style={{ padding: "8px 20px 0" }} role="status">
      <div className="rise" style={{ borderRadius: 22, background: "var(--pc)", color: "var(--pi)", padding: "22px 18px", position: "relative", overflow: "hidden" }}>
        <img src="/cats/dj.webp" alt="" style={{ position: "absolute", right: -4, bottom: -8, height: 120, animation: "bob 3s ease-in-out infinite" }} />
        <div className="d" style={{ fontSize: 34, color: "var(--pi)" }}>Got it.</div>
        <div style={{ fontSize: 14, opacity: 0.75, marginTop: 6, maxWidth: 220 }}>We reply with what is free and the price for the night, usually within a day.</div>
      </div>
    </div>
  );
  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div style={{ padding: "8px 20px 0" }}>
        {KIT.map((k) => (
          <div key={k.key} className="rw rise" style={{ padding: "12px 0", gap: 12 }}>
            <span style={{ width: 64, height: 52, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: "linear-gradient(180deg,#2A2B31,#16171B)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.1)", color: (n[k.key] ?? 0) > 0 ? "var(--pc)" : "var(--t2)", transition: "color .2s" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{k.glyph}</svg>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{k.title}</span><span className="b" style={{ display: "block", fontSize: 13 }}>{k.sub}</span></span>
            <span className="row" style={{ gap: 8 }}>
              <button type="button" className="ic40" aria-label={`One less ${k.title}`} onClick={() => set(k.key, -1)} style={{ width: 32, height: 32, border: 0, cursor: "pointer", color: "inherit" }}><Icon i="minus" size={14} /></button>
              <span style={{ width: 16, textAlign: "center", fontWeight: 700 }} aria-live="polite">{n[k.key] ?? 0}</span>
              <button type="button" className="ic40" aria-label={`One more ${k.title}`} onClick={() => set(k.key, 1)} style={{ width: 32, height: 32, border: 0, cursor: "pointer", color: "inherit" }}><Icon i="plus" size={14} /></button>
            </span>
          </div>
        ))}
        <div className="hl" />
        <div className="row" style={{ gap: 10 }}>
          <label style={{ display: "block", marginTop: 14, flex: 1 }}><span className="m">Date</span><input className="fld" type="date" name="date" defaultValue={date} /></label>
          <label style={{ display: "block", marginTop: 14, width: 140 }}><span className="m">City</span><input className="fld" name="city" maxLength={60} defaultValue={city} /></label>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <label style={{ display: "block", marginTop: 12, flex: 1 }}><span className="m">Your name</span><input className="fld" name="name" required maxLength={80} autoComplete="name" /></label>
          <label style={{ display: "block", marginTop: 12, flex: 1.2 }}><span className="m">Email</span><input className="fld" type="email" name="email" required autoComplete="email" /></label>
        </div>
        <label style={{ display: "block", marginTop: 12 }}><span className="m">Anything else</span><textarea className="fld" name="notes" maxLength={800} placeholder="Room size, stairs, set up time" /></label>
        {err && <p className="err" role="alert">{err}</p>}
      </div>
      <div style={{ flex: 1, minHeight: 20 }} />
      <div style={{ padding: "16px 20px 0" }}>
        <button className="key" disabled={state === "busy"} style={{ width: "100%" }}>{state === "busy" ? "Sending" : picked.length ? `Ask for ${picked.reduce((a, [, v]) => a + v, 0)} ${picked.reduce((a, [, v]) => a + v, 0) === 1 ? "thing" : "things"}` : "Ask for gear"}</button>
        <div className="b" style={{ textAlign: "center", fontSize: 12, marginTop: 10 }}>Delivered, set up and collected. We confirm the price first.</div>
      </div>
    </form>
  );
}
