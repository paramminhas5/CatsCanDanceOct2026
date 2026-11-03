/**
 * Your nights (/me). Everything about the nights you're going to, in one place.
 *   Signed out      email sign-in link (ticket buyers get one after checkout)
 *   Not joined yet  first name and city, one step
 *   Member          Tonight (crew, meet point, set times, I'm in, ticket), coming up (crew status, ticket proof),
 *                   past (rate the night, go again with your crew)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { memberRpc, useMember } from "@/lib/member";
import { memberTickets, type PassTicket } from "@/lib/booking";
import { directionsUrl, todayIST } from "@/lib/nights";
import {
  applyPending, type CrewCard, isScene, joinCrew, leaveCrew, loadCrewCard, loadMyPlans, type Mate, type MyPlan,
  refreshMe, sendSignInLink, setPlan,
} from "@/lib/plans";

const CITIES = ["Bengaluru", "Mumbai", "Delhi NCR", "Goa", "Pune", "Hyderabad", "Chennai", "Kolkata"];
const inp = "w-full border-4 border-ink bg-white p-3 text-ink";
const btn = "font-display px-4 py-2.5 border-4 border-ink";

type Night = {
  key: string; title: string; city: string | null; venue: string | null; date: string | null;
  kind: "ccd" | "scene"; plan: MyPlan | null; tickets: PassTicket[];
};

export default function Me() {
  const { loading, signedIn, member, reload } = useMember();
  return (
    <>
      <SEO title="Your nights · Cats Can Dance" description="The nights you're going to, your crew, your tickets." path="/me" noindex />
      <main className="bg-background text-ink min-h-screen">
        <Nav />
        <section className="bg-ink text-cream pt-28 md:pt-36 pb-8">
          <div className="container">
            <p className="font-bold text-acid-yellow mb-3">Your nights · crew</p>
            <h1 className="font-display text-6xl md:text-8xl leading-[0.85]">YOUR NIGHTS.</h1>
            <p className="mt-4 text-lg max-w-[48ch]">Nights you're going to, your crew, your tickets. Say you're going to any night on What's on, even if you bought the ticket somewhere else.</p>
          </div>
        </section>
        <div className="container py-10 md:py-14 max-w-3xl">
          {loading ? <p>Loading…</p>
            : !signedIn ? <SignIn />
            : !member ? <QuickJoin onDone={reload} />
            : <YourNights memberId={member.id} name={member.display_name ?? ""} />}
        </div>
        <Footer />
      </main>
    </>
  );
}

function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { try { const b = JSON.parse(localStorage.getItem("ccd:buyer") ?? "null"); if (b?.email) setEmail(b.email); } catch {} }, []);
  if (sent) return <Box title="Check your email."><p>Open the link on this device to see your nights.</p></Box>;
  return (
    <Box title="Sign in">
      <form className="grid gap-3" onSubmit={async (e) => {
        e.preventDefault(); setErr("");
        const n = typeof router.query.n === "string" ? `?n=${encodeURIComponent(router.query.n)}` : "";
        const r = await sendSignInLink(email, `/me${n}`);
        if (r.ok) setSent(true); else setErr(r.error ?? "");
      }}>
        <input className={inp} type="email" required placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <button className={`${btn} bg-acid-yellow`}>Email me a sign in link</button>
        <p className="text-xs text-ink/65">Bought a ticket? Use the same email and your tickets show up here.</p>
        {err && <p className="text-sm text-magenta font-bold">{err}</p>}
      </form>
    </Box>
  );
}

function QuickJoin({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem("ccd:buyer") ?? "null");
      if (b?.name) setName(String(b.name).split(" ")[0]);
      if (b?.phone) setPhone(b.phone);
      if (b?.city && CITIES.includes(b.city)) setCity(b.city);
    } catch {}
  }, []);
  return (
    <Box title="One step">
      <form className="grid gap-3" onSubmit={async (e) => {
        e.preventDefault(); setErr(""); setBusy(true);
        const r = await memberRpc("join_member", { p_name: name, p_city: city, p_genres: [] });
        if (!r.ok) { setBusy(false); setErr(r.error ?? "Could not finish."); return; }
        if (phone.replace(/\D/g, "").length >= 10) await memberRpc("set_my_phone", { p_phone: phone });
        await applyPending();
        await refreshMe();
        onDone();
      }}>
        <label className="grid gap-1 text-sm font-bold">First name<input className={inp} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required /></label>
        <label className="grid gap-1 text-sm font-bold">Your city
          <select className={inp} value={city} onChange={(e) => setCity(e.target.value)} required>
            <option value="">Pick one</option>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">Phone <span className="font-normal text-ink/65">needed for crews, never shown to anyone</span>
          <input className={inp} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </label>
        <button disabled={busy} className={`${btn} bg-acid-yellow`}>{busy ? "Saving…" : "Done"}</button>
        <p className="text-xs text-ink/65">Your name only shows on a guest list if you switch it on for that night. Your crew sees your first name.</p>
        {err && <p className="text-sm text-magenta font-bold">{err}</p>}
      </form>
    </Box>
  );
}

function YourNights({ memberId, name }: { memberId: string; name: string }) {
  const router = useRouter();
  const focus = typeof router.query.n === "string" ? router.query.n : "";
  const today = todayIST();
  const [nights, setNights] = useState<Night[] | null>(null);

  const load = useCallback(async () => {
    const [plans, tickets] = await Promise.all([loadMyPlans(), memberTickets()]);
    const map = new Map<string, Night>();
    for (const p of plans) {
      map.set(p.night_key, { key: p.night_key, title: p.title ?? p.night_key, city: p.city ?? null, venue: p.venue ?? null, date: p.event_date ?? null, kind: p.kind ?? (isScene(p.night_key) ? "scene" : "ccd"), plan: p, tickets: [] });
    }
    for (const t of tickets ?? []) {
      const n = map.get(t.event_slug) ?? { key: t.event_slug, title: t.event_title ?? t.event_slug, city: null, venue: t.venue, date: t.event_date, kind: "ccd" as const, plan: null, tickets: [] };
      n.tickets.push(t);
      if (!n.date) n.date = t.event_date;
      map.set(t.event_slug, n);
    }
    // A ticket means you're going: add it to the going list (name stays hidden).
    for (const n of map.values()) {
      if (n.tickets.length && !n.plan && (!n.date || n.date >= today)) {
        const r = await setPlan(n.key, "going", false, true);
        if (r.ok) n.plan = { night_key: n.key, state: "going", show_name: false, has_ticket: true };
      }
    }
    setNights([...map.values()].sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999")));
  }, [today]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!focus || !nights) return;
    const el = document.getElementById(`night-${focus}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus, nights]);

  const groups = useMemo(() => {
    const list = nights ?? [];
    return {
      tonight: list.filter((n) => n.date === today),
      next: list.filter((n) => !n.date || n.date > today),
      past: list.filter((n) => n.date && n.date < today).reverse().slice(0, 8),
    };
  }, [nights, today]);

  if (!nights) return <p>Loading your nights…</p>;

  return (
    <div className="grid gap-12">
      <p className="text-lg">Hi{name ? ` ${name.split(" ")[0]}` : ""}. {nights.length === 0 ? "No nights yet." : ""}</p>

      {groups.tonight.length > 0 && (
        <section aria-labelledby="tonight" className="grid gap-6">
          <h2 id="tonight" className="font-display text-5xl md:text-6xl text-magenta leading-none">TONIGHT</h2>
          {groups.tonight.map((n) => <NightBlock key={n.key} n={n} mode="tonight" focused={focus === n.key} memberId={memberId} onChange={load} />)}
        </section>
      )}

      <section aria-labelledby="next" className="grid gap-6">
        <h2 id="next" className="font-display text-3xl md:text-4xl leading-none">COMING UP</h2>
        {groups.next.length === 0 ? (
          <div className="border-4 border-ink bg-cream p-5 grid gap-3">
            <p>Find a night and tap I'm going. It shows up here, with a crew if you want one.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/whats-on" className={`${btn} bg-acid-yellow`}>What's on</Link>
              <Link href="/nights" className={`${btn} bg-cream`}>Our nights</Link>
            </div>
          </div>
        ) : groups.next.map((n) => <NightBlock key={n.key} n={n} mode="next" focused={focus === n.key} memberId={memberId} onChange={load} />)}
      </section>

      {groups.past.length > 0 && (
        <section aria-labelledby="past" className="grid gap-6">
          <h2 id="past" className="font-display text-3xl md:text-4xl leading-none">BEEN</h2>
          {groups.past.map((n) => <NightBlock key={n.key} n={n} mode="past" focused={focus === n.key} memberId={memberId} onChange={load} />)}
        </section>
      )}

      <p className="text-sm text-ink/70">Profile, taste quiz and hosting are on <Link href="/club" className="underline font-bold">your club page</Link>.</p>
    </div>
  );
}

function NightBlock({ n, mode, focused, memberId, onChange }: { n: Night; mode: "tonight" | "next" | "past"; focused: boolean; memberId: string; onChange: () => void }) {
  const [card, setCard] = useState<CrewCard | null>(null);
  const [times, setTimes] = useState<{ artist_name: string; starts_at: string }[]>([]);
  const reloadCard = useCallback(() => { loadCrewCard(n.key).then(setCard).catch(() => setCard({ placed: false })); }, [n.key]);
  useEffect(() => { reloadCard(); }, [reloadCard]);
  useEffect(() => {
    if (mode !== "tonight") return;
    supabase.rpc("night_set_times", { p_key: n.key }).then(({ data }) => setTimes((data as any[]) ?? []));
  }, [mode, n.key]);

  const dir = directionsUrl(n.venue, n.city);
  const href = n.kind === "ccd" ? `/nights/${n.key}` : null;
  const when = n.date ? new Date(`${n.date}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "Date to be announced";

  return (
    <article id={`night-${n.key}`} className={`border-4 border-ink bg-cream scroll-mt-28 ${focused || mode === "tonight" ? "chunk-shadow" : ""}`}>
      <header className={`p-5 border-b-4 border-ink ${mode === "tonight" ? "bg-acid-yellow" : mode === "past" ? "bg-cream" : "bg-white"}`}>
        <p className="text-sm font-bold text-ink/70">{when}{n.kind === "ccd" ? " · Cats Can Dance" : ""}{n.plan?.state === "interested" ? " · Interested" : n.plan?.state === "going" ? " · Going" : ""}</p>
        <h3 className="font-display text-2xl md:text-3xl leading-[0.95] mt-1">{href ? <Link href={href} className="hover:underline">{n.title}</Link> : n.title}</h3>
        <p className="font-bold mt-1">{[n.venue, n.city].filter(Boolean).join(", ")}</p>
        <div className="flex flex-wrap gap-3 mt-3 text-sm font-bold">
          {dir && mode !== "past" && <a href={dir} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Directions</a>}
          {n.tickets.length > 0 && <Link href="/tickets" className="underline underline-offset-4">Your ticket{n.tickets.length > 1 ? "s" : ""} ({n.tickets.length})</Link>}
          {n.kind === "scene" && mode !== "past" && <Link href="/whats-on" className="underline underline-offset-4">On What's on</Link>}
        </div>
      </header>

      <div className="p-5 grid gap-5">
        {mode === "tonight" && times.length > 0 && (
          <div>
            <p className="font-display text-lg">Set times</p>
            <ol className="mt-2 grid gap-1">
              {times.map((t) => (
                <li key={t.artist_name + t.starts_at} className="flex gap-3 tabular">
                  <span className="font-bold w-16">{new Date(t.starts_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span>
                  <span>{t.artist_name}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {mode === "past"
          ? <PastNight n={n} card={card} />
          : <CrewSection n={n} card={card} mode={mode} memberId={memberId} onChange={() => { reloadCard(); onChange(); }} />}
      </div>
    </article>
  );
}

function CrewSection({ n, card, mode, memberId, onChange }: { n: Night; card: CrewCard | null; mode: "tonight" | "next"; memberId: string; onChange: () => void }) {
  const [msg, setMsg] = useState("");
  const [needPhone, setNeedPhone] = useState(false);
  const [phone, setPhone] = useState("");
  if (!card) return <p className="text-sm">Checking your crew…</p>;
  const state = card.status?.state ?? (card.placed ? "placed" : "not_joined");

  async function join() {
    setMsg(""); setNeedPhone(false);
    if (n.kind === "scene" && n.plan?.state !== "going") await setPlan(n.key, "going");
    const r = await joinCrew(n.key);
    if (r.ok) onChange(); else { setNeedPhone(r.need === "phone"); setMsg(r.error ?? "Could not join."); }
  }

  if (!card.placed) {
    return (
      <div className="grid gap-3">
        <p className="font-display text-lg leading-tight">Crew</p>
        {state === "not_joined" && (<>
          <p className="text-sm">Going solo or as two? Join a crew of 3 to 6 people from your city. Meet before, get in together, leave together.</p>
          <button type="button" onClick={join} className={`${btn} bg-acid-yellow justify-self-start`}>Join a crew</button>
        </>)}
        {state === "waiting" && (<>
          <p className="text-sm">You're on the crew list. {card.status?.need ? `We match once 3 people from your city are in. ${card.status?.waiting ?? 1} so far.` : "Enough people are in. We match crews before the night and you'll see yours here."}</p>
          <button type="button" onClick={async () => { await leaveCrew(n.key); onChange(); }} className="text-sm underline justify-self-start">Leave the crew list</button>
        </>)}
        {state === "other_city" && <p className="text-sm">This night is in {card.status?.event_city} and your city is {card.status?.your_city}. Crews are matched by city, so we won't place you for this one. Change your city on <Link href="/club" className="underline">your club page</Link>.</p>}
        {needPhone && (
          <form className="flex flex-wrap gap-2" onSubmit={async (e) => {
            e.preventDefault();
            const r = await memberRpc("set_my_phone", { p_phone: phone });
            if (r.ok) { setNeedPhone(false); join(); } else setMsg(r.error ?? "Could not save.");
          }}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Phone number" className="border-4 border-ink bg-white p-2 flex-1 min-w-0" required />
            <button className={`${btn} bg-ink text-cream py-2`}>Save</button>
            <span className="text-xs w-full">Only used for crew reminders and safety follow-up. Never shown to your crew.</span>
          </form>
        )}
        {msg && <p className="text-sm text-magenta font-bold">{msg}</p>}
        {n.kind === "scene" && state === "waiting" && <TicketProof n={n} status="missing" onDone={onChange} early />}
      </div>
    );
  }

  const c = card.crew!;
  const mates = card.mates ?? [];
  const you = mates.find((m) => m.you || m.id === memberId);
  const inCount = mates.filter((m) => m.in).length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-2xl leading-tight">{c.name}</p>
        {mode === "tonight" && <p className="text-sm font-bold">{inCount} of {mates.length} in</p>}
      </div>

      <dl className="grid sm:grid-cols-2 gap-3 text-sm">
        <Fact label="Meet at" value={c.meet_point ?? c.pre_spot ?? "Your captain sets this"} />
        <Fact label="Meet time" value={c.meet_time ?? "Your captain sets this"} />
        {c.lost_point && <Fact label="If you lose the crew" value={c.lost_point} />}
      </dl>
      {c.whatsapp_link
        ? <a href={c.whatsapp_link} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#25D366] text-ink justify-self-start`}>Open the crew WhatsApp</a>
        : <p className="text-sm text-ink/70">No group chat yet. {c.you_are_captain ? "Add one below." : "Your captain adds it."}</p>}

      <ul className="grid gap-2" aria-label="Your crew">
        {mates.map((m) => <MateRow key={m.id} m={m} isYou={m.you || m.id === memberId} nightKey={n.key} kind={n.kind} />)}
      </ul>

      {mode === "tonight" && you && !you.in && (
        <button type="button" className={`${btn} bg-electric-blue text-cream justify-self-start`} onClick={async () => {
          const r = await memberRpc("mark_im_in", { p_key: n.key });
          if (r.ok) onChange(); else setMsg(r.error ?? "Could not save.");
        }}>I'm in</button>
      )}
      {msg && <p className="text-sm text-magenta font-bold">{msg}</p>}

      {n.kind === "scene" && <TicketProof n={n} status={you?.ticket ?? "missing"} onDone={onChange} />}
      {c.you_are_captain && <CaptainForm n={n} crew={c} onDone={onChange} />}

      <p className="text-xs text-ink/65">Something wrong? Tap Report next to a name, or message us on Instagram @catscandance. Leave together, and tell the crew chat when you head home.</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="border-2 border-ink p-3 bg-white"><dt className="text-xs font-bold text-ink/65">{label}</dt><dd className="font-bold">{value}</dd></div>;
}

const TICKET_LABEL: Record<string, string> = { verified: "Ticket checked", pending: "Ticket sent", rejected: "Ticket not accepted", missing: "No ticket yet" };

function MateRow({ m, isYou, nightKey, kind }: { m: Mate; isYou: boolean; nightKey: string; kind: "ccd" | "scene" }) {
  const [reported, setReported] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-2 border-2 border-ink bg-white p-2.5">
      <span className="font-display">{m.first_name}{isYou ? " (you)" : ""}</span>
      {m.captain && <span className="text-xs font-bold px-1.5 border-2 border-ink bg-acid-yellow">Captain</span>}
      {m.tags?.slice(0, 2).map((t) => <span key={t} className="text-xs px-1.5 border border-ink/40">{t}</span>)}
      <span className="ml-auto flex items-center gap-2 text-xs font-bold">
        {kind === "scene" && <span className={m.ticket === "verified" ? "text-electric-blue" : m.ticket === "rejected" ? "text-magenta" : "text-ink/60"}>{TICKET_LABEL[m.ticket] ?? ""}</span>}
        {m.in && <span className="px-1.5 bg-electric-blue text-cream">In</span>}
        {!isYou && (reported ? <span className="text-ink/60">Reported</span> : (
          <button type="button" className="underline" onClick={async () => {
            const why = window.prompt(`What happened with ${m.first_name}? Only the CCD team sees this.`);
            if (!why) return;
            const r = await memberRpc("report_crew_mate", { p_slug: nightKey, p_member: m.id, p_reason: why });
            if (r.ok) setReported(true);
          }}>Report</button>
        ))}
      </span>
    </li>
  );
}

function TicketProof({ n, status, onDone, early = false }: { n: Night; status: string; onDone: () => void; early?: boolean }) {
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (status === "verified") return <p className="text-sm font-bold text-electric-blue">Your ticket is checked. You're on the crew entry list we send to the venue.</p>;
  return (
    <div className="border-2 border-dashed border-ink p-3 grid gap-2">
      <p className="text-sm">
        {status === "pending" ? "We have your ticket and will check it before the night." : status === "rejected" ? "We could not accept that ticket. Try again with a clear screenshot or booking ID." :
          early ? "Got your ticket already? Add it now and you're ready when the crew is matched." : "Add your ticket so we can line up entry for the whole crew with the venue."}
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="font-display text-sm px-3 py-2 border-2 border-ink bg-white justify-self-start">{status === "missing" ? "Add your ticket" : "Replace ticket"}</button>
      ) : (
        <form className="grid gap-2" onSubmit={async (e) => {
          e.preventDefault(); setMsg(""); setBusy(true);
          try {
            let path: string | null = null;
            if (file) {
              if (file.size > 5 * 1024 * 1024) throw new Error("That file is over 5 MB.");
              const { data } = await supabase.auth.getSession();
              const uid = data.session?.user.id;
              const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
              path = `${uid}/${n.key.replace(/[^a-z0-9-]/gi, "_")}-${Date.now()}.${ext}`;
              const up = await supabase.storage.from("ticket-proofs").upload(path, file, { contentType: file.type, upsert: false });
              if (up.error) throw new Error("Upload is not open yet. Add your booking ID instead.");
            }
            const r = await memberRpc("submit_ticket_proof", { p_key: n.key, p_ref: ref, p_path: path });
            if (!r.ok) throw new Error(r.error ?? "Could not save.");
            setOpen(false); onDone();
          } catch (err: any) { setMsg(err.message); }
          setBusy(false);
        }}>
          <input className="border-2 border-ink bg-white p-2" placeholder="Booking ID (from the ticket email)" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={80} />
          <label className="text-sm">Screenshot or PDF of the ticket <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block mt-1 text-sm" /></label>
          <p className="text-xs text-ink/65">Only the CCD team sees this. We use it to give the venue a crew entry list and delete it after the night.</p>
          <button disabled={busy} className="font-display text-sm px-3 py-2 border-2 border-ink bg-acid-yellow justify-self-start">{busy ? "Sending…" : "Send ticket"}</button>
          {msg && <p className="text-sm text-magenta font-bold">{msg}</p>}
        </form>
      )}
    </div>
  );
}

function CaptainForm({ n, crew, onDone }: { n: Night; crew: NonNullable<CrewCard["crew"]>; onDone: () => void }) {
  const [f, setF] = useState({ meet_point: crew.meet_point ?? crew.pre_spot ?? "", meet_time: crew.meet_time ?? "", whatsapp: crew.whatsapp_link ?? "", lost: crew.lost_point ?? "" });
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <details className="border-2 border-ink bg-white p-3">
      <summary className="font-display cursor-pointer">You're the captain. Set the plan</summary>
      <form className="grid gap-2 mt-3" onSubmit={async (e) => {
        e.preventDefault(); setMsg("");
        const r = await memberRpc("captain_set_crew", { p_key: n.key, p_meet_point: f.meet_point, p_meet_time: f.meet_time, p_whatsapp: f.whatsapp, p_lost_point: f.lost });
        setMsg(r.ok ? "Saved. Your crew sees it now." : r.error ?? "Could not save.");
        if (r.ok) onDone();
      }}>
        <input className="border-2 border-ink p-2" placeholder="Meet at (a cafe or spot near the venue)" value={f.meet_point} onChange={set("meet_point")} maxLength={120} />
        <input className="border-2 border-ink p-2" placeholder="Meet time, e.g. 9:30 pm" value={f.meet_time} onChange={set("meet_time")} maxLength={40} />
        <input className="border-2 border-ink p-2" placeholder="WhatsApp group invite link" value={f.whatsapp} onChange={set("whatsapp")} inputMode="url" />
        <input className="border-2 border-ink p-2" placeholder="If someone gets lost, meet at (inside the venue)" value={f.lost} onChange={set("lost")} maxLength={120} />
        <p className="text-xs text-ink/65">Make a WhatsApp group, tap Invite via link, paste it here. Only your crew sees it.</p>
        <button className="font-display text-sm px-3 py-2 border-2 border-ink bg-acid-yellow justify-self-start">Save the plan</button>
        {msg && <p className="text-sm font-bold">{msg}</p>}
      </form>
    </details>
  );
}

function PastNight({ n, card }: { n: Night; card: CrewCard | null }) {
  const [rating, setRating] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [tapped, setTapped] = useState<Record<string, boolean>>({});
  const mates = (card?.mates ?? []).filter((m) => !m.you);
  return (
    <div className="grid gap-4">
      <div>
        <p className="font-display text-lg">How was it?</p>
        <div className="flex gap-2 mt-2" role="radiogroup" aria-label="Rate the night">
          {[{ v: 1, l: "Not for me" }, { v: 2, l: "Good" }, { v: 3, l: "Great" }].map((o) => (
            <button key={o.v} type="button" role="radio" aria-checked={rating === o.v} className={`font-display text-sm px-3 py-2 border-2 border-ink ${rating === o.v ? "bg-ink text-cream" : "bg-white"}`}
              onClick={async () => { setRating(o.v); const r = await memberRpc("rate_night", { p_key: n.key, p_rating: o.v }); setMsg(r.ok ? "Thanks. It helps us pick nights." : "Rating opens soon."); }}>{o.l}</button>
          ))}
        </div>
        {msg && <p className="text-sm mt-2">{msg}</p>}
      </div>
      {card?.placed && mates.length > 0 && (
        <div>
          <p className="font-display text-lg">Go again with</p>
          <p className="text-sm text-ink/70">Tap anyone you'd go out with again. They aren't told. If you both tap each other, we try to put you in the same crew next time.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {mates.map((m) => (
              <button key={m.id} type="button" aria-pressed={!!tapped[m.id]} className={`font-display text-sm px-3 py-2 border-2 border-ink ${tapped[m.id] ? "bg-electric-blue text-cream" : "bg-white"}`}
                onClick={async () => { const r = await memberRpc("say_go_again", { p_slug: n.key, p_to: m.id }); if (r.ok) setTapped({ ...tapped, [m.id]: true }); }}>
                {m.first_name}{tapped[m.id] ? " ✓" : ""}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-4 border-ink bg-cream chunk-shadow">
      <p className="font-display text-2xl p-5 border-b-4 border-ink bg-acid-yellow">{title}</p>
      <div className="p-5">{children}</div>
    </div>
  );
}
