"use client";
/**
 * Fan notes for the artist who owns the page (migration 066): say yes, pin up to three, or hide.
 * Reads fan_notes_review, writes fan_note_set. Lives on Your fans in the artist app.
 */
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";

type N = { id: string; name: string; body: string; about: string | null; status: "pending" | "approved"; pinned: boolean; at: string };
type R = { ok: boolean; error?: string; slug?: string; notes?: N[] };

async function fetchNotes(): Promise<R> {
  const { data, error } = await supabaseBrowser().rpc("fan_notes_review", {});
  return error ? { ok: false, error: error.message } : ((data as R) ?? { ok: false });
}

export default function MeNotes() {
  const [r, setR] = useState<R | null>(null);
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetchNotes().then((x) => live && setR(x), () => {});
    return () => { live = false; };
  }, [tick]);

  const set = async (id: string, status: "approved" | "hidden", pinned?: boolean) => {
    setMsg(null);
    const { data } = await supabaseBrowser().rpc("fan_note_set", { p_id: id, p_status: status, p_pinned: pinned ?? null });
    const d = data as { ok: boolean; error?: string } | null;
    if (!d?.ok) setMsg(d?.error ?? "Could not save.");
    setTick((t) => t + 1);
  };

  if (!r?.ok) return null;
  const notes = r.notes ?? [];
  const waiting = notes.filter((n) => n.status === "pending");
  const shown = notes.filter((n) => n.status === "approved");
  return (
    <>
      <div className="row" style={{ marginTop: 28 }}><span className="d" style={{ fontSize: 22, flex: 1 }}>Notes from fans</span>{waiting.length > 0 && <span className="pill">{waiting.length} waiting</span>}</div>
      <div className="b" style={{ fontSize: 13, marginTop: 4 }}>A note shows on your page once you say yes. Pin up to three.</div>
      {notes.length === 0 && <div className="sf rise" style={{ marginTop: 12, borderRadius: 18, padding: "14px 16px" }}><b style={{ fontSize: 15 }}>No notes yet</b><div className="b" style={{ fontSize: 13, marginTop: 2 }}>Fans leave them under Fans on your page.</div></div>}
      {[...waiting, ...shown].map((n) => (
        <div key={n.id} className="sf rise" style={{ marginTop: 10, borderRadius: 18, padding: "14px 16px" }}>
          <div className="row" style={{ gap: 8 }}><b style={{ fontSize: 14, flex: 1 }}>{n.name}{n.about ? <span className="b" style={{ fontWeight: 400 }}> · {n.about}</span> : null}</b>{n.status === "approved" && <span className="pill">{n.pinned ? "Pinned" : "On your page"}</span>}</div>
          <div style={{ fontSize: 16, marginTop: 6, lineHeight: 1.4 }}>{n.body}</div>
          <div className="brow" style={{ marginTop: 12 }}>
            {n.status === "pending" ? <button type="button" className="key sm" onClick={() => set(n.id, "approved")}>Show it</button> : <button type="button" className="btn sm" onClick={() => set(n.id, "approved", !n.pinned)}>{n.pinned ? "Unpin" : "Pin"}</button>}
            <button type="button" className="btn sm" onClick={() => set(n.id, "hidden")}>Hide</button>
          </div>
        </div>
      ))}
      {msg && <div className="b" role="alert" style={{ fontSize: 13, marginTop: 8 }}>{msg}</div>}
    </>
  );
}
