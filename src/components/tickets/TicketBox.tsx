/**
 * TicketBox: the whole booking flow in one ticket-shaped panel.
 *
 *   pick     → tiers with a −/+ stepper and a running total
 *   details  → name, email, phone, optional code, order summary, one button
 *   (paid)   → Razorpay opens over the page; free orders skip it
 *   done     → straight to /tickets/order with the QR codes
 *
 * Other states: loading, sold out (waiting list), not on sale yet (RSVP or
 * "tell me when"), and past. Used on the event page, inside the mobile
 * drawer, and on /tickets/[slug].
 */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { payOrder } from "@/lib/razorpay-client";
import { checkPromo, joinWaitlist, loadTiers, placeOrder, type Tier } from "@/lib/booking";
import { inr } from "@/lib/nights";

type Props = {
  slug: string;
  title: string;
  /** "Wed 25 Nov 2026 · 8 PM" style line shown in the summary. */
  when: string;
  venue?: string | null;
  past?: boolean;
  rsvpOpen?: boolean;
  onRsvp?: () => void;
  /** Called once tiers load, so the page can show "Free" / "From ₹500" in its sticky bar. */
  onTiers?: (tiers: Tier[]) => void;
  /** Background behind the ticket, so the perforation notches match it. */
  perfBg?: string;
  id?: string;
};

type Step = "pick" | "details";
const field = "w-full border-4 border-ink bg-cream px-3 py-3 text-ink text-base placeholder:text-ink/45 focus:outline-none focus:ring-4 focus:ring-electric-blue/40";
const REMEMBER = "ccd:buyer";

