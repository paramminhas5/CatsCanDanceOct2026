/**
 * /bookings/[id]: one request, one thread. Both sides see the same page with their own actions.
 *   Artist:     Interested (with a fee), Counter (fee or set), Decline (with a reason), then Confirm.
 *   Organiser:  Accept the terms on the table, or Withdraw.
 * Access: the artist who owns the page, the member who sent it, or anyone with the request link (?k=).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import DeskShell, { NeedsUpdate, SignInNudge, btn, btnAlt, field } from "@/components/booking/DeskShell";
import StageTrack from "@/components/booking/StageTrack";
import { DEFAULT_TEMPLATES, actOn, keyFor, loadThread, postMessage, review, saveKeys, type Thread, type ThreadMsg } from "@/lib/booking-desk";
import { BOOKINGS_BASE, artistPath, receiptPath } from "@/lib/routes";
import { dayLong, daysBetween, inrFull, normCity, roomLabel, sameCity, STAGE_LABEL } from "@/lib/desk";
import { todayIST } from "@/lib/nights";

type Status = "loading" | "ok" | "missing" | "denied" | "error";

export default function ThreadPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const [key, setKey] = useState<string | null>(null);
  const [t, setT] = useState<Thread | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [err, setErr] = useState("");

  const load = useCallback(async (k: string | null) => {
    const r = await loadThread(id, k);
    if (r.ok) { setT(r.data); setStatus("ok"); return r.data; }
    setStatus(r.missing ? "missing" : /not yours|link is wrong/i.test(r.error) ? "denied" : "error");
    setErr(r.error);
    return null;
  }, [id]);

  useEffect(() => {
    if (!router.isReady || !/^[0-9a-f-]{36}$/i.test(id)) { if (router.isReady) setStatus("denied"); return; }
    const k = typeof router.query.k === "string" && /^[0-9a-f-]{36}$/i.test(router.query.k) ? router.query.k : keyFor(id);
    setKey(k);
    load(k).then((d) => {
      if (d && k && d.role === "requester") saveKeys([{ id, key: k, artist: d.artist?.name ?? "", date: d.request.event_date }]);
    });
  }, [router.isReady, router.query.k, id, load]);

  const heading = t ? (t.role === "artist" ? `${t.request.name.toUpperCase()}` : `${(t.artist?.name ?? "Artist").toUpperCase()}`) : "REQUEST.";

  return (
    <DeskShell title="Booking request" eyebrow={t ? `${STAGE_LABEL[t.request.stage]} · ${t.role === "artist" ? "Request for you" : "Your request"}` : "Bookings"} heading={heading} path={`/bookings/${id}`}>
      <p className="mb-6"><Link href={BOOKINGS_BASE} className="font-bold underline underline-offset-4">All requests</Link></p>
      {status === "loading" && <div className="h-40 border-4 border-ink/20 bg-ink/5" aria-busy="true" />}
      {status === "missing" && (
        <NeedsUpdate what="Request threads, counter offers and confirmations need a database update that is on its way. Your request is saved and the CCD team passes it on by email.">
          <Link href={BOOKINGS_BASE} className={btn}>Your requests</Link>
          <Link href="/book" className={btnAlt}>Find an artist</Link>
        </NeedsUpdate>
      )}
      {status === "denied" && (
        <div className="border-4 border-ink bg-cream p-6 max-w-2xl">
          <p className="font-display text-2xl leading-tight mb-2">We can&apos;t open this request.</p>
          <p className="text-ink/80 mb-4">Open it from the link you got when you sent it, or sign in with the email you used. Artists see requests after they claim their page.</p>
          <SignInNudge />
        </div>
      )}
      {status === "error" && <p className="font-bold text-magenta" role="alert">{err || "Could not load this request."}</p>}
      {status === "ok" && t && <ThreadView t={t} id={id} k={key} reload={() => load(key)} />}
    </DeskShell>
  );
}

function ThreadView({ t, id, k, reload }: { t: Thread; id: string; k: string | null; reload: () => void }) {
  const r = t.request;
  const today = todayIST();
  const closed = r.stage === "declined" || r.stage === "cancelled";
  const isArtist = t.role === "artist";
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) { setNote("Write a message first."); return; }
    setBusy(true);
    const x = await postMessage(id, k, msg.trim());
    setBusy(false);
    if (!x.ok) { setNote(x.error); return; }
    setMsg(""); setNote(""); reload();
  }

  const templates = isArtist ? (t.settings?.templates?.length ? t.settings.templates : DEFAULT_TEMPLATES) : [];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-start">
      <div className="grid gap-6 min-w-0">
        <StageTrack stage={r.stage} />

        <Actions t={t} id={id} k={k} reload={reload} />

        <section aria-label="Messages" className="grid gap-3">
          <Bubble mine={!isArtist} who={isArtist ? r.name : "You"} when={r.created_at} kind="brief">
            <p className="font-bold">Night brief</p>
            <p className="text-sm">{[r.event_date && dayLong(r.event_date), r.city, r.venue, roomLabel(r.room_size), r.set_length, r.budget_band && `Budget ${r.budget_band}`].filter(Boolean).join(" · ")}</p>
            {r.other_acts && <p className="text-sm">Other acts: {r.other_acts}</p>}
            {r.message && <p className="mt-2 whitespace-pre-line">{r.message}</p>}
          </Bubble>
          {t.messages.map((m) => <Message key={m.id} m={m} t={t} />)}
        </section>

        {!closed && (
          <form onSubmit={send} className="grid gap-2 border-4 border-ink bg-cream p-4">
            <label className="grid gap-1">
              <span className="font-bold">Message {isArtist ? r.name.split(" ")[0] : t.artist?.name}</span>
              <textarea className={field} rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={isArtist ? "Ask about the room, the set time, the gear" : "Answer their questions, share the plan"} />
            </label>
            {templates.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label="Saved replies">
                {templates.map((tp) => (
                  <button key={tp.name} type="button" onClick={() => setMsg(tp.body)} className="text-sm font-bold px-2 py-1 border-2 border-ink hover:bg-acid-yellow">{tp.name}</button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={busy} className={btn}>{busy ? "Sending..." : "Send"}</button>
              <p className="text-xs text-ink/60 flex-1 min-w-[200px]">Keep talks on CCD until the booking is confirmed. Numbers and emails show once it is.</p>
            </div>
            {note && <p className="text-sm font-bold text-magenta" role="alert">{note}</p>}
          </form>
        )}

        {r.stage === "confirmed" && r.event_date && r.event_date <= today && <Reviews t={t} id={id} k={k} reload={reload} />}
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-28">
        {isArtist ? <FitCard t={t} /> : <ArtistCard t={t} />}
        <div className="border-4 border-ink bg-cream p-4">
          <p className="font-display text-xl mb-2">The night</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="font-bold">Date</dt><dd>{r.event_date ? dayLong(r.event_date) : "Not set"}</dd>
            <dt className="font-bold">City</dt><dd>{r.city ?? "Not set"}</dd>
            {r.venue && (<><dt className="font-bold">Venue</dt><dd>{r.venue}</dd></>)}
            {r.room_size && (<><dt className="font-bold">Room</dt><dd>{roomLabel(r.room_size)}</dd></>)}
            {r.set_length && (<><dt className="font-bold">Asked</dt><dd>{r.set_length}</dd></>)}
            {r.budget_band && (<><dt className="font-bold">Budget</dt><dd>{r.budget_band}</dd></>)}
            {r.org && (<><dt className="font-bold">For</dt><dd>{r.org}</dd></>)}
            <dt className="font-bold">On the table</dt>
            <dd>{r.fee_inr ? inrFull(r.fee_inr) : "No fee yet"}{r.set_terms ? `, ${r.set_terms}` : ""}</dd>
          </dl>
        </div>
        {r.stage === "confirmed" && <Link href={receiptPath(id, k)} className={`${btn} text-center`}>Booking receipt</Link>}
      </aside>
    </div>
  );
}

function Actions({ t, id, k, reload }: { t: Thread; id: string; k: string | null; reload: () => void }) {
  const r = t.request;
  const [mode, setMode] = useState<"" | "interested" | "counter" | "decline">("");
  const [fee, setFee] = useState(r.fee_inr ? String(r.fee_inr) : "");
  const [setTerms, setSetTerms] = useState(r.set_terms ?? r.set_length ?? "");
  const [reason, setReason] = useState("Not free that date");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const closed = r.stage === "declined" || r.stage === "cancelled";

  async function go(action: string, feeN: number | null, set: string | null, n: string | null) {
    setBusy(true); setErr("");
    const x = await actOn(id, k, action, feeN, set, n);
    setBusy(false);
    if (!x.ok) { setErr(x.error); return; }
    setMode(""); setNote(""); reload();
  }
  const feeNum = fee.trim() ? Math.round(Number(fee.replace(/[^\d.]/g, ""))) : null;

  if (closed) {
    return (
      <div className="border-4 border-ink bg-cream p-4">
        <p className="font-display text-xl">{r.stage === "declined" ? (t.role === "artist" ? "You declined this." : `${t.artist?.name ?? "The artist"} can't do this one.`) : "This request was withdrawn."}</p>
        {r.declined_reason && <p className="text-ink/80 mt-1">Reason: {r.declined_reason}</p>}
        {t.role === "requester" && <Link href="/book" className={`${btnAlt} mt-3`}>Find another artist</Link>}
      </div>
    );
  }

  if (t.role === "requester") {
    const terms = r.fee_inr ? `${inrFull(r.fee_inr)}${r.set_terms ? ` for ${r.set_terms}` : ""}` : "";
    return (
      <div className="border-4 border-ink bg-cream p-4 grid gap-3">
        {r.stage === "sent" && <p><b>Sent.</b> {t.artist?.name ?? "The artist"} has not opened it yet. Most artists answer within a few days.</p>}
        {r.stage === "seen" && <p><b>Seen.</b> {t.artist?.name ?? "The artist"} opened your brief.</p>}
        {(r.stage === "interested" || r.stage === "countered") && (
          terms ? (
            <div className="grid gap-2">
              <p className="font-display text-2xl leading-tight">{r.stage === "countered" ? "Counter offer" : "Interested"}: {terms}</p>
              <div className="flex flex-wrap gap-3">
                <button disabled={busy} onClick={() => go("accept", null, null, null)} className={btn}>Accept {inrFull(r.fee_inr!)}</button>
              </div>
              <p className="text-xs text-ink/60">Accepting asks {t.artist?.name ?? "the artist"} to confirm. No payment through CCD for now; you settle the fee with them.</p>
            </div>
          ) : <p><b>Interested.</b> They have not named a fee yet. Ask in the thread; they add it with a counter offer.</p>
        )}
        {r.stage === "accepted" && <p><b>You accepted.</b> Waiting for {t.artist?.name ?? "the artist"} to confirm.</p>}
        {r.stage === "confirmed" && <p className="font-display text-2xl">Confirmed. See you on the night.</p>}
        <button disabled={busy} onClick={() => { const why = window.prompt("Withdraw this request? Tell them why (optional)."); if (why !== null) go("cancel", null, null, why); }}
          className="justify-self-start text-sm font-bold underline underline-offset-4">{r.stage === "confirmed" ? "Cancel the booking" : "Withdraw request"}</button>
        {err && <p className="text-sm font-bold text-magenta" role="alert">{err}</p>}
      </div>
    );
  }

  // artist
  return (
    <div className="border-4 border-ink bg-cream p-4 grid gap-3">
      {r.stage === "accepted" && (
        <div className="grid gap-2 border-4 border-ink bg-acid-yellow p-3">
          <p className="font-display text-2xl leading-tight">{r.name} accepted {r.fee_inr ? inrFull(r.fee_inr) : "your terms"}{r.set_terms ? ` for ${r.set_terms}` : ""}.</p>
          <button disabled={busy} onClick={() => go("confirm", null, null, null)} className="justify-self-start font-display text-lg px-5 py-3 border-4 border-ink bg-ink text-acid-yellow hover:bg-magenta hover:text-cream">Confirm booking</button>
          <p className="text-xs">This marks the day as Playing in your calendar and gives you both a receipt.</p>
        </div>
      )}
      {r.stage === "confirmed" ? <p className="font-display text-2xl">Confirmed.</p> : (
        <>
          <p className="font-bold">{r.stage === "sent" || r.stage === "seen" ? "Answer this request" : "Change your answer"}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Answer">
            {(["interested", "counter", "decline"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(mode === m ? "" : m)}
                className={`font-display px-4 py-2 border-4 border-ink ${mode === m ? "bg-ink text-cream" : m === "decline" ? "bg-cream hover:bg-ink/10" : "bg-acid-yellow hover:bg-ink hover:text-acid-yellow"}`}>
                {m === "interested" ? "Interested" : m === "counter" ? "Counter" : "Decline"}
              </button>
            ))}
          </div>
          {(mode === "interested" || mode === "counter") && (
            <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); if (mode === "counter" && !feeNum && !setTerms.trim()) { setErr("Add a fee or a set to counter with."); return; } go(mode, feeNum, setTerms.trim() || null, note.trim() || null); }}>
              <div className="grid sm:grid-cols-2 gap-2">
                <label className="grid gap-1"><span className="text-sm font-bold">Your fee in ₹ {mode === "interested" && <span className="font-normal text-ink/60">(optional)</span>}</span>
                  <input className={field} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="40000" /></label>
                <label className="grid gap-1"><span className="text-sm font-bold">Set</span>
                  <input className={field} value={setTerms} onChange={(e) => setSetTerms(e.target.value)} placeholder="2 hour DJ set" /></label>
              </div>
              <label className="grid gap-1"><span className="text-sm font-bold">Note <span className="font-normal text-ink/60">(optional)</span></span>
                <textarea className={field} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Travel, gear, timing" /></label>
              <button disabled={busy} className={`${btn} justify-self-start`}>{busy ? "Sending..." : mode === "counter" ? "Send counter offer" : "Send interested"}</button>
            </form>
          )}
          {mode === "decline" && (
            <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); go("decline", null, null, [reason, note.trim()].filter(Boolean).join(". ")); }}>
              <label className="grid gap-1"><span className="text-sm font-bold">Reason</span>
                <select className={field} value={reason} onChange={(e) => setReason(e.target.value)}>
                  {["Not free that date", "Budget is too low", "Not the right fit for my sound", "Too far to travel", "Other"].map((x) => <option key={x}>{x}</option>)}
                </select></label>
              <label className="grid gap-1"><span className="text-sm font-bold">Note <span className="font-normal text-ink/60">(optional)</span></span>
                <input className={field} value={note} onChange={(e) => setNote(e.target.value)} /></label>
              <button disabled={busy} className={`${btnAlt} justify-self-start`}>{busy ? "Sending..." : "Decline"}</button>
            </form>
          )}
        </>
      )}
      {err && <p className="text-sm font-bold text-magenta" role="alert">{err}</p>}
    </div>
  );
}

function Bubble({ mine, who, when, children, kind }: { mine: boolean; who: string; when: string; children: React.ReactNode; kind?: string }) {
  return (
    <div className={`max-w-[88%] ${mine ? "justify-self-end" : "justify-self-start"}`}>
      <p className={`text-xs font-bold text-ink/60 mb-1 ${mine ? "text-right" : ""}`}>{who} · {new Date(when).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
      <div className={`border-4 border-ink px-4 py-3 ${mine ? "bg-acid-yellow" : "bg-cream"} ${kind === "brief" ? "chunk-shadow" : ""}`}>{children}</div>
    </div>
  );
}

function Message({ m, t }: { m: ThreadMsg; t: Thread }) {
  const artist = t.artist?.name ?? "Artist";
  const name = m.author_role === "artist" ? artist : m.author_role === "requester" ? t.request.name : m.author_role === "ops" ? "CCD" : "CCD";
  const mine = m.author_role === t.role;
  if (m.kind !== "message") {
    const what: Record<string, string> = {
      interested: `${name} is interested`, counter: `${name} sent a counter offer`, declined: `${name} declined`, accepted: `${name} accepted`,
      confirmed: `${name} confirmed the booking`, cancelled: `${name} withdrew`, note: "Note from CCD", seen: `${name} saw it`,
    };
    const terms = [m.fee_inr ? inrFull(m.fee_inr) : "", m.set_terms ?? ""].filter(Boolean).join(", ");
    return (
      <div className="justify-self-center w-full max-w-[560px] text-center border-y-2 border-ink/25 py-2">
        <p className="font-bold">{what[m.kind] ?? m.kind}{terms ? `: ${terms}` : ""}</p>
        {m.body && <p className="text-sm text-ink/75 whitespace-pre-line">{m.body}</p>}
      </div>
    );
  }
  return <Bubble mine={mine} who={mine ? "You" : name} when={m.created_at}><p className="whitespace-pre-line break-words">{m.body}</p></Bubble>;
}

function ArtistCard({ t }: { t: Thread }) {
  const a = t.artist;
  if (!a) return null;
  return (
    <Link href={artistPath(a.slug)} className="border-4 border-ink bg-cream grid grid-cols-[72px_1fr] gap-3 p-3 hover:bg-acid-yellow/40">
      {a.photo_url ? <img src={a.photo_url} alt="" className="w-[72px] h-[72px] object-cover border-2 border-ink" /> : <span className="w-[72px] h-[72px] border-2 border-ink bg-electric-blue text-cream font-display text-3xl grid place-items-center">{a.name.slice(0, 1)}</span>}
      <span className="min-w-0">
        <span className="block font-display text-xl leading-tight">{a.name}</span>
        <span className="block text-sm text-ink/75">{[normCity(a.based_city), (a.genres ?? []).slice(0, 2).join(", ")].filter(Boolean).join(" · ")}</span>
        <span className="flex gap-1.5 mt-1">
          {a.verified && <span className="text-xs font-bold px-1.5 border-2 border-ink bg-electric-blue text-cream">Verified</span>}
          {a.played_ccd && <span className="text-xs font-bold px-1.5 border-2 border-ink bg-magenta text-cream">Played CCD</span>}
        </span>
      </span>
    </Link>
  );
}

/** For the artist: how this request fits what they set. */
function FitCard({ t }: { t: Thread }) {
  const r = t.request; const s = t.settings;
  const today = todayIST();
  const rates = useMemo(() => (s?.formats ?? []).map((f: any) => Number(f.rate_from_inr)).filter((n: number) => n > 0), [s]);
  const minRate = rates.length ? Math.min(...rates) : null;
  const notice = r.event_date ? daysBetween(today, r.event_date) : null;
  const travels = !!(s?.travels_anywhere || (r.city && s?.travel_cities?.some((c) => sameCity(c, r.city))) || (r.city && sameCity(t.artist?.based_city, r.city)));
  const sig: { label: string; value: string; tone: "good" | "warn" | "info" }[] = [
    { label: "Room", value: roomLabel(r.room_size) ?? "Not given", tone: "info" },
    { label: "Budget", value: r.budget_max_inr && minRate ? (r.budget_max_inr >= minRate ? `${r.budget_band}, meets your rate from ${inrFull(minRate)}` : `${r.budget_band}, below your rate from ${inrFull(minRate)}`) : r.budget_band ?? "Not given", tone: r.budget_max_inr && minRate ? (r.budget_max_inr >= minRate ? "good" : "warn") : "info" },
    { label: "Venue", value: r.venue ?? "Not given", tone: "info" },
    { label: "Notice", value: notice == null ? "No date" : `${notice} days${s?.min_notice_days ? `, you ask for ${s.min_notice_days}` : ""}`, tone: notice != null && s?.min_notice_days ? (notice >= s.min_notice_days ? "good" : "warn") : "info" },
    { label: "City", value: `${r.city ?? "Not given"}${s ? (travels ? ", on your list" : ", not on your travel list") : ""}`, tone: s ? (travels ? "good" : "warn") : "info" },
  ];
  return (
    <div className="border-4 border-ink bg-cream p-4">
      <p className="font-display text-xl mb-2">Fit</p>
      <ul className="grid gap-1.5 text-sm">
        {sig.map((x) => (
          <li key={x.label} className="grid grid-cols-[70px_1fr] gap-2">
            <b>{x.label}</b>
            <span className={x.tone === "good" ? "font-bold" : x.tone === "warn" ? "font-bold text-magenta" : ""}>{x.value}</span>
          </li>
        ))}
      </ul>
      {!s && <p className="mt-3 text-xs text-ink/60">Set your rates, notice and travel in <Link href="/club/artist" className="underline">your booking desk</Link> to see how each request fits.</p>}
    </div>
  );
}

