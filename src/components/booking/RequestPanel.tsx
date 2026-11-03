/**
 * Request to book: the night brief, sent to 1 to 3 artists at once.
 * Built like the ticket box: ink header band, the form, a perforation, then the send button.
 * Works before migration 041 (falls back to one old-style request per artist).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMember } from "@/lib/member";
import { sendBookingRequest, type NightBrief, type SendResult } from "@/lib/booking-desk";
import { BUDGETS, DESK_CITIES, ROOM_SIZES, SET_LENGTHS, dayLong, daysBetween, inrShort, isIsoDay, type MiniArtist } from "@/lib/desk";
import { todayIST } from "@/lib/nights";
import { BOOKINGS_BASE, threadPath } from "@/lib/routes";

const field = "w-full border-4 border-ink bg-cream px-3 py-3 text-ink text-base placeholder:text-ink/45 focus:outline-none focus:ring-4 focus:ring-electric-blue/40";
const REMEMBER = "ccd:booker";

type Props = {
  artists: MiniArtist[];
  onRemove?: (slug: string) => void;
  initial?: { date?: string; city?: string; budget?: string };
  onClose?: () => void;
  id?: string;
  title?: string;
};

export default function RequestPanel({ artists, onRemove, initial, onClose, id, title = "Request to book" }: Props) {
  const today = todayIST();
  const { member } = useMember();
  const [f, setF] = useState<NightBrief>({
    date: isIsoDay(initial?.date) ? initial!.date! : "", city: initial?.city ?? "", venue: "", room: null, set: "", budget: initial?.budget ?? "",
    other: "", message: "", name: "", email: "", org: "", hp: "",
  });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<SendResult | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBER) ?? "null");
      if (saved?.email) setF((x) => ({ ...x, name: x.name || saved.name || "", email: x.email || saved.email, org: x.org || saved.org || "" }));
    } catch {}
  }, []);
  useEffect(() => {
    if (member) setF((x) => ({ ...x, name: x.name || member.display_name || "", email: x.email || member.email || "", city: x.city || member.city || "" }));
  }, [member]);
  useEffect(() => {
    setF((x) => ({ ...x, date: x.date || (isIsoDay(initial?.date) ? initial!.date! : ""), city: x.city || initial?.city || "" }));
  }, [initial?.date, initial?.city]);

  const set = <K extends keyof NightBrief>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: k === "room" ? (e.target.value ? Number(e.target.value) : null) : e.target.value });

  const errors = {
    artists: artists.length === 0 ? "Add at least one artist." : "",
    date: !isIsoDay(f.date) ? "Pick the date of the night." : f.date < today ? "Pick today or a later date." : "",
    city: f.city.trim().length < 2 ? "Add the city." : "",
    set: !f.set ? "Pick a set length, or Not sure yet." : "",
    name: f.name.trim().length < 2 ? "Add your name." : "",
    email: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim()) ? "Add an email the artist can reach you on." : "",
    message: f.message.trim().length > 1400 ? "Keep the message under 1400 characters." : "",
  };
  const bad = Object.entries(errors).filter(([, v]) => v);
  const show = (k: keyof typeof errors) => touched && errors[k];

  const band = BUDGETS.find((b) => b.key === f.budget);
  const warnings = useMemo(() => {
    const out: string[] = [];
    for (const a of artists) {
      if (a.rate_from && band?.max != null && band.max < a.rate_from) out.push(`${a.name} starts from ${inrShort(a.rate_from)}, above this budget.`);
      if (a.min_notice_days && isIsoDay(f.date) && daysBetween(today, f.date) < a.min_notice_days) out.push(`${a.name} asks for ${a.min_notice_days} days notice.`);
      if (isIsoDay(f.date) && a.busy_days?.includes(f.date)) out.push(`${a.name} has a gig listed that night.`);
    }
    return out;
  }, [artists, band, f.date, today]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (bad.length) { topRef.current?.scrollIntoView({ block: "nearest" }); return; }
    setBusy(true); setErr("");
    try { localStorage.setItem(REMEMBER, JSON.stringify({ name: f.name, email: f.email, org: f.org })); } catch {}
    const names = Object.fromEntries(artists.map((a) => [a.slug, a.name]));
    const r = await sendBookingRequest(artists.map((a) => a.slug), names, f);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setDone(r);
  }

  const formId = `${id ?? "req"}-form`;
  const shell = (body: React.ReactNode, foot?: React.ReactNode) => (
    <div id={id} className="border-4 border-ink bg-cream text-ink chunk-shadow">
      <div className="bg-ink text-cream px-5 py-4 flex items-baseline justify-between gap-3">
        <p className="font-display text-xl leading-none">{title}</p>
        <p className="font-display text-acid-yellow text-lg leading-none tabular">{artists.length} of 3</p>
      </div>
      <div className="px-5 py-5">{body}</div>
      {foot && (<><div className="perf" aria-hidden /><div className="px-5 pt-5 pb-5">{foot}</div></>)}
    </div>
  );

  if (done && done.ok) {
    const names = (slugs: string[]) => slugs.map((s) => artists.find((a) => a.slug === s)?.name ?? s);
    return shell(
      <div role="status" className="grid gap-3">
        <p className="font-display text-3xl leading-none">Sent.</p>
        {done.mode === "v2" ? (
          <>
            <p>Your brief went to {listJoin(names(done.requests.map((r) => r.artist_slug)))}. Each one gets its own thread. Replies show there, and you can accept terms when you are ready.</p>
            <ul className="grid gap-2">
              {done.requests.map((r) => (
                <li key={r.id}>
                  <Link href={threadPath(r.id, r.key)} className="flex items-center justify-between gap-3 border-4 border-ink px-3 py-2 font-bold hover:bg-acid-yellow">
                    <span>{names([r.artist_slug])[0]}</span>
                    <span className="text-sm">{r.stage === "declined" ? "Auto-declined, budget below their rate" : "Open thread"}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-sm text-ink/70">We saved these links on this device. Join with the same email to see them anywhere.</p>
          </>
        ) : (
          <>
            <p>Your brief went to {listJoin(names(done.sent))}. The CCD team passes it on and you hear back by email, usually within a few days.</p>
            {done.failed.length > 0 && <p className="text-sm font-bold text-magenta">Could not send to {listJoin(names(done.failed.map((x) => x.slug)))}: {done.failed[0].error}</p>}
          </>
        )}
      </div>,
      <div className="flex flex-wrap gap-3">
        <Link href={BOOKINGS_BASE} className="font-display px-5 py-3 border-4 border-ink bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors">Your requests</Link>
        {onClose && <button type="button" onClick={onClose} className="font-display px-5 py-3 border-4 border-ink bg-cream hover:bg-ink hover:text-cream">Close</button>}
      </div>,
    );
  }

  return shell(
    <form id={formId} onSubmit={submit} noValidate className="grid gap-4">
      <div ref={topRef} />
      {touched && bad.length > 0 && (
        <div role="alert" className="border-4 border-magenta bg-cream px-3 py-2 text-sm font-bold text-magenta">
          Fix {bad.length === 1 ? "one thing" : `${bad.length} things`} to send: {bad.map(([, v]) => v).join(" ")}
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-bold mb-2">Artists</legend>
        {artists.length === 0 ? (
          <p className="text-sm text-ink/70">Pick up to 3 artists from the list. One brief goes to each.</p>
        ) : (
          <ul className="grid gap-2">
            {artists.map((a) => (
              <li key={a.slug} className="flex items-center gap-3 border-2 border-ink px-2 py-2">
                {a.photo_url ? <img src={a.photo_url} alt="" className="w-10 h-10 object-cover border-2 border-ink shrink-0" /> : <span className="w-10 h-10 border-2 border-ink bg-electric-blue text-cream font-display grid place-items-center shrink-0">{a.name.slice(0, 1)}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block font-display leading-tight truncate">{a.name}</span>
                  <span className="block text-xs text-ink/70 truncate">{[a.city, a.rate_from ? `from ${inrShort(a.rate_from)}` : "rate on request"].filter(Boolean).join(" · ")}</span>
                </span>
                {onRemove && <button type="button" onClick={() => onRemove(a.slug)} className="text-sm font-bold underline underline-offset-4 shrink-0" aria-label={`Remove ${a.name}`}>Remove</button>}
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-bold">Date</span>
          <input type="date" min={today} className={field} value={f.date} onChange={set("date")} aria-invalid={!!show("date")} />
          {show("date") && <span className="text-sm font-bold text-magenta">{errors.date}</span>}
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-bold">City</span>
          <input list="req-cities" className={field} value={f.city} onChange={set("city")} autoComplete="address-level2" aria-invalid={!!show("city")} />
          <datalist id="req-cities">{DESK_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
          {show("city") && <span className="text-sm font-bold text-magenta">{errors.city}</span>}
        </label>
      </div>
      {isIsoDay(f.date) && <p className="-mt-2 text-xs text-ink/60">{dayLong(f.date)}</p>}

      <label className="grid gap-1">
        <span className="text-sm font-bold">Venue <span className="font-normal text-ink/60">(if you have one)</span></span>
        <input className={field} value={f.venue} onChange={set("venue")} placeholder="Name of the club, bar or space" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-bold">Room size</span>
          <select className={field} value={f.room ?? ""} onChange={set("room")}>
            <option value="">Not sure</option>
            {ROOM_SIZES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-bold">Set</span>
          <select className={field} value={f.set} onChange={set("set")} aria-invalid={!!show("set")}>
            <option value="">Pick one</option>
            {SET_LENGTHS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {show("set") && <span className="text-sm font-bold text-magenta">{errors.set}</span>}
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-sm font-bold">Budget for this act</span>
        <select className={field} value={f.budget} onChange={set("budget")}>
          {BUDGETS.map((b) => <option key={b.key} value={b.key}>{b.key ? b.label : "Not sure yet"}</option>)}
        </select>
      </label>

      {warnings.length > 0 && (
        <ul className="grid gap-1 border-l-4 border-electric-blue pl-3 text-sm">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}

      <label className="grid gap-1">
        <span className="text-sm font-bold">Other acts on the night <span className="font-normal text-ink/60">(optional)</span></span>
        <input className={field} value={f.other} onChange={set("other")} placeholder="Who else is playing" />
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-bold">Message <span className="font-normal text-ink/60">(optional)</span></span>
        <textarea className={field} rows={3} value={f.message} onChange={set("message")} placeholder="The vibe, set time, what you can cover" aria-invalid={!!show("message")} />
        {show("message") && <span className="text-sm font-bold text-magenta">{errors.message}</span>}
      </label>

      <div className="grid gap-3 pt-2 border-t-2 border-ink/15">
        <p className="text-sm font-bold">You</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-bold">Name</span>
            <input className={field} autoComplete="name" value={f.name} onChange={set("name")} aria-invalid={!!show("name")} />
            {show("name") && <span className="text-sm font-bold text-magenta">{errors.name}</span>}
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-bold">Email</span>
            <input className={field} type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} aria-invalid={!!show("email")} />
            {show("email") && <span className="text-sm font-bold text-magenta">{errors.email}</span>}
          </label>
        </div>
        <label className="grid gap-1">
          <span className="text-sm font-bold">Collective or venue you book for <span className="font-normal text-ink/60">(optional)</span></span>
          <input className={field} autoComplete="organization" value={f.org} onChange={set("org")} />
        </label>
        <label className="hidden" aria-hidden>
          Website <input tabIndex={-1} autoComplete="off" value={f.hp} onChange={set("hp")} />
        </label>
      </div>
    </form>,
    <div>
      <button form={formId} disabled={busy}
        className="w-full font-display text-xl px-5 py-4 border-4 border-ink bg-acid-yellow disabled:opacity-60 enabled:hover:bg-ink enabled:hover:text-acid-yellow transition-colors">
        {busy ? "Sending..." : artists.length > 1 ? `Send to ${artists.length} artists` : artists.length === 1 ? `Send to ${artists[0].name}` : "Send request"}
      </button>
      {err && <p className="mt-3 text-sm font-bold text-magenta" role="alert">{err}</p>}
      <p className="mt-3 text-xs text-ink/60 leading-snug">
        No payment now and no fee to ask. Each artist answers with interested, a counter offer or a no. Keep talks on CCD until the booking is confirmed.
      </p>
    </div>,
  );
}

function listJoin(xs: string[]) {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}
