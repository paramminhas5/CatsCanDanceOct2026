"use client";
/**
 * The ask (boards F38-A-Book and F38-A-Offer): one brief to up to three artists. Keeps what was typed
 * when something is wrong, and on success saves the thread keys on this device so the asks show
 * under Bookings without an account.
 */
import { useActionState, useEffect } from "react";
import { sendAsk, type AskState } from "../../app/book/actions";
import { saveKeys } from "@/lib/booking-desk";
import { BUDGETS, ROOM_SIZES, SET_LENGTHS, DESK_CITIES } from "@/lib/desk";

type Pick = { slug: string; name: string; rate: string | null };

export default function AskForm({ picks, date, city, budget, today, names }: { picks: Pick[]; date: string; city: string; budget: string; today: string; names: Record<string, string> }) {
  const [state, action, pending] = useActionState<AskState, FormData>(sendAsk, { error: null, done: null });

  useEffect(() => {
    if (!state.done) return;
    saveKeys(state.done.map((d) => ({ id: d.id, key: d.key, artist: names[d.artist_slug] ?? d.artist_slug, date })));
  }, [state.done, names, date]);

  if (state.done) {
    return (
      <div className="k-surface grid gap-4 rounded-[24px] p-6 md:p-8" role="status">
        <span className="stamp-sent k-m" style={{ color: "var(--k-pc)" }}>Sent</span>
        <h2 className="k-d m-0 text-[40px]">Your ask is out.</h2>
        <p className="k-b m-0">Each artist replies on their own, usually within a day. You get an email when they do. Open a thread to follow it:</p>
        <ul className="m-0 grid list-none gap-2 p-0">
          {state.done.map((d) => (
            <li key={d.id}><a className="k-btn k-btn--ghost" href={`/bookings/${d.id}?k=${encodeURIComponent(d.key)}`}>{names[d.artist_slug] ?? d.artist_slug}</a></li>
          ))}
        </ul>
        <a href="/bookings" className="text-[15px] font-semibold">All your bookings</a>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-6" noValidate={false}>
      {picks.map((p) => <input key={p.slug} type="hidden" name="a" value={p.slug} />)}
      {/* Honeypot: people never see it, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="k-m mb-3">The night</legend>
        <label className="k-label">Date<input className="k-field" type="date" name="date" min={today} defaultValue={date} required /></label>
        <label className="k-label">City
          <input className="k-field" name="city" list="cities" defaultValue={city} required minLength={2} maxLength={60} />
          <datalist id="cities">{DESK_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="k-label">Venue <small>optional</small><input className="k-field" name="venue" maxLength={120} /></label>
        <label className="k-label">Room size
          <select className="k-field" name="room" defaultValue=""><option value="">Not sure</option>{ROOM_SIZES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}</select>
        </label>
        <label className="k-label">Set
          <select className="k-field" name="set" defaultValue=""><option value="">Not sure yet</option>{SET_LENGTHS.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label className="k-label">Budget
          <select className="k-field" name="budget" defaultValue={budget}>{BUDGETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</select>
        </label>
      </fieldset>

      <label className="k-label">Anything they should know <small>optional</small>
        <textarea className="k-field" name="message" maxLength={1400} placeholder="The night, the crowd, who else is on." />
      </label>

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="k-m mb-3">You</legend>
        <label className="k-label">Your name<input className="k-field" name="name" autoComplete="name" required minLength={2} maxLength={80} /></label>
        <label className="k-label">Email<input className="k-field" type="email" name="email" autoComplete="email" required maxLength={200} /></label>
        <label className="k-label">Promoter or venue <small>optional</small><input className="k-field" name="org" autoComplete="organization" maxLength={120} /></label>
      </fieldset>

      {state.error && <p className="k-note k-note--warn m-0" role="alert">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="k-btn k-btn--key k-btn--l" disabled={pending}>{pending ? "Sending" : picks.length > 1 ? `Send to all ${picks.length}` : "Send the ask"}</button>
        <span className="k-b text-sm">Nothing to pay to ask. Fees are agreed in the thread.</span>
      </div>
    </form>
  );
}