export default function TicketBox({ slug, title, when, venue, past, rsvpOpen, onRsvp, onTiers, perfBg, id }: Props) {
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [step, setStep] = useState<Step>("pick");
  const [f, setF] = useState({ name: "", email: "", phone: "" });
  const [touched, setTouched] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slug || past) { setTiers([]); return; }
    let live = true;
    loadTiers(slug).then((t) => {
      if (!live) return;
      setTiers(t);
      onTiers?.(t);
      // One tier with spots left: start on 1 ticket so the button is ready.
      const open = t.filter((x) => !x.sold_out);
      if (open.length === 1) setQty({ [open[0].id]: 1 });
    }).catch(() => live && setTiers([]));
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBER) ?? "null");
      if (saved?.email) setF({ name: saved.name ?? "", email: saved.email, phone: saved.phone ?? "" });
    } catch {}
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, past]);

  useEffect(() => { if (step === "details" && !f.name) nameRef.current?.focus(); }, [step, f.name]);

  const lines = useMemo(() => (tiers ?? []).filter((t) => (qty[t.id] ?? 0) > 0).map((t) => ({ t, n: qty[t.id] })), [tiers, qty]);
  const count = lines.reduce((a, l) => a + l.n, 0);
  const subtotal = lines.reduce((a, l) => a + l.n * l.t.price_inr, 0);
  const discount = promo ? Math.min(promo.discount, subtotal) : 0;
  const total = subtotal - discount;
  const allFree = (tiers ?? []).every((t) => t.price_inr === 0);
  const anyOpen = (tiers ?? []).some((t) => !t.sold_out);

  // A promo was checked against an older subtotal: re-check when the basket changes.
  useEffect(() => {
    if (!promo) return;
    checkPromo(slug, promo.code, subtotal).then((r) => r.ok && setPromo({ code: r.code, discount: r.discount_inr }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const set = (t: Tier, n: number) => {
    const max = Math.min(t.max_per_order, t.remaining);
    setQty({ ...qty, [t.id]: Math.max(0, Math.min(max, n)) });
    setErr("");
  };

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim());
  const nameOk = f.name.trim().length >= 2;
  const phoneOk = !f.phone.trim() || /^[+\d][\d\s-]{6,16}$/.test(f.phone.trim());

  async function applyCode() {
    if (!code.trim()) return;
    setPromoMsg("Checking...");
    const r = await checkPromo(slug, code, subtotal);
    if (r.ok) { setPromo({ code: r.code, discount: r.discount_inr }); setPromoMsg(""); }
    else { setPromo(null); setPromoMsg(r.error); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nameOk || !emailOk || !phoneOk) return;
    setBusy(true); setErr("");
    try {
      try { localStorage.setItem(REMEMBER, JSON.stringify(f)); } catch {}
      const order = await placeOrder({
        slug, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(),
        items: lines.map((l) => ({ tier: l.t.id, qty: l.n })),
        promo: promo?.code ?? (code.trim() || null),
      });
      if (!order.free) await payOrder("ticket", order.order_id, f, `${title} tickets`);
      else fetch("/api/email/ticket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: order.order_id }) }).catch(() => {});
      router.push(`/tickets/order?o=${order.order_id}&e=${encodeURIComponent(f.email.trim())}&new=1`);
    } catch (x: any) {
      setErr(x?.message ?? "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  // ── header band ──
  const priceLine = (() => {
    if (!tiers || tiers.length === 0) return null;
    const prices = tiers.map((t) => t.price_inr);
    const min = Math.min(...prices);
    if (allFree) return "Free";
    return min === 0 ? "Free and paid" : `From ${inr(min)}`;
  })();

  const shell = (body: React.ReactNode, foot?: React.ReactNode) => (
    <div id={id} className="border-4 border-ink bg-cream text-ink chunk-shadow scroll-mt-28" style={perfBg ? ({ "--perf-bg": perfBg } as React.CSSProperties) : undefined}>
      <div className="bg-ink text-cream px-5 py-4 flex items-baseline justify-between gap-3">
        <p className="font-display text-xl leading-none">Tickets</p>
        {priceLine && <p className="font-display text-acid-yellow text-lg leading-none">{priceLine}</p>}
      </div>
      <div className="px-5 py-5">{body}</div>
      {foot && (<><div className="perf" aria-hidden /><div className="px-5 pt-5 pb-5">{foot}</div></>)}
    </div>
  );

  // ── states ──
  if (past) {
    return shell(
      <div>
        <p className="font-display text-2xl leading-none mb-2">This night has happened.</p>
        <p className="text-ink/75">The next Episode is on the Episodes page.</p>
      </div>,
      <a href="/episodes" className="block text-center font-display text-lg px-5 py-3 border-4 border-ink bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors">See what&apos;s next</a>,
    );
  }

  if (tiers === null) {
    return shell(
      <div className="space-y-3" aria-busy="true" aria-label="Loading tickets">
        <div className="h-6 w-2/3 bg-ink/10" /><div className="h-4 w-1/3 bg-ink/10" /><div className="h-12 w-full bg-ink/10" />
      </div>,
    );
  }

  if (tiers.length === 0) {
    if (rsvpOpen && onRsvp) {
      return shell(
        <div>
          <p className="font-display text-2xl leading-none mb-2">Free. RSVP to get in.</p>
          <p className="text-ink/75">Put your name down and we&apos;ll hold you a spot. Capacity is small.</p>
        </div>,
        <button type="button" onClick={onRsvp} className="w-full font-display text-xl px-5 py-4 border-4 border-ink bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors">RSVP</button>,
      );
    }
    return <WaitBox slug={slug} shell={shell} soon />;
  }

  if (!anyOpen) return <WaitBox slug={slug} shell={shell} />;

  if (step === "pick") {
    return shell(
      <ul className="divide-y-2 divide-ink/15 -my-2">
        {tiers.map((t) => {
          const n = qty[t.id] ?? 0;
          const max = Math.min(t.max_per_order, t.remaining);
          const low = !t.sold_out && (t.remaining <= 20 || (t.capacity ? t.remaining / t.capacity <= 0.2 : false));
          return (
            <li key={t.id} className={`py-4 flex items-center gap-4 ${t.sold_out ? "opacity-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg leading-tight">{t.name}</p>
                {t.description && <p className="text-sm text-ink/70 leading-snug">{t.description}</p>}
                <p className="text-sm mt-1 tabular">
                  <span className="font-bold">{t.price_inr === 0 ? "Free" : inr(t.price_inr)}</span>
                  {t.sold_out ? <span className="ml-2 font-bold text-magenta">Sold out</span>
                    : low ? <span className="ml-2 font-bold text-magenta">{t.remaining} left</span>
                    : <span className="ml-2 text-ink/60">{t.remaining} left</span>}
                </p>
              </div>
              {!t.sold_out && (
                <div className="flex items-center border-4 border-ink bg-cream shrink-0" role="group" aria-label={`${t.name} tickets`}>
                  <button type="button" aria-label={`One less ${t.name}`} disabled={n === 0} onClick={() => set(t, n - 1)}
                    className="w-11 h-11 font-display text-2xl leading-none disabled:text-ink/25 hover:bg-acid-yellow focus-visible:bg-acid-yellow focus:outline-none">−</button>
                  <span className="w-9 text-center font-display text-xl tabular" aria-live="polite">{n}</span>
                  <button type="button" aria-label={`One more ${t.name}`} disabled={n >= max} onClick={() => set(t, n + 1)}
                    className="w-11 h-11 font-display text-2xl leading-none disabled:text-ink/25 hover:bg-acid-yellow focus-visible:bg-acid-yellow focus:outline-none">+</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>,
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-ink/70">{count === 0 ? "Pick your tickets" : `${count} ticket${count > 1 ? "s" : ""}`}</p>
          <p className="font-display text-2xl tabular">{count === 0 ? "" : subtotal === 0 ? "Free" : inr(subtotal)}</p>
        </div>
        <button type="button" disabled={count === 0} onClick={() => setStep("details")}
          className="w-full font-display text-xl px-5 py-4 border-4 border-ink bg-acid-yellow disabled:bg-cream disabled:text-ink/40 enabled:hover:bg-ink enabled:hover:text-acid-yellow transition-colors">
          {count === 0 ? "Choose tickets" : "Continue"}
        </button>
        {err && <p className="mt-3 text-sm font-bold text-magenta" role="alert">{err}</p>}
      </div>,
    );
  }

  // details
  return shell(
    <form id={`${slug}-checkout`} onSubmit={submit} noValidate className="grid gap-3">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          {lines.map((l) => (
            <p key={l.t.id} className="font-display text-lg leading-tight">{l.n} × {l.t.name}</p>
          ))}
          <p className="text-sm text-ink/70 mt-1">{title} · {when}{venue ? ` · ${venue}` : ""}</p>
        </div>
        <button type="button" onClick={() => { setStep("pick"); setErr(""); }} className="text-sm font-bold underline underline-offset-4 shrink-0">Change</button>
      </div>

      <label className="grid gap-1">
        <span className="text-sm font-bold">Name</span>
        <input ref={nameRef} className={field} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}
          aria-invalid={touched && !nameOk} />
        {touched && !nameOk && <span className="text-sm font-bold text-magenta">Enter the name on the guest list.</span>}
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-bold">Email</span>
        <input className={field} type="email" inputMode="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })}
          aria-invalid={touched && !emailOk} />
        {touched && !emailOk ? <span className="text-sm font-bold text-magenta">Enter an email we can send the tickets to.</span>
          : <span className="text-xs text-ink/60">Your tickets go here.</span>}
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-bold">Phone <span className="font-normal text-ink/60">(optional, for door updates)</span></span>
        <input className={field} type="tel" inputMode="tel" autoComplete="tel" placeholder="+91" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })}
          aria-invalid={touched && !phoneOk} />
        {touched && !phoneOk && <span className="text-sm font-bold text-magenta">That number looks short. Leave it empty if you like.</span>}
      </label>

      {subtotal > 0 && (
        codeOpen ? (
          <div className="grid gap-1">
            <span className="text-sm font-bold">Code</span>
            <div className="flex gap-2">
              <input className={`${field} uppercase`} value={code} onChange={(e) => { setCode(e.target.value); setPromo(null); setPromoMsg(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCode(); } }} />
              <button type="button" onClick={applyCode} className="px-4 border-4 border-ink font-display bg-cream hover:bg-acid-yellow">Apply</button>
            </div>
            {promo && <span className="text-sm font-bold text-electric-blue">{promo.code} applied, {inr(discount)} off.</span>}
            {promoMsg && <span className="text-sm text-ink/70">{promoMsg}</span>}
          </div>
        ) : (
          <button type="button" onClick={() => setCodeOpen(true)} className="justify-self-start text-sm font-bold underline underline-offset-4">Have a code?</button>
        )
      )}
    </form>,
    <div>
      {subtotal > 0 && (
        <dl className="text-sm mb-3 grid grid-cols-[1fr_auto] gap-y-1 tabular">
          {lines.map((l) => (<Fragment key={l.t.id}><dt>{l.n} × {l.t.name}</dt><dd className="text-right">{inr(l.n * l.t.price_inr)}</dd></Fragment>))}
          {discount > 0 && (<><dt>Code {promo?.code}</dt><dd className="text-right">−{inr(discount)}</dd></>)}
        </dl>
      )}
      <div className="flex items-baseline justify-between mb-4">
        <p className="font-bold">Total</p>
        <p className="font-display text-2xl tabular">{total === 0 ? "Free" : inr(total)}</p>
      </div>
      <button form={`${slug}-checkout`} disabled={busy}
        className="w-full font-display text-xl px-5 py-4 border-4 border-ink bg-acid-yellow disabled:opacity-60 enabled:hover:bg-ink enabled:hover:text-acid-yellow transition-colors">
        {busy ? (total === 0 ? "Booking..." : "Opening payment...") : total === 0 ? `Get ${count > 1 ? `${count} free tickets` : "free ticket"}` : `Pay ${inr(total)}`}
      </button>
      {err && <p className="mt-3 text-sm font-bold text-magenta" role="alert">{err}</p>}
      <p className="mt-3 text-xs text-ink/60 leading-snug">
        {total === 0 ? "Your tickets and QR codes show on the next page and go to your email." : "Pay with UPI, card or netbanking. Your tickets show on the next page and go to your email."}{" "}
        By booking you agree to the <a href="/terms" className="underline">terms</a>.
      </p>
    </div>,
  );
}

/** Sold out, or not on sale yet: a waiting list that gets first dibs. */
function WaitBox({ slug, shell, soon }: { slug: string; shell: (b: React.ReactNode, f?: React.ReactNode) => JSX.Element; soon?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<{ ok?: boolean; msg?: string; busy?: boolean }>({});
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setState({ busy: true });
    const r = await joinWaitlist(slug, name, email);
    setState(r.ok ? { ok: true, msg: soon ? "You're on the list. We'll email you when tickets drop." : `You're number ${r.position} on the waiting list. We'll email you if a spot opens.` } : { msg: r.error });
  }
  return shell(
    <div>
      <p className="font-display text-2xl leading-none mb-2">{soon ? "Tickets drop soon." : "Sold out."}</p>
      <p className="text-ink/75">{soon ? "Leave your email and you'll hear first." : "Spots open up when people pass their tickets on. Join the waiting list and we'll email you."}</p>
    </div>,
    state.ok ? <p className="font-bold" role="status">{state.msg}</p> : (
      <form onSubmit={go} className="grid gap-2">
        <input className={field} placeholder="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
        <input className={field} type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <button disabled={state.busy} className="font-display text-lg px-5 py-3 border-4 border-ink bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors disabled:opacity-60">
          {soon ? "Tell me when" : "Join the waiting list"}
        </button>
        {state.msg && <p className="text-sm font-bold text-magenta" role="alert">{state.msg}</p>}
      </form>
    ),
  );
}
