"use client";
/**
 * Your page (board F38-A-Page): what promoters see when they book you. Your acts and rates, notice,
 * where you travel, your rider, and the days you are free. Saves through save_my_booking_settings
 * and set_my_day, which only ever touch the signed-in artist's own rows.
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { myArtist, loadMySettings, saveMySettings, loadCalendar, setDay, type MySettings, type DayRow } from "@/lib/booking-desk";
import { ACT_LABEL, type ActType, type Format } from "@/lib/desk";

const ACTS: ActType[] = ["dj", "live", "producer_live", "band", "vj"];
const EMPTY: MySettings = { act_types: [], formats: [], min_notice_days: null, travel_cities: [], travels_anywhere: false, travel_terms: null, rider: null, tech: null, included: null, cancellation_terms: null, auto_decline_below_inr: null, templates: [] };
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function MePage() {
  const [me, setMe] = useState<{ slug: string; name: string } | null | undefined>(undefined);
  const [s, setS] = useState<MySettings>(EMPTY);
  const [days, setDays] = useState<Record<string, DayRow["state"]>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const range = useMemo(() => {
    const start = new Date(); start.setUTCHours(0, 0, 0, 0);
    return Array.from({ length: 42 }, (_, i) => iso(new Date(start.getTime() + i * 86400000)));
  }, []);
  useEffect(() => {
    myArtist().then((r) => setMe(r.ok ? r.data : null));
    loadMySettings().then((r) => r.ok && r.data && setS({ ...EMPTY, ...r.data }));
    loadCalendar(range[0], range[range.length - 1]).then((r) => r.ok && setDays(Object.fromEntries((r.data ?? []).map((d) => [d.day, d.state]))));
  }, [range]);
  if (me === undefined) return <p className="k-b" aria-busy="true">Loading your page</p>;
  if (me === null) return <div className="k-surface rounded-[22px] p-6"><b>No page linked to this account yet.</b> <Link href="/claim">Claim your page</Link></div>;

  const formats = (s.formats as Format[]) ?? [];
  const rateFor = (k: ActType) => formats.find((f) => f.kind === k)?.rate_from_inr ?? "";
  const toggleAct = (k: ActType) => setS((x) => ({ ...x, act_types: x.act_types.includes(k) ? x.act_types.filter((a) => a !== k) : [...x.act_types, k] }));
  const setRate = (k: ActType, v: string) => {
    const n = Number(v.replace(/[^\d]/g, "")) || null;
    const rest = formats.filter((f) => f.kind !== k);
    setS((x) => ({ ...x, formats: n ? [...rest, { kind: k, rate_from_inr: n }] : rest }));
  };
  const save = async () => {
    setBusy(true);
    const r = await saveMySettings(s);
    setBusy(false);
    setSaved(r.ok ? "Saved" : r.error);
  };
  const cycle = async (day: string) => {
    const cur = days[day];
    const next = cur === undefined ? "open" : cur === "open" ? "booked" : null;
    setDays((d) => { const c = { ...d }; if (next) c[day] = next; else delete c[day]; return c; });
    await setDay(day, next, null);
  };
  return (
    <div className="grid gap-12">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1"><h1 className="k-d text-[44px] md:text-[56px]">Your page</h1><p className="k-b mt-2 text-[17px]">What promoters see when they book you.</p></div>
        <Link className="k-btn k-btn--ghost" href={`/${me.slug}`}>See it live</Link>
      </div>

      <section className="grid gap-5">
        <h2 className="k-d text-[28px]">What you play, and from what</h2>
        <div className="flex flex-wrap gap-2.5">{ACTS.map((k) => <button key={k} type="button" className="k-keycap" aria-pressed={s.act_types.includes(k)} onClick={() => toggleAct(k)}>{ACT_LABEL[k]}</button>)}</div>
        <div className="grid gap-4 md:grid-cols-3">
          {(s.act_types as ActType[]).filter((k) => ACTS.includes(k)).map((k) => (
            <label key={k} className="k-label">{ACT_LABEL[k]}, from (₹)<input className="k-field" inputMode="numeric" defaultValue={String(rateFor(k))} onChange={(e) => setRate(k, e.target.value)} placeholder="e.g. 30000" /></label>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="k-label">Notice you need (days)<input className="k-field" inputMode="numeric" value={s.min_notice_days ?? ""} onChange={(e) => setS({ ...s, min_notice_days: Number(e.target.value) || null })} /></label>
          <label className="k-label">Cities you play <small>comma separated</small><input className="k-field" value={s.travel_cities.join(", ")} onChange={(e) => setS({ ...s, travel_cities: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
          <label className="k-label">Travel anywhere
            <select className="k-field" value={s.travels_anywhere ? "y" : "n"} onChange={(e) => setS({ ...s, travels_anywhere: e.target.value === "y" })}><option value="n">Only the cities above</option><option value="y">Yes, anywhere</option></select>
          </label>
        </div>
        <label className="k-label">Rider and tech <small>optional</small><textarea className="k-field" value={s.rider ?? ""} onChange={(e) => setS({ ...s, rider: e.target.value || null })} maxLength={1200} /></label>
        <div className="flex items-center gap-4"><button className="k-btn k-btn--key" onClick={save} disabled={busy}>{busy ? "Saving" : "Save"}</button>{saved && <span role="status" className="k-b text-sm">{saved}</span>}</div>
      </section>

      <section id="days" className="grid gap-4">
        <h2 className="k-d text-[28px]">Your next six weeks</h2>
        <p className="k-b m-0 text-sm">Tap a day: once for free, twice for booked, three times to clear. Free days show to promoters searching that date.</p>
        <div className="grid grid-cols-7 gap-2" role="grid" aria-label="Your days">
          {range.map((d) => {
            const st = days[d];
            return (
              <button key={d} type="button" onClick={() => cycle(d)} aria-label={`${d}: ${st ?? "not set"}`} className="k-keycap !min-h-[56px]" aria-pressed={st === "open"}
                style={st === "booked" || st === "playing" ? { background: "#3a1e12", color: "#ffb4a0" } : undefined}>
                {Number(d.slice(8))}<small>{st === "open" ? "Free" : st === "booked" ? "Booked" : st === "playing" ? "Show" : " "}</small>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
