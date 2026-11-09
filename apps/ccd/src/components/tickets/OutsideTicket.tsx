/**
 * "Bought your ticket somewhere else? Add it." On a night page, for nights that sell through another platform.
 * The guest adds the booking code (and a screenshot if they like) before the night, so their name is on the door list (migration 060).
 * If the promoter already imported that platform's list, the code matches and they are confirmed straight away.
 * The scanning side lives in Gate (apps/gate); this is the guest side and stays with the night page.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { memberRpc, useMember } from "@/lib/member";
import { sendSignInLink } from "@/lib/plans";

/** Ticket platforms a guest can name. Same keys as Gate's import (door_guests.source). */
const SOURCES: Record<string, string> = { district: "District", bookmyshow: "BookMyShow", skillbox: "Skillbox", insider: "Insider", highape: "HighApe", ra: "RA", other: "Outside ticket" };
const sourceLabel = (s: string) => SOURCES[s] ?? "Outside ticket";

type Mine = { source: string; code: string | null; party: number; proof: boolean; matched: boolean; in: boolean } | null;

export default function OutsideTicket({ slug, title, dark = false }: { slug: string; title: string; dark?: boolean }) {
  const { signedIn, member, loading } = useMember();
  const [mine, setMine] = useState<Mine>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ source: "district", code: "", party: 1 });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");

  const load = () => memberRpc<Mine>("my_outside_ticket", { p_slug: slug }).then((r) => { if (r.ok) setMine((r.data as any) ?? null); });
  useEffect(() => { if (signedIn) load(); }, [signedIn, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const box = dark ? "border-4 border-cream p-4" : "border-4 border-ink bg-white p-4";
  const input = "w-full border-4 border-ink bg-white text-ink p-2.5";

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setBusy(true);
    try {
      let path: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("That file is over 5 MB.");
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        path = `door/${slug}/${member?.id}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("ticket-proofs").upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw new Error("Could not upload the screenshot. Add the booking code instead.");
      }
      const r = await memberRpc<{ matched: boolean }>("guest_add_ticket", { p_slug: slug, p_source: f.source, p_code: f.code || null, p_party: f.party, p_path: path });
      if (!r.ok) throw new Error(r.error ?? "Could not save.");
      setOpen(false); setFile(null); await load();
    } catch (err: any) { setMsg(err.message); }
    setBusy(false);
  };

  if (loading) return null;

  if (mine) {
    return (
      <div className={box}>
        <p className="font-display text-xl leading-tight">{mine.in ? "You're in." : "Your ticket is on the door list."}</p>
        <p className="text-sm mt-1">{sourceLabel(mine.source)}{mine.code ? ` · ${mine.code}` : ""}{mine.party > 1 ? ` · ${mine.party} people` : ""}</p>
        <p className="text-sm mt-1 opacity-75">{mine.matched ? "Matched to the promoter's list. Show your QR at the door." : "The door has your name and booking. Show your ticket when you arrive."}</p>
        {!mine.in && <button type="button" onClick={() => { setF({ source: mine.source, code: mine.code ?? "", party: mine.party }); setMine(null); setOpen(true); }} className="mt-2 text-sm underline">Change it</button>}
      </div>
    );
  }

  return (
    <div className={box}>
      <p className="font-display text-xl leading-tight">Bought your ticket somewhere else?</p>
      <p className="text-sm mt-1">Add it before the night and your name is on the door list for {title}. Quicker at the door, and no "you're not on the list".</p>
      {!signedIn && msg && <p className="text-sm font-bold mt-2">{msg}</p>}
      {!signedIn ? (
        <form className="mt-3 flex gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await sendSignInLink(email.trim(), window.location.pathname); setMsg(r.ok ? "Link sent. Open it on this phone, then add your ticket." : r.error ?? "Could not send the link."); }}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="flex-1 min-w-0 border-4 border-ink bg-white text-ink p-2" autoCapitalize="none" />
          <button className="font-display px-3 border-4 border-ink bg-acid-yellow text-ink">Sign in</button>
        </form>
      ) : !open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 font-display px-4 py-2 border-4 border-ink bg-acid-yellow text-ink">Add my ticket</button>
      ) : (
        <form onSubmit={save} className="mt-3 space-y-2 text-ink">
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(SOURCES).map((k) => (
              <button key={k} type="button" onClick={() => setF({ ...f, source: k })} className={`text-sm font-bold px-2.5 py-1.5 border-2 border-ink ${f.source === k ? "bg-acid-yellow" : "bg-white"}`}>{k === "other" ? "Other" : SOURCES[k]}</button>
            ))}
          </div>
          <input className={input} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="Booking ID (from the ticket email or app)" maxLength={80} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          <label className={`flex items-center gap-2 text-sm ${dark ? "text-cream" : ""}`}>People on this booking
            <input type="number" min={1} max={10} value={f.party} onChange={(e) => setF({ ...f, party: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} className="w-16 border-2 border-ink bg-white text-ink p-1" />
          </label>
          <label className={`block text-sm ${dark ? "text-cream" : ""}`}>Screenshot of the ticket (optional)
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block mt-1 text-sm" />
          </label>
          <p className={`text-xs ${dark ? "text-cream/70" : "text-ink/65"}`}>Only the door team for this night sees it.</p>
          <button disabled={busy || (!f.code.trim() && !file)} className="font-display px-4 py-2 border-4 border-ink bg-acid-yellow disabled:opacity-40">{busy ? "Saving…" : "Add to the door list"}</button>
          {msg && <p className="text-sm font-bold text-magenta">{msg}</p>}
        </form>
      )}
    </div>
  );
}
