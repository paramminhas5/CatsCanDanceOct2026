/**
 * Going on any night. One button opens a sheet with:
 *   not signed in   email for a sign-in link, then the tap is applied when they come back
 *   member          Going / Interested / Not going, guest list name, join a crew
 * Crews: CCD nights need a ticket or RSVP; any other night needs Going. Ticket proof comes after matching (on Your nights).
 */
import ShareButton from "@/components/ShareButton";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { memberRpc } from "@/lib/member";
import {
  type Crowd, type PlanState, crowdLine, isScene, joinCrew, rememberPending, sendSignInLink, setPlan, useMe,
} from "@/lib/plans";

type Props = {
  nightKey: string;
  title: string;
  crowd?: Crowd;
  onChange?: () => void;
  /** card: a small button and one line; panel: full width block for a night page */
  variant?: "card" | "panel";
  /** set when the visitor already has a CCD ticket for this night */
  hasTicket?: boolean;
};

export default function Going({ nightKey, title, crowd, onChange, variant = "card", hasTicket = false }: Props) {
  const me = useMe();
  const mine: PlanState = me.plans[nightKey]?.state ?? null;
  const [open, setOpen] = useState(false);
  const line = crowdLine(crowd, mine);

  const label = mine === "going" ? "Going ✓" : mine === "interested" ? "Interested ✓" : "I'm going";
  const btn = `font-display px-4 py-2.5 border-4 border-ink transition-colors ${mine === "going" ? "bg-electric-blue text-cream" : mine === "interested" ? "bg-ink text-cream" : "bg-cream text-ink hover:bg-acid-yellow"}`;

  return (
    <>
      {variant === "panel" ? (
        <div className="border-4 border-ink bg-cream p-4 grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-lg leading-tight">Who's going</p>
            <button type="button" onClick={() => setOpen(true)} className={btn} aria-haspopup="dialog">{label}</button>
          </div>
          <p className="text-sm">{line || "Be the first to say you're going."}</p>
          <p className="text-xs text-ink/65">Going solo? Say you're going and join a crew of 3 to 6 people from your city.</p>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={btn} aria-haspopup="dialog" aria-label={`${label}: ${title}`}>{label}</button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-cream border-4 border-ink p-0 text-ink gap-0">
          <div className="p-5 border-b-4 border-ink bg-acid-yellow">
            <DialogTitle className="font-display text-2xl leading-tight">{title}</DialogTitle>
            <DialogDescription className="text-ink/80 text-sm mt-1">{line || "Nobody has said they're going yet."}</DialogDescription>
          </div>
          <div className="p-5">
            {!me.ready ? <p>Loading…</p>
              : !me.signedIn ? <SignInStep nightKey={nightKey} title={title} />
              : !me.isMember ? <FinishJoin nightKey={nightKey} />
              : <MemberStep nightKey={nightKey} title={title} hasTicket={hasTicket} onChange={() => { me.reload(); onChange?.(); }} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SignInStep({ nightKey, title }: { nightKey: string; title: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"going" | "interested">("going");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { try { const b = JSON.parse(localStorage.getItem("ccd:buyer") ?? "null"); if (b?.email) setEmail(b.email); } catch {} }, []);
  if (sent) return (
    <div className="grid gap-2">
      <p className="font-display text-xl">Check your email.</p>
      <p className="text-sm">Open the link on this phone. You'll land on Your nights, already on the list for this night.</p>
    </div>
  );
  return (
    <form className="grid gap-3" onSubmit={async (e) => {
      e.preventDefault(); setErr("");
      rememberPending(nightKey, state, title);
      const r = await sendSignInLink(email, `/me?n=${encodeURIComponent(nightKey)}`);
      if (r.ok) setSent(true); else setErr(r.error ?? "");
    }}>
      <Choice value={state} onChange={(v) => v && setState(v)} allowNone={false} />
      <label className="grid gap-1 text-sm font-bold">Your email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="border-4 border-ink bg-white p-3 font-normal" autoComplete="email" />
      </label>
      <button className="font-display px-5 py-3 border-4 border-ink bg-ink text-cream">Email me a sign in link</button>
      <p className="text-xs text-ink/65">No password. Your name only shows on the guest list if you switch it on.</p>
      {err && <p className="text-sm text-magenta font-bold">{err}</p>}
    </form>
  );
}

function FinishJoin({ nightKey }: { nightKey: string }) {
  return (
    <div className="grid gap-3">
      <p className="text-sm">One step left: your first name and city, so we can match you with people from your city.</p>
      <Link href={`/me?n=${encodeURIComponent(nightKey)}`} className="font-display px-5 py-3 border-4 border-ink bg-ink text-cream text-center">Finish joining</Link>
    </div>
  );
}

function MemberStep({ nightKey, title, hasTicket, onChange }: { nightKey: string; title: string; hasTicket: boolean; onChange: () => void }) {
  const me = useMe();
  const plan = me.plans[nightKey];
  const [state, setState] = useState<PlanState>(plan?.state ?? null);
  const [showName, setShowName] = useState(plan?.show_name ?? false);
  const [msg, setMsg] = useState("");
  const [needPhone, setNeedPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [crewNote, setCrewNote] = useState("");
  const scene = isScene(nightKey);

  async function save(next: PlanState, name = showName) {
    setMsg("");
    const prev = state;
    setState(next); setShowName(name);
    const r = await setPlan(nightKey, next, name, hasTicket);
    if (!r.ok) { setState(prev); setMsg(r.error ?? "Could not save."); return; }
    onChange();
  }

  async function crew() {
    setCrewNote(""); setNeedPhone(false);
    if (state !== "going") await save("going");
    const r = await joinCrew(nightKey);
    if (r.ok) setCrewNote("You're on the crew list. We match people from your city before the night and tell you on Your account.");
    else { setNeedPhone(r.need === "phone"); setCrewNote(r.error ?? "Could not join."); }
  }

  return (
    <div className="grid gap-4">
      <Choice value={state} onChange={(v) => save(v)} allowNone />
      {state === "going" && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 size-4 accent-[#2563eb]" checked={showName} onChange={(e) => save("going", e.target.checked)} />
          <span>Show my first name on the guest list. Off by default.</span>
        </label>
      )}
      {msg && <p className="text-sm text-magenta font-bold">{msg}</p>}
      {state === "going" && (
        <div className="flex flex-wrap items-center gap-3">
          <ShareButton kind="going" target={scene ? nightKey.slice(6) : nightKey} path={scene ? `/whats-on?n=${nightKey.slice(6)}` : `/nights/${nightKey}`} text={`I'm going to ${title}. Come with me:`} label="Share: I'm going" />
          <a href={`/api/ics/${encodeURIComponent(nightKey)}`} className="text-sm font-bold underline underline-offset-4 decoration-2">Add to calendar</a>
        </div>
      )}
      <div className="border-t-4 border-ink pt-4 grid gap-2">
        <p className="font-display text-lg leading-tight">Going solo or as two?</p>
        <p className="text-sm">Join a crew of 3 to 6 people from your city. You meet before, get in together and leave together.
          {scene ? " Once you're matched, add your ticket so we can sort entry with the venue." : " You need a ticket or RSVP for this night."}</p>
        <button type="button" onClick={crew} className="font-display px-4 py-2.5 border-4 border-ink bg-acid-yellow justify-self-start">Join a crew</button>
        {needPhone && (
          <form className="flex flex-wrap gap-2" onSubmit={async (e) => {
            e.preventDefault();
            const r = await memberRpc("set_my_phone", { p_phone: phone });
            if (r.ok) { setNeedPhone(false); crew(); } else setCrewNote(r.error ?? "Could not save.");
          }}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Phone number" className="border-4 border-ink bg-white p-2 flex-1 min-w-0" required />
            <button className="font-display px-4 py-2 border-4 border-ink bg-ink text-cream">Save</button>
            <span className="text-xs w-full">Crew mates are strangers, so we ask for a real number. Used only for crew reminders and safety follow-up. Never shown to the crew.</span>
          </form>
        )}
        {crewNote && <p className="text-sm">{crewNote}</p>}
      </div>
      <Link href={`/me?n=${encodeURIComponent(nightKey)}`} className="text-sm font-bold underline underline-offset-4">Open Your account</Link>
      <span className="sr-only">{title}</span>
    </div>
  );
}

function Choice({ value, onChange, allowNone }: { value: PlanState; onChange: (v: PlanState) => void; allowNone: boolean }) {
  const opts: { v: PlanState; label: string }[] = [{ v: "going", label: "Going" }, { v: "interested", label: "Interested" }];
  if (allowNone && value) opts.push({ v: null, label: "Not going" });
  return (
    <div role="radiogroup" aria-label="Your plan" className="grid grid-flow-col auto-cols-fr border-4 border-ink">
      {opts.map((o) => (
        <button key={String(o.v)} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
          className={`font-display py-2.5 px-2 border-r-4 last:border-r-0 border-ink ${value === o.v ? (o.v === "going" ? "bg-electric-blue text-cream" : "bg-ink text-cream") : "bg-cream hover:bg-acid-yellow"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
