"use client";
/**
 * The contract in the booking thread (plan ccd/v2-plan.md section 8; migration 067).
 * Once the organiser accepts, either side drafts it (club, festival or private; the deposit share; set time).
 * Each side reads it and signs with their typed name and a code we email them. Both signatures confirm the
 * booking. Then the organiser pays the deposit (Razorpay, test mode for now) and the artist marks the balance.
 */
import { useCallback, useEffect, useState } from "react";
import { call } from "@/lib/booking-desk";
import { clauses, KINDS, type Contract, type Kind } from "@/lib/contract";
import { requestSignCode, signContract, startDeposit, verifyDeposit } from "@/lib/contract-actions";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type RzpWindow = Window & { Razorpay?: new (o: Record<string, unknown>) => { open: () => void } };
const loadRzp = () =>
  new Promise<boolean>((res) => {
    if ((window as RzpWindow).Razorpay) return res(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(true); s.onerror = () => res(false);
    document.body.appendChild(s);
  });

export default function ContractPanel({ id, urlKey, stage, onChange }: { id: string; urlKey: string | null; stage: string; onChange: () => void }) {
  const [c, setC] = useState<Contract | null | undefined>(undefined);
  const [role, setRole] = useState<"artist" | "requester" | null>(null);
  const [tick, setTick] = useState(0);
  const [drafting, setDrafting] = useState(false);
  const [kind, setKind] = useState<Kind>("club");
  const [pct, setPct] = useState(50);
  const [setTime, setSetTime] = useState("");
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    call<{ contract: Contract | null; role: "artist" | "requester" }>("contract_get", { p_id: id, p_key: urlKey }).then((r) => {
      if (!live) return;
      if (r.ok) { setC(r.data.contract); setRole(r.data.role); } else setC(null);
    });
    return () => { live = false; };
  }, [id, urlKey, tick]);
  const refresh = useCallback(() => { setTick((t) => t + 1); onChange(); }, [onChange]);

  if (!["accepted", "confirmed"].includes(stage) || c === undefined) return null;

  const draft = async () => {
    setBusy(true); setMsg(null);
    const r = await call("contract_draft", { p_id: id, p_key: urlKey, p_kind: kind, p_deposit_pct: pct, p_set_time: setTime || null, p_notes: notes || null });
    setBusy(false);
    if (!r.ok) { setMsg(r.error); return; }
    setDrafting(false); setSentTo(null); setCode(""); refresh();
  };
  const askCode = async () => {
    setBusy(true); setMsg(null);
    const r = await requestSignCode(id, urlKey);
    setBusy(false);
    if (r.ok) setSentTo(r.sentTo); else setMsg(r.error);
  };
  const sign = async () => {
    setBusy(true); setMsg(null);
    const r = await signContract(id, urlKey, name, code);
    setBusy(false);
    if (!r.ok) { setMsg(r.error); return; }
    setSentTo(null); setCode(""); refresh();
  };
  const pay = async () => {
    setBusy(true); setMsg(null);
    const r = await startDeposit(id, urlKey);
    if (!r.ok) { setBusy(false); setMsg(r.error); return; }
    if (!(await loadRzp())) { setBusy(false); setMsg("The payment window did not load. Check your connection."); return; }
    const Rzp = (window as RzpWindow).Razorpay!;
    new Rzp({
      key: r.keyId, order_id: r.orderId, amount: r.amount, currency: "INR", name: "Cats Can Dance", description: r.label, theme: { color: "#B6EF36" },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const v = await verifyDeposit(resp);
        setBusy(false);
        if (!v.ok) setMsg(v.error); else refresh();
      },
      modal: { ondismiss: () => setBusy(false) },
    }).open();
  };
  const balance = async () => {
    setBusy(true); setMsg(null);
    const r = await call("contract_balance_paid", { p_id: id, p_key: urlKey, p_method: "cash" });
    setBusy(false);
    if (!r.ok) setMsg(r.error); else refresh();
  };

  const mine = role === "artist" ? c?.artist_signed : c?.requester_signed;
  const theirs = role === "artist" ? c?.requester_signed : c?.artist_signed;

  // ── No contract yet, or redrafting ──
  if (!c || drafting) {
    return (
      <section className="ct k-surface rounded-[22px] p-5" aria-labelledby="ct-h">
        <span className="k-m">Next step</span>
        <h2 className="k-d mt-1 text-[30px]" id="ct-h">{c ? "Change the contract" : "Put it in a contract"}</h2>
        <p className="k-b mt-2 text-[15px]">We write it from what you agreed here: the date, the venue, the fee, the rider and the travel. Both of you sign, and the booking is locked.{c ? " Changing it clears both signatures." : ""}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="What kind of show">
          {KINDS.map((k) => (
            <button key={k.key} type="button" role="radio" aria-checked={kind === k.key} className={`ct-kind${kind === k.key ? " on" : ""}`} onClick={() => setKind(k.key)}>
              <b>{k.label}</b><span className="k-b">{k.line}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="k-b mr-1 text-sm">Deposit</span>
          {[0, 30, 50, 100].map((n) => <button key={n} type="button" className={`k-pill cursor-pointer border-0${pct === n ? " ct-on" : ""}`} onClick={() => setPct(n)}>{n === 0 ? "None" : `${n}%`}</button>)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm"><span className="k-b">Set time (optional)</span><input className="k-field" value={setTime} onChange={(e) => setSetTime(e.target.value)} maxLength={60} placeholder="e.g. 23:30 to 01:00" /></label>
          <label className="grid gap-1 text-sm"><span className="k-b">Anything else you agreed (optional)</span><input className="k-field" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="e.g. two guest list spots" /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="k-btn k-btn--key" disabled={busy} onClick={draft}>{busy ? "Writing it" : c ? "Make the new version" : "Write the contract"}</button>
          {c && <button type="button" className="k-btn k-btn--ghost" onClick={() => setDrafting(false)}>Keep the current one</button>}
        </div>
        {msg && <p className="k-note k-note--warn mt-3" role="alert">{msg}</p>}
      </section>
    );
  }

  const b = c.body;
  return (
    <section className="ct k-surface rounded-[22px] p-5" aria-labelledby="ct-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="k-m">Contract · version {c.version} · {KINDS.find((k) => k.key === c.kind)?.label}</span>
          <h2 className="k-d mt-1 text-[30px]" id="ct-h">{c.status === "signed" ? "Signed by both of you" : mine ? "Waiting for the other side" : "Read it and sign"}</h2>
        </div>
        <a className="k-btn k-btn--ghost k-btn--s" href={`/bookings/${id}/contract${urlKey ? `?k=${urlKey}` : ""}`} target="_blank" rel="noopener">Print or save as PDF</a>
      </div>

      <div className="ct-money mt-4">
        <div><span className="k-m">Fee</span><b>{inr(b.fee_inr)}</b></div>
        <div><span className="k-m">Deposit</span><b>{b.deposit_inr ? inr(b.deposit_inr) : "None"}</b>{c.deposit_paid_at && <em>Paid</em>}</div>
        <div><span className="k-m">Balance</span><b>{inr(b.balance_inr)}</b>{c.balance_paid_at && <em>Paid</em>}</div>
        <div><span className="k-m">Artist gets</span><b>{inr(b.artist_gets_inr)}</b></div>
      </div>

      <details className="ct-doc mt-4" open={c.status !== "signed" && !mine}>
        <summary>Read the contract</summary>
        <ol>{clauses(b, c.kind).map((s) => <li key={s.h}><b>{s.h}</b>{s.p.map((p) => <p key={p}>{p}</p>)}</li>)}</ol>
        <p className="k-b text-xs">A first draft written in plain English. A lawyer reviews this template before money moves through it.</p>
      </details>

      <div className="ct-sigs mt-4">
        {(["artist", "requester"] as const).map((side) => {
          const s = side === "artist" ? c.artist_signed : c.requester_signed;
          return (
            <div key={side} className={s ? "done" : ""}>
              <span className="k-m">{side === "artist" ? b.artist.name : b.organiser.org || b.organiser.name}</span>
              {s ? <><b className="ct-sig">{s.name}</b><span className="k-b text-xs">Signed {when(s.at)}</span></> : <span className="k-b">Not signed yet</span>}
            </div>
          );
        })}
      </div>

      {c.status === "draft" && !mine && (
        <div className="mt-4 grid gap-2">
          <label className="grid gap-1 text-sm"><span className="k-b">Type your full name to sign</span><input className="k-field" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" /></label>
          {!sentTo ? (
            <button type="button" className="k-btn k-btn--key justify-self-start" disabled={busy || name.trim().length < 2} onClick={askCode}>{busy ? "Sending" : "Email me a code to sign"}</button>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-sm"><span className="k-b">The code we sent to {sentTo}</span><input className="k-field max-w-[180px] tracking-[.3em]" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" /></label>
              <button type="button" className="k-btn k-btn--key" disabled={busy || code.length !== 6} onClick={sign}>{busy ? "Signing" : "Sign"}</button>
              <button type="button" className="k-btn k-btn--ghost" disabled={busy} onClick={askCode}>Send it again</button>
            </div>
          )}
        </div>
      )}
      {c.status === "draft" && mine && !theirs && <p className="k-b mt-3 text-sm">You signed. The booking locks when the other side signs too. Send them a nudge in the thread.</p>}
      {c.status === "draft" && <button type="button" className="k-btn k-btn--ghost k-btn--s mt-3" onClick={() => { setKind(c.kind); setPct(b.deposit_pct); setSetTime(b.set_time ?? ""); setNotes(b.notes ?? ""); setDrafting(true); }}>Change something</button>}

      {c.status === "signed" && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {role === "requester" && b.deposit_inr > 0 && !c.deposit_paid_at && <button type="button" className="k-btn k-btn--key" disabled={busy} onClick={pay}>Pay the {inr(b.deposit_inr)} deposit</button>}
          {role === "artist" && !c.balance_paid_at && <button type="button" className="k-btn k-btn--ghost" disabled={busy} onClick={balance}>Mark the balance paid</button>}
          {c.deposit_paid_at && <span className="k-b text-sm">Deposit paid {when(c.deposit_paid_at)}. We hold it until after the show.</span>}
          {c.body_hash && <span className="k-b w-full text-xs">Record {c.body_hash.slice(0, 16)}</span>}
        </div>
      )}
      {msg && <p className="k-note k-note--warn mt-3" role="alert">{msg}</p>}
    </section>
  );
}
