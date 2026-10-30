import { useEffect, useState } from "react";

type Swap = { id: string; event_label: string; swap_type: "sell" | "trade" | "upgrade"; ticket_count: number; face_value_inr: number | null; tier: string | null; note: string | null; created_at: string };
const LABEL = { sell: "Selling at face value", trade: "Trade", upgrade: "Upgrade" } as const;

const inp = "w-full border-4 border-ink bg-cream p-3 text-ink";

export default function PassItOn() {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | string>("idle");
  const [type, setType] = useState<"sell" | "trade" | "upgrade">("sell");

  useEffect(() => {
    fetch("/api/ticket-swaps").then((r) => r.json()).then((d) => setSwaps(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setState("sending");
    const f = Object.fromEntries(new FormData(ev.currentTarget).entries());
    const r = await fetch("/api/ticket-swaps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, swap_type: type }) });
    const d = await r.json().catch(() => ({}));
    setState(r.ok ? "done" : d.error || "Something went wrong.");
  }

  return (
    <section id="pass-it-on" className="container py-12 md:py-16">
      <div className="border-b-4 border-ink pb-6 mb-8">
        <span className="inline-block font-display text-xs uppercase px-3 py-1 border-2 border-ink mb-3 bg-electric-blue text-cream">Find · Pass it on</span>
        <h2 className="font-display text-4xl md:text-5xl text-ink uppercase leading-tight">Pass it on</h2>
        <p className="text-ink/60 mt-2 max-w-2xl">
          Can&apos;t make it? Hand your ticket to someone who can. Face value only, so nobody gets squeezed. We do not take payments or hold tickets. We check each listing before it goes up and put you in touch with the buyer.
        </p>
      </div>

      {swaps.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {swaps.map((s) => (
            <article key={s.id} className="border-4 border-ink p-5 bg-cream chunk-shadow">
              <p className="font-display text-xs uppercase text-ink/60">{LABEL[s.swap_type]}</p>
              <h3 className="font-display text-xl uppercase text-ink mt-1">{s.event_label}</h3>
              <p className="text-sm text-ink/80 mt-2">
                {s.ticket_count} ticket{s.ticket_count > 1 ? "s" : ""}{s.tier ? `, ${s.tier}` : ""}
                {s.face_value_inr != null ? `, ₹${s.face_value_inr.toLocaleString("en-IN")} each` : ""}
              </p>
              {s.note && <p className="text-sm text-ink/70 mt-2">{s.note}</p>}
              <a href={`mailto:hello@catscandance.com?subject=${encodeURIComponent("Pass it on: " + s.event_label)}&body=${encodeURIComponent("Listing " + s.id)}`}
                 className="inline-block mt-3 font-display text-sm uppercase px-3 py-2 border-4 border-ink bg-acid-yellow text-ink">
                I want this
              </a>
            </article>
          ))}
        </div>
      ) : (
        <p className="mb-8 text-ink/70">No listings yet. Be the first.</p>
      )}

      {!open ? (
        <button onClick={() => setOpen(true)} className="font-display uppercase px-5 py-3 border-4 border-ink bg-ink text-cream chunk-shadow">List a ticket</button>
      ) : state === "done" ? (
        <p className="border-4 border-ink p-6 font-display uppercase text-ink">Got it. We will review it and email you before it goes live.</p>
      ) : (
        <form onSubmit={submit} className="border-4 border-ink p-6 grid gap-4 max-w-2xl bg-cream chunk-shadow">
          <div className="flex gap-2 flex-wrap">
            {(["sell", "trade", "upgrade"] as const).map((t) => (
              <button type="button" key={t} onClick={() => setType(t)}
                className={`font-display text-xs uppercase px-3 py-2 border-2 border-ink ${type === t ? "bg-ink text-cream" : "bg-cream text-ink"}`}>
                {LABEL[t]}
              </button>
            ))}
          </div>
          <input name="event_label" required minLength={2} maxLength={160} placeholder="Event and date" className={inp} />
          <div className="grid grid-cols-2 gap-4">
            <input name="ticket_count" type="number" min={1} max={10} defaultValue={1} aria-label="Number of tickets" className={inp} />
            <input name="face_value_inr" type="number" min={0} max={500000} required={type === "sell"} placeholder={type === "sell" ? "Face value per ticket (INR)" : "Face value (INR), optional"} className={inp} />
          </div>
          <input name="tier" maxLength={60} placeholder={type === "upgrade" ? "What you have and what you want" : type === "trade" ? "What you want in return" : "Ticket tier, optional"} className={inp} />
          <textarea name="note" maxLength={400} rows={3} placeholder="Anything else a buyer should know" className={inp} />
          <input name="contact" required minLength={5} maxLength={160} placeholder="Your email or WhatsApp (kept private)" className={inp} />
          <p className="text-xs text-ink/60">Listings above face value are not accepted. Contact details are never shown on the page.</p>
          <button disabled={state === "sending"} className="font-display uppercase px-5 py-3 border-4 border-ink bg-acid-yellow text-ink">
            {state === "sending" ? "Sending" : "Submit for review"}
          </button>
          {state !== "idle" && state !== "sending" && <p className="text-sm text-red-600">{state}</p>}
        </form>
      )}
    </section>
  );
}
