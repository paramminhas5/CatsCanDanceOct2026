/**
 * Post your tour dates. Two kinds of post (Touring India, Away from home), one or more stops,
 * each Playing (venue, ticket link) or Open (free to book). Goes to review as 'pending'.
 *
 * Sends through submit_tour (migration 040). If that function is not there yet, each stop goes
 * through the older submit_dates RPC instead, with the details folded into the note.
 */
import { useId, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TOUR_CITIES, cityNorm, windowLabel, type TourKind, type TourState } from "@/lib/tour";
import { todayIST } from "@/lib/nights";

type Stop = { key: number; city: string; from: string; to: string; state: TourState; venue: string; ticket: string };
type Errors = Record<string, string>;

const field =
  "w-full bg-cream border-4 border-ink px-3 py-2.5 font-medium text-ink placeholder:text-ink/45 focus:outline-none focus-visible:ring-4 focus-visible:ring-electric-blue aria-[invalid=true]:border-magenta";
const labelCls = "grid gap-1.5 text-sm font-bold";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_RE = /^https?:\/\/\S+\.\S+/i;
const MAX_STOPS = 12;

let nextKey = 1;
const blankStop = (): Stop => ({ key: nextKey++, city: "", from: "", to: "", state: "open", venue: "", ticket: "" });
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export default function PostTourForm() {
  const uid = useId();
  const [kind, setKind] = useState<TourKind>("touring");
  const [act, setAct] = useState("");
  const [based, setBased] = useState("");
  const [ig, setIg] = useState("");
  const [ra, setRa] = useState("");
  const [sp, setSp] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [stops, setStops] = useState<Stop[]>(() => [blankStop()]);
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [serverErr, setServerErr] = useState("");
  const [sent, setSent] = useState<{ act: string; stops: Stop[] } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const today = todayIST();

  const setStop = (key: number, patch: Partial<Stop>) => setStops((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  // After the first try, errors update as the person types, so fixed fields clear right away.
  const errors: Errors = tried ? validate() : {};
  const err = (k: string) => errors[k];
  const describe = (k: string) => (errors[k] ? `${uid}-${k}-err` : undefined);

  function validate(): Errors {
    const e: Errors = {};
    if (!act.trim()) e.act = "Add the act name.";
    if (!based.trim()) e.based = kind === "touring" ? "Add where you are based, like Berlin, Germany." : "Add your home city.";
    if (!ig.trim() && !ra.trim() && !sp.trim()) e.links = "Add at least one link so we can check who you are.";
    for (const [k, v] of [["ra", ra], ["sp", sp]] as const) if (v.trim() && !URL_RE.test(v.trim())) e[k] = "Paste the full link, starting with https://";
    if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email.";
    stops.forEach((s, i) => {
      const p = `stop${s.key}`;
      if (!s.city.trim()) e[`${p}city`] = "Add the city.";
      else if (kind === "away" && cityNorm(s.city) === cityNorm(based)) e[`${p}city`] = "That is your home city. Post cities you are travelling to.";
      if (!s.from) e[`${p}from`] = "Pick a start date.";
      if (!s.to) e[`${p}to`] = "Pick an end date.";
      if (s.from && s.to) {
        if (s.to < s.from) e[`${p}to`] = "End date is before the start.";
        else if (s.to < today) e[`${p}to`] = "These dates have passed.";
        else if (days(s.from, s.to) > 60) e[`${p}to`] = "Keep one window under two months.";
      }
      if (s.state === "playing" && !s.venue.trim()) e[`${p}venue`] = "Add the venue, or mark the date Open.";
      if (s.ticket.trim() && !URL_RE.test(s.ticket.trim())) e[`${p}ticket`] = "Paste the full link, starting with https://";
      void i;
    });
    return e;
  }

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const hp = String(new FormData(ev.currentTarget).get("company") ?? "");
    if (hp) { setState("done"); setSent({ act, stops }); return; }
    const e = validate();
    setTried(true);
    setServerErr("");
    if (Object.keys(e).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    setState("busy");

    const parts = based.split(",").map((x) => x.trim()).filter(Boolean);
    const homeCity = kind === "away" ? based.trim() : parts.length > 1 ? parts.slice(0, -1).join(", ") : null;
    const homeCountry = kind === "away" ? "India" : parts[parts.length - 1] ?? based.trim();
    const clean = stops.map((s) => ({
      city: s.city.trim(), from: s.from, to: s.to, state: s.state,
      venue: s.state === "playing" ? s.venue.trim() || null : null,
      ticket_url: s.state === "playing" ? s.ticket.trim() || null : null,
    }));

    const { error } = await supabase.rpc("submit_tour", {
      p_kind: kind, p_act_name: act.trim(), p_home_city: homeCity, p_home_country: homeCountry,
      p_instagram: ig.trim() || null, p_ra: ra.trim() || null, p_spotify: sp.trim() || null,
      p_email: email.trim(), p_note: note.trim() || null, p_stops: clean, p_company: null,
    });

    if (error) {
      const missing = error.code === "PGRST202" || /could not find the function|schema cache/i.test(error.message ?? "");
      if (!missing) { setServerErr(error.message || "Could not send. Try again."); setState("idle"); return; }
      // Before migration 040: one submit_dates call per stop.
      const links = [ig && `IG ${ig.trim()}`, ra && `RA ${ra.trim()}`, sp && `Spotify ${sp.trim()}`].filter(Boolean).join(", ");
      const who = kind === "touring" ? `Touring India from ${based.trim()}` : `Away from home (${based.trim()})`;
      for (const s of clean) {
        const what = s.state === "playing" ? `Playing ${s.venue ?? ""}${s.ticket_url ? ` ${s.ticket_url}` : ""}` : "Open to book";
        const { error: e2 } = await supabase.rpc("submit_dates", {
          p_artist_name: act.trim(), p_email: email.trim(), p_city: s.city, p_from: s.from, p_to: s.to,
          p_note: [who, what, links, note.trim()].filter(Boolean).join(". ").slice(0, 300),
        });
        if (e2) { setServerErr(`${s.city}: ${e2.message}`); setState("idle"); return; }
      }
    }
    setSent({ act: act.trim(), stops });
    setState("done");
  }

  function reset() {
    setAct(""); setBased(""); setIg(""); setRa(""); setSp(""); setNote(""); setStops([blankStop()]);
    setTried(false); setServerErr(""); setSent(null); setState("idle");
  }

  if (state === "done") {
    return (
      <div className="bg-ink text-cream border-4 border-ink chunk-shadow p-6 md:p-8 self-start" role="status">
        <p className="font-display text-3xl leading-none text-acid-yellow">Got it.</p>
        <p className="mt-3 text-lg font-medium">We check every post before it goes up. If something is unclear we email you.</p>
        {sent && sent.stops.length > 0 && (
          <ul className="mt-5 grid gap-2 border-t-2 border-cream/20 pt-4">
            {sent.stops.map((s) => (
              <li key={s.key} className="flex flex-wrap gap-x-3 gap-y-1 items-baseline">
                <span className={`font-display text-xs px-2 py-0.5 border-2 ${s.state === "playing" ? "bg-magenta border-magenta" : "border-acid-yellow text-acid-yellow"}`}>{s.state === "playing" ? "PLAYING" : "OPEN"}</span>
                <span className="font-bold">{cityNorm(s.city)}</span>
                <span className="text-cream/75">{s.from && s.to ? windowLabel(s.from, s.to) : ""}</span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={reset} className="mt-6 font-display px-5 py-3 border-4 border-cream bg-transparent hover:bg-cream hover:text-ink transition-colors">Post another trip</button>
      </div>
    );
  }

  const errCount = Object.keys(errors).length;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-6 bg-cream border-4 border-ink p-5 md:p-7 chunk-shadow" aria-labelledby={`${uid}-title`}>
      <h3 id={`${uid}-title`} className="sr-only">Post your tour dates</h3>
      {errCount > 0 && (
        <p role="alert" className="border-4 border-magenta bg-magenta/10 px-4 py-3 font-bold text-ink">
          {errCount === 1 ? "One thing to fix" : `${errCount} things to fix`} before this can go to review.
        </p>
      )}

      {/* 1. Kind */}
      <fieldset className="grid gap-2">
        <legend className="font-display text-lg mb-2">1. What are you posting?</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          {([
            ["touring", "Touring India", "You are based outside India and have an India window."],
            ["away", "Away from home", "You are an Indian act playing in another city."],
          ] as const).map(([k, title, sub]) => (
            <label key={k} className={`cursor-pointer border-4 border-ink p-4 grid gap-1 transition-colors focus-within:ring-4 focus-within:ring-electric-blue ${kind === k ? "bg-ink text-cream" : "bg-cream hover:bg-acid-yellow"}`}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              <span className="font-display text-xl leading-none">{title}</span>
              <span className={`text-sm ${kind === k ? "text-cream/80" : "text-ink/70"}`}>{sub}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 2. Who */}
      <fieldset className="grid gap-4">
        <legend className="font-display text-lg mb-2">2. Who you are</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className={labelCls}>
            Act name
            <input value={act} onChange={(e) => setAct(e.target.value)} className={field} autoComplete="organization"
              aria-invalid={!!err("act")} aria-describedby={describe("act")} placeholder={kind === "touring" ? "e.g. a Berlin DJ" : "e.g. a Mumbai live act"} />
            {err("act") && <FieldError id={describe("act")!}>{err("act")}</FieldError>}
          </label>
          <label className={labelCls}>
            {kind === "touring" ? "Based in" : "Home city"}
            <input value={based} onChange={(e) => setBased(e.target.value)} className={field} list={kind === "away" ? `${uid}-cities` : undefined}
              aria-invalid={!!err("based")} aria-describedby={describe("based")} placeholder={kind === "touring" ? "Berlin, Germany" : "Mumbai"} />
            {err("based") && <FieldError id={describe("based")!}>{err("based")}</FieldError>}
          </label>
        </div>
        <div className="grid gap-2" role="group" aria-labelledby={`${uid}-links`} aria-describedby={describe("links")}>
          <p id={`${uid}-links`} className="text-sm font-bold">Links <span className="font-medium text-ink/65">(at least one)</span></p>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="grid gap-1 text-xs font-bold">Instagram
              <input value={ig} onChange={(e) => setIg(e.target.value)} className={field} placeholder="@handle" aria-invalid={!!err("links")} />
            </label>
            <label className="grid gap-1 text-xs font-bold">Resident Advisor
              <input value={ra} onChange={(e) => setRa(e.target.value)} className={field} placeholder="https://ra.co/dj/..." inputMode="url" aria-invalid={!!err("links") || !!err("ra")} aria-describedby={describe("ra")} />
              {err("ra") && <FieldError id={describe("ra")!}>{err("ra")}</FieldError>}
            </label>
            <label className="grid gap-1 text-xs font-bold">Spotify
              <input value={sp} onChange={(e) => setSp(e.target.value)} className={field} placeholder="https://open.spotify.com/..." inputMode="url" aria-invalid={!!err("links") || !!err("sp")} aria-describedby={describe("sp")} />
              {err("sp") && <FieldError id={describe("sp")!}>{err("sp")}</FieldError>}
            </label>
          </div>
          {err("links") && <FieldError id={describe("links")!}>{err("links")}</FieldError>}
        </div>
        <label className={labelCls}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} autoComplete="email"
            aria-invalid={!!err("email")} aria-describedby={`${uid}-email-help ${describe("email") ?? ""}`} placeholder="you@example.com" />
          <span id={`${uid}-email-help`} className="font-medium text-ink/65">Private. Only CCD sees it, to check the post and pass on booking requests.</span>
          {err("email") && <FieldError id={describe("email")!}>{err("email")}</FieldError>}
        </label>
      </fieldset>

      {/* 3. Stops */}
      <fieldset className="grid gap-4">
        <legend className="font-display text-lg mb-2">3. Cities and dates</legend>
        <p className="text-sm text-ink/70">Playing means you have a show booked. Open means the dates are free and promoters can ask for them.</p>
        <ol className="grid gap-4">
          {stops.map((s, i) => {
            const p = `stop${s.key}`;
            return (
              <li key={s.key} className="border-4 border-ink p-4 grid gap-3 bg-background">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-base">Stop {i + 1}</p>
                  {stops.length > 1 && (
                    <button type="button" onClick={() => setStops((all) => all.filter((x) => x.key !== s.key))}
                      className="text-sm font-bold underline underline-offset-4" aria-label={`Remove stop ${i + 1}${s.city ? ` (${s.city})` : ""}`}>Remove</button>
                  )}
                </div>
                <div className="grid sm:grid-cols-[1.3fr_1fr_1fr] gap-3">
                  <label className="grid gap-1 text-xs font-bold">City
                    <input value={s.city} onChange={(e) => setStop(s.key, { city: e.target.value })} list={`${uid}-cities`} className={field}
                      placeholder="Bengaluru" aria-invalid={!!err(`${p}city`)} aria-describedby={describe(`${p}city`)} />
                    {err(`${p}city`) && <FieldError id={describe(`${p}city`)!}>{err(`${p}city`)}</FieldError>}
                  </label>
                  <label className="grid gap-1 text-xs font-bold">From
                    <input type="date" value={s.from} min={today} onChange={(e) => setStop(s.key, { from: e.target.value, to: s.to && s.to >= e.target.value ? s.to : e.target.value })}
                      className={field} aria-invalid={!!err(`${p}from`)} aria-describedby={describe(`${p}from`)} />
                    {err(`${p}from`) && <FieldError id={describe(`${p}from`)!}>{err(`${p}from`)}</FieldError>}
                  </label>
                  <label className="grid gap-1 text-xs font-bold">To
                    <input type="date" value={s.to} min={s.from || today} onChange={(e) => setStop(s.key, { to: e.target.value })}
                      className={field} aria-invalid={!!err(`${p}to`)} aria-describedby={describe(`${p}to`)} />
                    {err(`${p}to`) && <FieldError id={describe(`${p}to`)!}>{err(`${p}to`)}</FieldError>}
                  </label>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label={`Stop ${i + 1}: playing or open`}>
                  {(["playing", "open"] as const).map((st) => (
                    <button key={st} type="button" aria-pressed={s.state === st} onClick={() => setStop(s.key, { state: st })}
                      className={`font-display text-sm px-4 py-2 border-4 border-ink transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-electric-blue ${
                        s.state === st ? (st === "playing" ? "bg-magenta text-cream" : "bg-acid-yellow text-ink") : "bg-cream text-ink hover:bg-ink/5"}`}>
                      {st === "playing" ? "Playing: show booked" : "Open: free to book"}
                    </button>
                  ))}
                </div>
                {s.state === "playing" && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="grid gap-1 text-xs font-bold">Venue
                      <input value={s.venue} onChange={(e) => setStop(s.key, { venue: e.target.value })} className={field} placeholder="Club or festival"
                        aria-invalid={!!err(`${p}venue`)} aria-describedby={describe(`${p}venue`)} />
                      {err(`${p}venue`) && <FieldError id={describe(`${p}venue`)!}>{err(`${p}venue`)}</FieldError>}
                    </label>
                    <label className="grid gap-1 text-xs font-bold">Ticket link <span className="font-medium text-ink/60">(optional)</span>
                      <input value={s.ticket} onChange={(e) => setStop(s.key, { ticket: e.target.value })} className={field} placeholder="https://" inputMode="url"
                        aria-invalid={!!err(`${p}ticket`)} aria-describedby={describe(`${p}ticket`)} />
                      {err(`${p}ticket`) && <FieldError id={describe(`${p}ticket`)!}>{err(`${p}ticket`)}</FieldError>}
                    </label>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {stops.length < MAX_STOPS && (
          <button type="button" onClick={() => setStops((s) => [...s, blankStop()])}
            className="justify-self-start font-display px-4 py-2.5 border-4 border-ink border-dashed bg-transparent hover:bg-ink hover:text-cream transition-colors">
            + Add another city
          </button>
        )}
        <datalist id={`${uid}-cities`}>{TOUR_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
      </fieldset>

      <label className={labelCls}>
        Anything promoters should know <span className="font-medium text-ink/60">(optional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} className={field}
          placeholder="Set length, B2B, live or DJ, travelling with a crew" />
      </label>

      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {serverErr && <p role="alert" className="border-4 border-magenta px-4 py-3 font-bold">{serverErr}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button disabled={state === "busy"} className="bg-ink text-cream font-display text-lg px-6 py-3.5 border-4 border-ink chunk-shadow hover:-translate-y-0.5 transition-transform disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-electric-blue">
          {state === "busy" ? "Sending..." : "Send for review"}
        </button>
        <p className="text-sm font-medium text-ink/70">We check every post before it goes up.</p>
      </div>
    </form>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return <span id={id} className="text-sm font-bold text-magenta">{children}</span>;
}
