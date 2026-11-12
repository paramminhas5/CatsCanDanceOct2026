"use client";
/**
 * Put a tour up (board F38-A-Tour): the route as city stubs, then Publish. Goes through submit_tour
 * (anon SECURITY DEFINER, honeypot and throttle); CCD reviews each post before it shows on /tour.
 */
import Link from "next/link";
import { useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";
import { TOUR_CITIES } from "@/lib/tour";

type Stop = { city: string; from: string; to: string; state: "playing" | "open" };
const blank = (): Stop => ({ city: "", from: "", to: "", state: "playing" });

export default function TourPost({ act, email, instagram }: { act: string; email: string; instagram: string }) {
  const [stops, setStops] = useState<Stop[]>([blank()]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (i: number, k: keyof Stop, v: string) => setStops((s) => s.map((x, j) => (j === i ? { ...x, [k]: v, ...(k === "from" && !x.to ? { to: v } : {}) } : x)));
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim() || null;
    setBusy(true); setErr(null);
    const { data, error } = await supabaseBrowser().rpc("submit_tour", {
      p_kind: "away", p_act_name: v("act"), p_home_city: v("home"), p_home_country: "India", p_instagram: v("instagram"), p_ra: null, p_spotify: null,
      p_email: v("email"), p_note: v("note"), p_stops: stops.filter((s) => s.city && s.from), p_company: v("company"),
    });
    setBusy(false);
    const d = data as { ok?: boolean; error?: string } | null;
    if (error || d?.ok === false) { setErr(d?.error ?? error?.message ?? "Could not post. Try again."); return; }
    setDone(true);
  };
  if (done) {
    return (
      <div className="k-surface grid justify-items-start gap-3 rounded-[22px] p-6" role="status">
        <span className="k-m" style={{ color: "var(--k-pc)" }}>Sent for review</span>
        <h2 className="k-d m-0 text-[36px]">Your tour is in.</h2>
        <p className="k-b m-0">We check it, usually the same day. Then it shows on On tour, and fans in each city hear first.</p>
        <Link className="k-btn k-btn--ghost" href="/tour">See On tour</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-6">
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden"><label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
      <ol className="m-0 grid list-none gap-3 p-0">
        {stops.map((s, i) => (
          <li key={i} className="k-paper grid items-end gap-3 rounded-[16px] p-4 text-[#141414] md:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
            <label className="k-label !text-[#141414]">City
              <input className="k-field !bg-white/60 !text-[#141414]" list="tour-cities" value={s.city} onChange={(e) => set(i, "city", e.target.value)} required maxLength={60} />
            </label>
            <label className="k-label !text-[#141414]">From<input className="k-field !bg-white/60 !text-[#141414]" type="date" value={s.from} onChange={(e) => set(i, "from", e.target.value)} required /></label>
            <label className="k-label !text-[#141414]">To<input className="k-field !bg-white/60 !text-[#141414]" type="date" value={s.to} min={s.from} onChange={(e) => set(i, "to", e.target.value)} required /></label>
            <label className="k-label !text-[#141414]">What
              <select className="k-field !bg-white/60 !text-[#141414]" value={s.state} onChange={(e) => set(i, "state", e.target.value)}>
                <option value="playing">Playing a show</option><option value="open">Free for bookings</option>
              </select>
            </label>
            {stops.length > 1 && <button type="button" className="k-btn k-btn--s" style={{ background: "rgba(0,0,0,.08)", color: "#141414" }} onClick={() => setStops((x) => x.filter((_, j) => j !== i))}>Remove</button>}
          </li>
        ))}
      </ol>
      <datalist id="tour-cities">{TOUR_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
      {stops.length < 12 && <button type="button" className="k-btn k-btn--ghost justify-self-start" onClick={() => setStops((s) => [...s, blank()])}>Add a city</button>}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="k-label">Act name<input className="k-field" name="act" defaultValue={act} required maxLength={80} /></label>
        <label className="k-label">Home city<input className="k-field" name="home" required maxLength={60} /></label>
        <label className="k-label">Instagram<input className="k-field" name="instagram" defaultValue={instagram} required maxLength={200} /></label>
        <label className="k-label">Email <small>for our questions only</small><input className="k-field" type="email" name="email" defaultValue={email} required maxLength={200} /></label>
      </div>
      <label className="k-label">Anything else <small>optional</small><textarea className="k-field" name="note" maxLength={600} /></label>
      {err && <p className="k-note k-note--warn m-0" role="alert">{err}</p>}
      <button type="submit" className="k-btn k-btn--key k-btn--l justify-self-start" disabled={busy}>{busy ? "Sending" : "Publish the tour"}</button>
    </form>
  );
}
