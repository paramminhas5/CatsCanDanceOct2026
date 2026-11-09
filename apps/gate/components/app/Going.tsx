"use client";
/**
 * The invite's actions (board H39-Invite): "Going" opens a sheet for name, email and plus ones and calls
 * rsvp (throttled, honours the capacity, waitlists when full). Share uses the phone's share sheet.
 */
import { useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Icon } from "./ui";

export function ShareButton({ title, dark }: { title: string; dark?: boolean }) {
  const [ok, setOk] = useState(false);
  const share = async () => {
    const url = window.location.href.split("?")[0];
    try { if (navigator.share) { await navigator.share({ title, url }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(url); setOk(true); setTimeout(() => setOk(false), 1600); } catch { /* nothing to do */ }
  };
  return (
    <button type="button" onClick={share} className="ic40" aria-label={ok ? "Link copied" : "Share the invite"} style={{ background: dark ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.18)", color: "inherit", boxShadow: "none", border: 0, cursor: "pointer" }}>
      {ok ? <Icon i="check" /> : <Icon i="share" />}
    </button>
  );
}

export default function Going({ slug, look, ink }: { slug: string; look: string; ink: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("busy"); setErr(null);
    const { data, error } = await supabase().rpc("rsvp", { p_event_slug: slug, p_name: String(fd.get("name") ?? "").trim(), p_email: String(fd.get("email") ?? "").trim(), p_plus_ones: Number(fd.get("plus") ?? 0) });
    if (error) { setErr(error.message.replace(/^.*?:\s*/, "")); setState("idle"); return; }
    const d = (data ?? {}) as { already?: boolean; waitlist?: boolean };
    setNote(d.waitlist ? "It is full right now. You are on the waitlist and hear first if a spot opens." : d.already ? "You were already on the list. Give your name at the door." : "You are on the list. Give your name at the door.");
    setState("done");
  };
  const keyStyle = { ["--pc" as string]: look, ["--pi" as string]: ink, ["--pg" as string]: `color-mix(in srgb, ${look} 50%, transparent)`, ["--pd" as string]: `color-mix(in srgb, ${look} 80%, #000)`, ["--pdd" as string]: `color-mix(in srgb, ${look} 62%, #000)` };
  return (
    <>
      {state === "done" ? (
        <div className="sf rise" role="status" style={{ padding: "14px 16px", borderRadius: 18, display: "flex", gap: 12, alignItems: "center" }}>
          <span className="host-tick on" style={{ background: look, color: ink }}><Icon i="check" size={12} stroke={3} /></span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{note}</span>
        </div>
      ) : (
        <button type="button" className="key" style={{ ...keyStyle, width: "100%" }} onClick={() => setOpen(true)}>I am going</button>
      )}
      {open && state !== "done" && (
        <div className="host-sheet" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Say you are going">
            <form onSubmit={submit}>
              <div className="d" style={{ fontSize: 28 }}>Say you are going</div>
              <label style={{ display: "block", marginTop: 14 }}><span className="m">Name</span><input className="fld" name="name" required maxLength={80} autoComplete="name" autoFocus /></label>
              <label style={{ display: "block", marginTop: 12 }}><span className="m">Email</span><input className="fld" type="email" name="email" required autoComplete="email" /></label>
              <label style={{ display: "block", marginTop: 12 }}><span className="m">Bringing</span>
                <select className="fld" name="plus" defaultValue="0"><option value="0">Just me</option><option value="1">Me and one more</option><option value="2">Me and two more</option></select>
              </label>
              {err && <p className="err" role="alert">{err}</p>}
              <div className="brow" style={{ marginTop: 18 }}>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setOpen(false)}>Not now</button>
                <button className="key" style={{ ...keyStyle, flex: 1.4 }} disabled={state === "busy"}>{state === "busy" ? "Saving" : "I am going"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
