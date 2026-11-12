"use client";
/**
 * One booking thread (board F38-A-Bookings, the five steps to the gig). Both sides use it: the artist
 * answers (interested, counter, decline, accept) and the promoter confirms or withdraws.
 * Every action goes through booking_act, which checks who may do what.
 */
import { useCallback, useEffect, useState } from "react";
import { loadThread, postMessage, actOn, keyFor, type Thread as T } from "@/lib/booking-desk";
import { STAGE_LABEL, stageStep, dayLong, inrShort, inrFull, DEFAULT_TEMPLATES } from "@/lib/desk";
import ContractPanel from "@/components/ContractPanel";

const STEPS = ["Sent", "Seen", "Answer", "Accepted", "Confirmed"];
/** What an action says in the thread when it came without a note. */
const KIND_LINE: Record<string, string> = { accepted: "Accepted the terms.", confirmed: "Confirmed the booking.", interested: "Interested.", declined: "Can't do this one.", cancelled: "Withdrew the request.", seen: "Seen." };

export default function Thread({ id, urlKey }: { id: string; urlKey: string | null }) {
  const [t, setT] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [fee, setFee] = useState("");
  const key = urlKey ?? (typeof window !== "undefined" ? keyFor(id) : null);
  const reload = useCallback(() => loadThread(id, key).then((r) => (r.ok ? (setT(r.data), setErr(null)) : setErr(r.error))), [id, key]);
  useEffect(() => { reload(); }, [reload]);

  if (err) return <p className="k-note k-note--warn" role="alert">{err === "not found" || /denied|not allowed/i.test(err) ? "This thread is not yours, or the link is old. Sign in with the email you used." : err}</p>;
  if (!t) return <p className="k-b" aria-busy="true">Loading the thread</p>;
  const r = t.request;
  const artistSide = t.role === "artist";
  const step = stageStep(r.stage);
  const closed = ["declined", "cancelled", "confirmed"].includes(r.stage);
  const act = async (action: string, feeInr: number | null = null) => {
    setBusy(true);
    const res = await actOn(id, key, action, feeInr, null, msg.trim() || null);
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setMsg(""); setFee(""); reload();
  };
  const send = async () => {
    if (!msg.trim()) return;
    setBusy(true);
    const res = await postMessage(id, key, msg.trim());
    setBusy(false);
    if (res.ok) { setMsg(""); reload(); } else setErr(res.error);
  };
  const feeN = Number(fee.replace(/[^\d]/g, "")) || null;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_380px]">
      <div className="grid content-start gap-6">
        <div>
          <span className="k-tag">{STAGE_LABEL[r.stage]}</span>
          <h1 className="k-d mt-3 text-[40px] md:text-[56px]">{artistSide ? [r.name, r.org].filter(Boolean).join(", ") : t.artist?.name ?? "Your ask"}</h1>
          <p className="k-b mt-2">{[r.event_date ? dayLong(r.event_date) : null, r.venue, r.city].filter(Boolean).join(" · ")}</p>
        </div>
        <ol className="m-0 grid list-none grid-cols-5 gap-2 p-0" aria-label="Steps to the gig">
          {STEPS.map((s, i) => (
            <li key={s} className="grid gap-2">
              <span className="h-1.5 rounded-full" style={{ background: i <= step && r.stage !== "cancelled" && r.stage !== "declined" ? "var(--k-pc)" : "var(--k-hair2)" }} />
              <span className="text-[12px]" style={{ color: i <= step ? "var(--k-tx)" : "var(--k-t3)" }}>{s}</span>
            </li>
          ))}
        </ol>
        <ul className="m-0 grid list-none gap-3 p-0">
          {r.message && <Bubble who={artistSide ? r.name : "You"} mine={!artistSide} body={r.message} at={r.created_at} />}
          {t.messages.map((m) => (
            <Bubble key={m.id} who={m.author_role === "artist" ? (artistSide ? "You" : t.artist?.name ?? "Artist") : m.author_role === "requester" ? (artistSide ? r.name : "You") : "Cats Can Dance"}
              mine={(m.author_role === "artist") === artistSide && m.author_role !== "system" && m.author_role !== "ops"}
              body={[m.fee_inr ? `Fee: ${inrFull(m.fee_inr)}` : null, m.set_terms, m.body].filter(Boolean).join("\n") || (KIND_LINE[m.kind] ?? "")} at={m.created_at} />
          ))}
        </ul>
        <ContractPanel id={id} urlKey={key} stage={r.stage} onChange={reload} />
        {!closed && (
          <div className="k-surface grid gap-3 rounded-[22px] p-4">
            <label className="sr-only" htmlFor="msg">Message</label>
            <textarea id="msg" className="k-field" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={2000} placeholder={artistSide ? "Reply, or add a note to your answer" : "Write to the artist"} />
            {artistSide && (
              <div className="flex flex-wrap gap-2">
                {(t.settings?.templates?.length ? t.settings.templates : DEFAULT_TEMPLATES).map((x) => (
                  <button key={x.name} type="button" className="k-pill cursor-pointer border-0" onClick={() => setMsg(x.body)}>{x.name}</button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="k-btn k-btn--ghost" onClick={send} disabled={busy || !msg.trim()}>Send</button>
              {artistSide && ["sent", "seen", "interested", "countered"].includes(r.stage) && (
                <>
                  <button type="button" className="k-btn k-btn--key" disabled={busy} onClick={() => act("accept", r.fee_inr ?? r.budget_max_inr ?? null)}>Accept</button>
                  {r.stage !== "interested" && <button type="button" className="k-btn k-btn--ghost" disabled={busy} onClick={() => act("interested")}>Interested</button>}
                  <button type="button" className="k-btn k-btn--ghost" disabled={busy} onClick={() => act("decline")}>Decline</button>
                </>
              )}
              {!artistSide && ["interested", "countered", "accepted"].includes(r.stage) && r.last_actor === "artist" && (
                <button type="button" className="k-btn k-btn--key" disabled={busy} onClick={() => act(r.stage === "accepted" ? "confirm" : "accept", r.fee_inr)}>{r.stage === "accepted" ? "Confirm the booking" : "Accept their terms"}</button>
              )}
              {!artistSide && <button type="button" className="k-btn k-btn--ghost" disabled={busy} onClick={() => act("cancel")}>Withdraw</button>}
            </div>
            {artistSide && ["sent", "seen", "interested", "countered"].includes(r.stage) && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="fee">Your fee</label>
                <input id="fee" className="k-field max-w-[220px]" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Counter, e.g. 40000" />
                <button type="button" className="k-btn k-btn--ghost" disabled={busy || !feeN} onClick={() => act("counter", feeN)}>Send counter{feeN ? ` of ${inrShort(feeN)}` : ""}</button>
              </div>
            )}
          </div>
        )}
      </div>
      <aside className="k-plinth grid content-start gap-4 p-6">
        <span className="k-m">The brief</span>
        <dl className="m-0 grid gap-3 text-[15px]">
          {[["Date", r.event_date ? dayLong(r.event_date) : null], ["City", r.city], ["Venue", r.venue], ["Set", r.set_length], ["Budget", r.budget_band], ["Fee agreed", r.fee_inr ? inrFull(r.fee_inr) : null], ["Also on the bill", r.other_acts]]
            .filter(([, v]) => v).map(([k, v]) => <div key={k as string}><dt className="k-m">{k}</dt><dd className="m-0 mt-1">{v}</dd></div>)}
        </dl>
        <p className="k-b m-0 text-sm">Once the organiser accepts, either of you can put it in a contract here. Both sign with a code we email, and the deposit is held by us until after the show.</p>
      </aside>
    </div>
  );
}

function Bubble({ who, mine, body, at }: { who: string; mine: boolean; body: string; at: string }) {
  return (
    <li className={`max-w-[85%] rounded-[18px] px-4 py-3 ${mine ? "ml-auto" : ""}`} style={{ background: mine ? "var(--k-pc-soft)" : "rgba(255,255,255,.05)" }}>
      <span className="k-m">{who} · {new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
      <p className="m-0 mt-1 whitespace-pre-line text-[15px]">{body}</p>
    </li>
  );
}
