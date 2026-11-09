"use client";
/**
 * Make a party (board H39-Make). Anyone signed in makes one through submit_hosted_event; CCD staff
 * approve it before it shows on Nights. Approved promoters can list it under their name instead
 * (promoter_night_save, then submit for review).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { memberRpc } from "@/lib/member";
import { myPromoters, saveNight, nightStatus, type MyPromoter } from "@/lib/promoters";

const CITIES = ["Bengaluru", "Mumbai", "Delhi NCR", "Goa", "Pune", "Hyderabad", "Chennai", "Kolkata"];
const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12);

export default function MakeParty() {
  const [promoters, setPromoters] = useState<MyPromoter[]>([]);
  const [as, setAs] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ via: "promoter" | "host"; slug?: string } | null>(null);
  useEffect(() => { myPromoters().then((p) => setPromoters(p.filter((x) => x.status === "approved"))).catch(() => {}); }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    setBusy(true); setErr(null);
    if (as) {
      const r = await saveNight(as, null, {
        title: v("title"), event_date: v("date"), start_time: v("time") || null, venue: v("venue") || null, city: v("city"),
        blurb: v("about") || null, lineup: list(v("lineup")), genres: list(v("genres")), ticket_url: v("tickets") || null, rsvp_open: !v("tickets"),
      });
      const slug = (r.data as { slug?: string } | undefined)?.slug;
      if (!r.ok || !slug) { setBusy(false); setErr(r.error ?? "Could not save."); return; }
      const s = await nightStatus(slug, "submit");
      setBusy(false);
      if (!s.ok) { setErr(s.error ?? "Saved, but could not send for review."); return; }
      setDone({ via: "promoter", slug });
      return;
    }
    const r = await memberRpc("submit_hosted_event", {
      p_title: v("title"), p_date: v("date"), p_time: v("time") || null, p_city: v("city"), p_venue: v("venue") || null,
      p_genres: list(v("genres")), p_lineup: list(v("lineup")), p_ticket_url: v("tickets") || null, p_about: v("about") || null,
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Could not save."); return; }
    setDone({ via: "host" });
  };

  if (done) {
    return (
      <div className="k-surface grid justify-items-start gap-3 rounded-[24px] p-6 md:p-8" role="status">
        <span className="k-m" style={{ color: "var(--k-pc)" }}>Made</span>
        <h2 className="k-d m-0 text-[40px]">Your party is in.</h2>
        <p className="k-b m-0">We check it, usually the same day. Once it is approved it shows on Nights and your invite link works.</p>
        <div className="flex flex-wrap gap-3">
          <Link className="k-btn k-btn--key" href="/parties">Your parties</Link>
          {done.slug && <Link className="k-btn k-btn--ghost" href={`/i/${done.slug}`}>The invite</Link>}
        </div>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-6">
      {promoters.length > 0 && (
        <label className="k-label">List it as
          <select className="k-field" value={as} onChange={(e) => setAs(e.target.value)}>
            <option value="">Me</option>
            {promoters.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
        </label>
      )}
      <label className="k-label">Name of the party<input className="k-field" name="title" required maxLength={120} placeholder="Sunday sundowner" /></label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="k-label">Date<input className="k-field" type="date" name="date" required min={new Date().toISOString().slice(0, 10)} /></label>
        <label className="k-label">Starts<input className="k-field" type="time" name="time" /></label>
        <label className="k-label">City<input className="k-field" name="city" list="host-cities" required maxLength={60} /><datalist id="host-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist></label>
      </div>
      <label className="k-label">Venue <small>optional for a house party</small><input className="k-field" name="venue" maxLength={120} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="k-label">Who is playing <small>comma separated</small><input className="k-field" name="lineup" maxLength={400} /></label>
        <label className="k-label">Sound <small>comma separated</small><input className="k-field" name="genres" maxLength={200} placeholder="House, disco" /></label>
      </div>
      <label className="k-label">Tickets link <small>optional; leave empty for free entry with RSVPs</small><input className="k-field" type="url" name="tickets" maxLength={300} /></label>
      <label className="k-label">A few words <small>optional</small><textarea className="k-field" name="about" maxLength={1200} /></label>
      {err && <p className="k-note k-note--warn m-0" role="alert">{err}</p>}
      <button className="k-btn k-btn--key k-btn--l justify-self-start" disabled={busy}>{busy ? "Saving" : "Make the party"}</button>
    </form>
  );
}
