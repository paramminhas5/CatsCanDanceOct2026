/**
 * /club/artist: the artist's booking desk. Needs a signed-in member who owns a claimed artist page
 * (artists.owner_member, same check as "Your artist page" on /club).
 *   Requests   inbox with fit signals: room, budget against your rate, venue, notice, city
 *   Calendar   tap a day: Open, Booked, Playing, or clear
 *   Settings   act types, formats with rate from, notice, travel, rider, tech, auto-decline, saved replies
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DeskShell, { NeedsUpdate, SignInNudge, btn, btnAlt, field } from "@/components/booking/DeskShell";
import { StagePill } from "@/components/booking/StageTrack";
import { useMember } from "@/lib/member";
import { supabase } from "@/lib/supabase";
import { DEFAULT_TEMPLATES, loadCalendar, loadMySettings, loadMyThreads, saveMySettings, setDay, type DayRow, type MySettings, type ThreadRow } from "@/lib/booking-desk";
import { ACT_LABEL, DESK_CITIES, addDays, dayShort, daysBetween, inrFull, roomLabel, sameCity, type ActType, type Format } from "@/lib/desk";
import { todayIST } from "@/lib/nights";
import { artistPath, threadPath } from "@/lib/routes";

type Mine = { slug: string; name: string; based_city: string | null; status: string } | null;
const EMPTY: MySettings = {
  act_types: [], formats: [], min_notice_days: null, travel_cities: [], travels_anywhere: false, travel_terms: null, rider: null, tech: null,
  included: null, cancellation_terms: null, auto_decline_below_inr: null, templates: DEFAULT_TEMPLATES,
};

export default function ArtistDesk() {
  const { loading, signedIn } = useMember();
  const [mine, setMine] = useState<Mine | undefined>(undefined);
  const [tab, setTab] = useState<"requests" | "calendar" | "settings">("requests");
  const [settings, setSettings] = useState<MySettings | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!signedIn) { setMine(null); return; }
    supabase.rpc("my_artist").then(({ data }) => setMine((data as Mine) ?? null));
  }, [loading, signedIn]);

  useEffect(() => {
    if (!mine) return;
    loadMySettings().then((r) => {
      if (r.ok) setSettings({ ...EMPTY, ...(r.data ?? {}), templates: r.data?.templates?.length ? r.data.templates : DEFAULT_TEMPLATES });
      else { setMissing(!!r.missing); setSettings(EMPTY); }
    });
  }, [mine]);

  return (
    <DeskShell title="Your booking desk" eyebrow={mine ? `Booking desk · ${mine.name}` : "Booking desk"} heading="YOUR BOOKINGS." path="/club/artist">
      {mine === undefined ? <div className="h-40 border-4 border-ink/20 bg-ink/5" aria-busy="true" /> : mine === null ? (
        <div className="border-4 border-ink bg-cream p-6 max-w-2xl grid gap-3">
          <p className="font-display text-2xl leading-tight">This is where artists run their bookings.</p>
          <p className="text-ink/80">Sign in, then claim your artist page from your club page. Once the CCD team checks it is you, your calendar, rates and requests live here.</p>
          {signedIn ? <div className="flex flex-wrap gap-3"><Link href="/club" className={btn}>Go to your club page</Link><Link href="/for-artists" className={btnAlt}>How claiming works</Link></div> : <SignInNudge />}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-8" role="tablist">
            {(["requests", "calendar", "settings"] as const).map((x) => (
              <button key={x} role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={tab === x ? btn : btnAlt}>
                {x === "requests" ? "Requests" : x === "calendar" ? "Calendar" : "Settings"}
              </button>
            ))}
            <Link href={artistPath(mine.slug)} className="ml-auto font-bold underline underline-offset-4">Your public page</Link>
          </div>
          {mine.status !== "approved" && <p className="mb-6 border-l-4 border-magenta pl-3 font-bold">Your page is not public yet. Organisers can book you once the CCD team approves it.</p>}
          {tab === "requests" && <Inbox settings={settings} based={mine.based_city} />}
          {tab === "calendar" && (missing ? <NeedsUpdate what="Your calendar needs a database update that is on its way. Until then, post tour dates from the Tour page." /> : <Calendar city={mine.based_city} />)}
          {tab === "settings" && (missing ? <NeedsUpdate what="Booking settings (rates, notice, travel, rider) need a database update that is on its way." /> : settings && <Settings initial={settings} />)}
        </>
      )}
    </DeskShell>
  );
}

// ── Requests ────────────────────────────────────────────────────────────────
function Inbox({ settings, based }: { settings: MySettings | null; based: string | null }) {
  const [rows, setRows] = useState<ThreadRow[] | null>(null);
  const [legacy, setLegacy] = useState(false);
  useEffect(() => { loadMyThreads(true).then((r) => { setRows(r.rows.filter((x) => x.role === "artist")); setLegacy(r.legacy); }); }, []);
  const today = todayIST();
  const rates = (settings?.formats ?? []).map((f: Format) => Number(f.rate_from_inr)).filter((n) => n > 0);
  const minRate = rates.length ? Math.min(...rates) : null;
  if (rows === null) return <div className="h-32 border-4 border-ink/20 bg-ink/5" aria-busy="true" />;
  if (rows.length === 0) return <p className="border-4 border-dashed border-ink/40 p-6 max-w-2xl">No requests yet. Mark open days in your calendar and set your rates: open days put you at the top of the booking desk for that date.</p>;
  return (
    <>
      {legacy && <p className="mb-4 border-l-4 border-electric-blue pl-3">Counter offers and threads switch on with the next database update. For now answer Interested or Pass from <Link href="/club" className="underline font-bold">your club page</Link>.</p>}
      <ul className="grid gap-4">
        {rows.map((r) => {
          const notice = r.event_date ? daysBetween(today, r.event_date) : null;
          const fits = [
            { k: "Room", v: roomLabel(r.room_size) ?? "Not given", bad: false },
            { k: "Budget", v: r.budget_band ?? "Not given", bad: !!(minRate && r.budget_max_inr && r.budget_max_inr < minRate) },
            { k: "Venue", v: r.venue ?? "Not given", bad: false },
            { k: "Notice", v: notice == null ? "No date" : `${notice} days`, bad: !!(settings?.min_notice_days && notice != null && notice < settings.min_notice_days) },
            { k: "City", v: r.city ?? "Not given", bad: !!(settings && r.city && !settings.travels_anywhere && !sameCity(based, r.city) && !settings.travel_cities.some((c) => sameCity(c, r.city))) },
          ];
          const inner = (
            <div className="p-4 grid gap-2">
              <div className="flex flex-wrap items-center gap-2"><StagePill stage={r.stage} />{["sent", "seen"].includes(r.stage) && <span className="text-xs font-bold text-magenta">Waiting on you</span>}</div>
              <p className="font-display text-2xl leading-tight">{r.name}{r.org ? `, ${r.org}` : ""}</p>
              <p className="text-sm font-bold">{[r.event_date && dayShort(r.event_date), r.set_length].filter(Boolean).join(" · ")}</p>
              <ul className="flex flex-wrap gap-1.5 text-xs">
                {fits.map((f) => <li key={f.k} className={`px-2 py-0.5 border-2 ${f.bad ? "border-magenta text-magenta font-bold" : "border-ink/30"}`}><b>{f.k}:</b> {f.v}</li>)}
              </ul>
              {minRate && r.budget_max_inr && r.budget_max_inr < minRate && <p className="text-xs text-magenta font-bold">Budget is below your rate from {inrFull(minRate)}. Counter or decline.</p>}
              {r.last_message && <p className="text-sm text-ink/70 line-clamp-2">{r.last_message}</p>}
              {r.legacy && r.message && <p className="text-sm text-ink/70 line-clamp-3 whitespace-pre-line">{r.message}</p>}
            </div>
          );
          return <li key={r.id} className="border-4 border-ink bg-cream">{r.legacy ? inner : <Link href={threadPath(r.id)} className="block hover:bg-acid-yellow/40">{inner}</Link>}</li>;
        })}
      </ul>
    </>
  );
}

// ── Calendar ────────────────────────────────────────────────────────────────
const STATE_CLS: Record<string, string> = { open: "bg-acid-yellow text-ink", booked: "bg-ink text-cream", playing: "bg-magenta text-cream" };
const STATE_LABEL: Record<string, string> = { open: "Open", booked: "Booked", playing: "Playing" };

function Calendar({ city }: { city: string | null }) {
  const today = todayIST();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [days, setDays] = useState<Record<string, DayRow>>({});
  const [pick, setPick] = useState<string | null>(null);
  const [pickCity, setPickCity] = useState(city ?? "");
  const [msg, setMsg] = useState("");

  const grid = useMemo(() => {
    const first = `${month}-01`;
    const dow = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday first
    const start = addDays(first, -dow);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const load = useCallback(async () => {
    const r = await loadCalendar(grid[0], grid[41]);
    if (r.ok) setDays(Object.fromEntries((r.data ?? []).map((d) => [String(d.day).slice(0, 10), d])));
  }, [grid]);
  useEffect(() => { load(); }, [load]);

  const shift = (n: number) => { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); setMonth(d.toISOString().slice(0, 7)); };
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

  async function save(state: string | null) {
    if (!pick) return;
    const r = await setDay(pick, state, state === "playing" || state === "open" ? pickCity || null : null);
    setMsg(r.ok ? "" : r.error);
    if (r.ok) { setPick(null); load(); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
      <div className="border-4 border-ink bg-cream">
        <div className="flex items-center justify-between bg-ink text-cream px-4 py-3">
          <button type="button" onClick={() => shift(-1)} disabled={month <= today.slice(0, 7)} className="font-display px-3 py-1 border-2 border-cream/50 disabled:opacity-30" aria-label="Previous month">‹</button>
          <p className="font-display text-xl">{label}</p>
          <button type="button" onClick={() => shift(1)} className="font-display px-3 py-1 border-2 border-cream/50" aria-label="Next month">›</button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-bold border-b-2 border-ink">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d) => {
            const inMonth = d.startsWith(month);
            const past = d < today;
            const row = days[d];
            return (
              <button key={d} type="button" disabled={past || !inMonth} onClick={() => { setPick(d); setPickCity(row?.city ?? city ?? ""); }}
                aria-label={`${dayShort(d)}${row ? `, ${STATE_LABEL[row.state]}` : ""}`} aria-pressed={pick === d}
                className={`aspect-square border-r-2 border-b-2 border-ink/15 p-1 text-left flex flex-col justify-between transition-colors ${!inMonth ? "opacity-0 pointer-events-none" : past ? "text-ink/30" : row ? STATE_CLS[row.state] : "hover:bg-acid-yellow/40"} ${pick === d ? "outline outline-4 -outline-offset-4 outline-electric-blue" : ""}`}>
                <span className="font-display text-base sm:text-lg tabular">{Number(d.slice(8))}</span>
                {row && <span className="text-[10px] sm:text-xs font-bold leading-tight truncate">{STATE_LABEL[row.state]}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <aside className="grid gap-4">
        <div className="border-4 border-ink bg-cream p-4 grid gap-3">
          {pick ? (
            <>
              <p className="font-display text-xl">{dayShort(pick)}</p>
              <label className="grid gap-1"><span className="text-sm font-bold">City</span>
                <input list="cal-cities" className={field} value={pickCity} onChange={(e) => setPickCity(e.target.value)} />
                <datalist id="cal-cities">{DESK_CITIES.map((c) => <option key={c} value={c} />)}</datalist></label>
              <div className="grid grid-cols-3 gap-2">
                {(["open", "booked", "playing"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => save(s)} className={`font-display py-2 border-4 border-ink ${STATE_CLS[s]}`}>{STATE_LABEL[s]}</button>
                ))}
              </div>
              {days[pick] && <button type="button" onClick={() => save(null)} className="justify-self-start text-sm font-bold underline underline-offset-4">Clear this day</button>}
              {msg && <p className="text-sm font-bold text-magenta">{msg}</p>}
            </>
          ) : <p className="text-sm">Tap a day to mark it.</p>}
        </div>
        <ul className="grid gap-2 text-sm">
          <li className="flex items-center gap-2"><span className={`w-5 h-5 border-2 border-ink ${STATE_CLS.open}`} /> <b>Open</b> You want a gig. You show first for this date.</li>
          <li className="flex items-center gap-2"><span className={`w-5 h-5 border-2 border-ink ${STATE_CLS.booked}`} /> <b>Booked</b> Not free. Private detail stays private.</li>
          <li className="flex items-center gap-2"><span className={`w-5 h-5 border-2 border-ink ${STATE_CLS.playing}`} /> <b>Playing</b> A gig. Confirmed CCD bookings add this for you.</li>
        </ul>
      </aside>
    </div>
  );
}

// ── Settings ────────────────────────────────────────────────────────────────
function Settings({ initial }: { initial: MySettings }) {
  const [s, setS] = useState<MySettings>(initial);
  const [cities, setCities] = useState((initial.travel_cities ?? []).join(", "));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const up = (p: Partial<MySettings>) => setS({ ...s, ...p });
  const formats = (s.formats ?? []) as Format[];
  const setFormat = (i: number, p: Partial<Format>) => up({ formats: formats.map((f, j) => (j === i ? { ...f, ...p } : f)) });
  const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v.replace(/[^\d]/g, "")) || 0)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await saveMySettings({ ...s, travel_cities: cities.split(",").map((c) => c.trim()).filter(Boolean), formats: formats.filter((f) => f.kind) });
    setBusy(false);
    setMsg(r.ok ? "Saved. The booking desk shows it within 10 minutes." : r.error);
  }


  return (
    <form onSubmit={save} className="grid gap-8 max-w-3xl">
      <fieldset className="grid gap-2">
        <legend className="font-display text-2xl mb-2">What you play</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ACT_LABEL) as ActType[]).map((a) => {
            const on = s.act_types.includes(a);
            return <button key={a} type="button" aria-pressed={on} onClick={() => up({ act_types: on ? s.act_types.filter((x) => x !== a) : [...s.act_types, a] })} className={`font-display px-4 py-2 border-4 border-ink ${on ? "bg-ink text-cream" : "bg-cream"}`}>{ACT_LABEL[a]}</button>;
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="font-display text-2xl mb-1">Formats and rates</legend>
        <p className="text-sm text-ink/70 -mt-1">Rate from is what organisers see on the booking desk. Leave it empty to show Ask.</p>
        {formats.map((f, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[140px_1fr_90px_90px_120px_auto] items-end border-2 border-ink p-2">
            <label className="grid gap-1 text-sm"><span className="font-bold">Type</span>
              <select className={field} value={f.kind} onChange={(e) => setFormat(i, { kind: e.target.value as ActType })}>{(Object.keys(ACT_LABEL) as ActType[]).map((a) => <option key={a} value={a}>{ACT_LABEL[a]}</option>)}</select></label>
            <label className="grid gap-1 text-sm"><span className="font-bold">Name</span><input className={field} value={f.label ?? ""} onChange={(e) => setFormat(i, { label: e.target.value })} placeholder="Extended DJ set" /></label>
            <label className="grid gap-1 text-sm"><span className="font-bold">Min mins</span><input className={field} inputMode="numeric" value={f.minutes_min ?? ""} onChange={(e) => setFormat(i, { minutes_min: num(e.target.value) })} /></label>
            <label className="grid gap-1 text-sm"><span className="font-bold">Max mins</span><input className={field} inputMode="numeric" value={f.minutes_max ?? ""} onChange={(e) => setFormat(i, { minutes_max: num(e.target.value) })} /></label>
            <label className="grid gap-1 text-sm"><span className="font-bold">Rate from ₹</span><input className={field} inputMode="numeric" value={f.rate_from_inr ?? ""} onChange={(e) => setFormat(i, { rate_from_inr: num(e.target.value) })} /></label>
            <button type="button" onClick={() => up({ formats: formats.filter((_, j) => j !== i) })} className="text-sm font-bold underline underline-offset-4 pb-3">Remove</button>
            {f.kind === "band" && <label className="grid gap-1 text-sm sm:col-span-2"><span className="font-bold">People on stage</span><input className={field} inputMode="numeric" value={f.band_size ?? ""} onChange={(e) => setFormat(i, { band_size: num(e.target.value) })} /></label>}
          </div>
        ))}
        {formats.length < 8 && <button type="button" onClick={() => up({ formats: [...formats, { kind: (s.act_types[0] as ActType) ?? "dj", minutes_min: 60, minutes_max: 180 }] })} className={`${btnAlt} justify-self-start`}>Add a format</button>}
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="font-display text-2xl mb-1">When and where</legend>
        <label className="grid gap-1 max-w-xs"><span className="font-bold">Minimum notice, in days</span>
          <input className={field} inputMode="numeric" value={s.min_notice_days ?? ""} onChange={(e) => up({ min_notice_days: num(e.target.value) })} placeholder="14" /></label>
        <label className="grid gap-1"><span className="font-bold">Cities you travel to</span>
          <input className={field} value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Mumbai, Goa, Pune" /></label>
        <label className="flex items-center gap-2 font-bold"><input type="checkbox" className="w-5 h-5 accent-black" checked={s.travels_anywhere} onChange={(e) => up({ travels_anywhere: e.target.checked })} /> I travel anywhere</label>
        <Area s={s} up={up} k="travel_terms" label="Travel terms" hint="Flights or train from my city and one night stay, covered by the organiser" />
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="font-display text-2xl mb-1">What you need</legend>
        <Area s={s} up={up} k="tech" label="Tech" hint="2 CDJ-3000 and a DJM-900, booth monitor" />
        <Area s={s} up={up} k="rider" label="Rider basics" hint="Water, two drinks, a guest list of 2" />
        <Area s={s} up={up} k="included" label="What is included" hint="Promo assets and one Instagram post" />
        <Area s={s} up={up} k="cancellation_terms" label="Cancellation terms" hint="If the organiser cancels inside 7 days, 50% of the fee is due" />
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="font-display text-2xl mb-1">Auto-decline</legend>
        <label className="grid gap-1 max-w-xs"><span className="font-bold">Decline requests with a budget below ₹</span>
          <input className={field} inputMode="numeric" value={s.auto_decline_below_inr ?? ""} onChange={(e) => up({ auto_decline_below_inr: num(e.target.value) })} placeholder="Leave empty to see all" /></label>
        <p className="text-sm text-ink/70">Never shown publicly. Organisers just see that the budget was below what you take.</p>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="font-display text-2xl mb-1">Saved replies</legend>
        {s.templates.map((t, i) => (
          <div key={i} className="grid gap-2 border-2 border-ink p-2">
            <div className="flex gap-2"><input className={field} value={t.name} onChange={(e) => up({ templates: s.templates.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} aria-label="Reply name" />
              <button type="button" onClick={() => up({ templates: s.templates.filter((_, j) => j !== i) })} className="text-sm font-bold underline underline-offset-4 shrink-0">Remove</button></div>
            <textarea className={field} rows={2} value={t.body} onChange={(e) => up({ templates: s.templates.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} aria-label="Reply text" />
          </div>
        ))}
        {s.templates.length < 8 && <button type="button" onClick={() => up({ templates: [...s.templates, { name: "New reply", body: "" }] })} className={`${btnAlt} justify-self-start`}>Add a reply</button>}
      </fieldset>

      <div className="sticky bottom-0 bg-background border-t-4 border-ink py-3 flex flex-wrap items-center gap-3">
        <button disabled={busy} className={btn}>{busy ? "Saving..." : "Save settings"}</button>
        {msg && <p className="font-bold" role="status">{msg}</p>}
      </div>
    </form>
  );
}

type AreaKey = "travel_terms" | "rider" | "tech" | "included" | "cancellation_terms";
function Area({ s, up, k, label, hint }: { s: MySettings; up: (p: Partial<MySettings>) => void; k: AreaKey; label: string; hint: string }) {
  return (
    <label className="grid gap-1"><span className="font-bold">{label}</span>
      <textarea className={field} rows={2} value={s[k] ?? ""} onChange={(e) => up({ [k]: e.target.value } as Partial<MySettings>)} placeholder={hint} /></label>
  );
}