function Reviews({ t, id, k, reload }: { t: Thread; id: string; k: string | null; reload: () => void }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const other = t.role === "artist" ? t.request.name : t.artist?.name ?? "the artist";
  return (
    <section className="border-4 border-ink bg-cream p-4 grid gap-3">
      <p className="font-display text-2xl">How did the night go?</p>
      {t.reviews.mine ? (
        <p>Thanks. Your review shows once {other} writes theirs, or 14 days after the night. Neither of you sees the other&apos;s first.</p>
      ) : (
        <form className="grid gap-2" onSubmit={async (e) => { e.preventDefault(); const x = await review(id, k, rating, body); if (!x.ok) setErr(x.error); else reload(); }}>
          <div className="flex gap-2" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)} className={`w-11 h-11 border-4 border-ink font-display text-xl ${rating >= n ? "bg-acid-yellow" : "bg-cream"}`}>{n}</button>
            ))}
          </div>
          <textarea className={field} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.role === "artist" ? "The room, the crowd, how you were looked after" : "The set, timing, how they were to work with"} />
          <button className={`${btn} justify-self-start`}>Send review</button>
          <p className="text-xs text-ink/60">Both reviews show at the same time, after you both write one or 14 days after the night.</p>
          {err && <p className="text-sm font-bold text-magenta">{err}</p>}
        </form>
      )}
      {t.reviews.theirs && (
        <div className="border-t-2 border-ink/20 pt-3">
          <p className="font-bold">{other} gave {t.reviews.theirs.rating} of 5</p>
          {t.reviews.theirs.body && <p className="text-ink/80">{t.reviews.theirs.body}</p>}
        </div>
      )}
    </section>
  );
}
