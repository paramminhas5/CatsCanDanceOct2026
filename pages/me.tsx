/**
 * Your account (/me). Tickets, the nights you are going to, your crew, in one place.
 *   Signed out      email sign-in link (ticket buyers get one after checkout)
 *   Not joined yet  first name and city, one step
 *   Member          Tonight (crew, meet point, set times, I'm in, ticket), coming up (crew status, ticket proof),
 *                   past (rate the night, go again with your crew)
 */
import { track } from "@/lib/track";
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
import { loadMyThreads, type ThreadRow } from "@/lib/booking-desk";
import { StagePill } from "@/components/booking/StageTrack";
import { dayShort, inrShort } from "@/lib/desk";
import { artistPath, threadPath } from "@/lib/routes";
import { SCHOOL_URL } from "@/lib/ccd-db";
import { fetchNights, type NightRow } from "@/lib/door";
import { accentOf, myPromoters, type MyPromoter } from "@/lib/promoters";
import TicketPass from "@/components/tickets/TicketPass";
import { shareCard } from "@/lib/share";
import PointsCard from "@/components/points/PointsCard";
import { disablePush, enablePush, pushSupported, VAPID } from "@/lib/push";

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
      <SEO title="Your account · Cats Can Dance" description="Your tickets, the nights you are going to and your crew." path="/me" noindex />
      <main className="bg-background text-ink min-h-screen">
        <Nav />
        <section className="bg-ink text-cream pt-28 md:pt-36 pb-8">
          <div className="container">
            <p className="font-bold text-acid-yellow mb-3">Your account</p>
            <h1 className="font-display text-6xl md:text-8xl leading-[0.85]">YOUR ACCOUNT.</h1>
            <p className="mt-4 text-lg max-w-[48ch]">Your tickets, the nights you're going to, your crew, your booking requests and the artists you follow, in one place.</p>
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

      <PointsCard />

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

      <RemindersBlock />
      <BookingsBlock />
      <FollowsBlock />
      <SchoolBlock />
      <DoorBlock />
      <PromoterBlock />

      <p className="text-sm text-ink/70">Profile, taste quiz and hosting are on <Link href="/club" className="underline font-bold">your club page</Link>.</p>
    </div>
  );
}

/** Reminders: web push on this device now, WhatsApp opt-in for when it is switched on. */
function RemindersBlock() {
  const [state, setState] = useState<{ push: boolean; whatsapp: boolean; phone: boolean } | null>(null);
  const [msg, setMsg] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { supabase.rpc("my_reminders").then(({ data }) => setState((data as any) ?? { push: false, whatsapp: false, phone: false })); }, []);
  useEffect(load, [load]);
  if (!state) return null;
  const canPush = pushSupported();
  return (
    <section aria-labelledby="reminders" className="grid gap-4">
      <h2 id="reminders" className="font-display text-3xl md:text-4xl leading-none">REMINDERS</h2>
      <div className="border-4 border-ink bg-cream p-5 grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight">On this phone</p>
            <p className="text-sm text-ink/75">The day before a night you're going to, and when an artist you follow gets a new date.</p>
          </div>
          {canPush ? (
            <button type="button" disabled={busy} className={`${btn} ${state.push ? "bg-electric-blue text-cream" : "bg-acid-yellow"}`}
              onClick={async () => {
                setBusy(true); setMsg("");
                if (state.push) { await disablePush(); } else { const r = await enablePush(); if (!r.ok) setMsg(r.error ?? ""); }
                setBusy(false); load();
              }}>{state.push ? "On ✓" : "Turn on"}</button>
          ) : <span className="text-sm text-ink/60">{VAPID ? "Not available in this browser. On iPhone, add the site to your Home Screen first." : "Coming soon."}</span>}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t-4 border-ink pt-4">
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight">On WhatsApp</p>
            <p className="text-sm text-ink/75">{state.whatsapp ? "You're on the list. Reminders start the day WhatsApp goes live here." : "Say yes now and reminders come on WhatsApp once we switch it on. Only reminders, never ads."}</p>
          </div>
          {state.whatsapp ? (
            <button type="button" className={`${btn} bg-cream`} onClick={async () => { await supabase.rpc("set_whatsapp_opt_in", { p_on: false }); load(); }}>Stop</button>
          ) : (
            <form className="flex flex-wrap gap-2" onSubmit={async (e) => {
              e.preventDefault(); setMsg("");
              const { data } = await supabase.rpc("set_whatsapp_opt_in", { p_on: true, p_phone: phone || null });
              if (!(data as any)?.ok) setMsg((data as any)?.error ?? "Could not save."); else load();
            }}>
              {!state.phone && <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="WhatsApp number" className="border-4 border-ink bg-white px-3 py-2 w-44" />}
              <button className={`${btn} bg-acid-yellow`}>Yes, WhatsApp me</button>
            </form>
          )}
        </div>
        {msg && <p className="text-sm font-bold text-magenta">{msg}</p>}
      </div>
    </section>
  );
}

/** Booking requests you sent and, if you own an artist page, the ones sent to you. Same data as /bookings. */
function BookingsBlock() {
  const [rows, setRows] = useState<ThreadRow[] | null>(null);
  useEffect(() => { loadMyThreads(true).then((r) => setRows(r.rows)).catch(() => setRows([])); }, []);
  const open = (rows ?? []).filter((r) => !["declined", "cancelled"].includes(r.stage));
  const yourMove = open.filter((r) => (r.role === "artist" && ["sent", "seen"].includes(r.stage)) || (r.role === "requester" && ["interested", "countered"].includes(r.stage) && r.last_actor === "artist")).length;
  return (
    <section aria-labelledby="bookings" className="grid gap-4">
      <div className="flex items-end justify-between gap-3">
        <h2 id="bookings" className="font-display text-3xl md:text-4xl leading-none">BOOKINGS</h2>
        {rows && rows.length > 0 && <Link href="/bookings" className="text-sm font-bold underline underline-offset-4">All requests →</Link>}
      </div>
      {rows === null ? <div className="h-20 border-4 border-ink/20 bg-ink/5" aria-busy="true" />
        : rows.length === 0 ? (
          <div className="border-4 border-ink bg-cream p-5 grid gap-3">
            <p>Booking an artist for your night? Send one brief to up to three artists. Their replies, fee and the confirmation land here.</p>
            <div><Link href="/book" className={`${btn} bg-acid-yellow inline-block`}>Book an artist</Link></div>
          </div>
        ) : (
          <ul className="grid gap-3">
            {yourMove > 0 && <li className="font-bold text-magenta">{yourMove === 1 ? "One request is waiting on you." : `${yourMove} requests are waiting on you.`}</li>}
            {rows.slice(0, 4).map((r) => {
              const who = r.role === "artist" ? `${r.name}${r.org ? `, ${r.org}` : ""}` : r.artist ?? r.artist_slug;
              const facts = [r.event_date && dayShort(r.event_date), r.city, r.fee_inr ? `Fee ${inrShort(r.fee_inr)}` : r.budget_band].filter(Boolean).join(" · ");
              return (
                <li key={r.id}>
                  <Link href={threadPath(r.id, r.key)} className="flex items-center gap-3 border-4 border-ink bg-cream p-3 hover:bg-acid-yellow/40 transition-colors">
                    <StagePill stage={r.stage} />
                    <span className="min-w-0 flex-1">
                      <b className="font-display font-normal text-lg leading-tight block truncate">{r.role === "artist" ? "For you: " : ""}{who}</b>
                      <span className="text-sm text-ink/70">{facts}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
    </section>
  );
}

/** Artists you follow, newest first. */
function FollowsBlock() {
  const [list, setList] = useState<{ slug: string; name: string; photo_url: string | null }[] | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("member_follows").select("artist_slug").order("created_at", { ascending: false }).limit(12);
      const slugs = ((data as any[]) ?? []).map((x) => x.artist_slug);
      if (!slugs.length) return setList([]);
      const { data: a } = await supabase.from("artists").select("slug,name,photo_url").in("slug", slugs);
      const by = new Map(((a as any[]) ?? []).map((x) => [x.slug, x]));
      setList(slugs.map((s) => by.get(s)).filter(Boolean));
    })().catch(() => setList([]));
  }, []);
  return (
    <section aria-labelledby="follows" className="grid gap-4">
      <h2 id="follows" className="font-display text-3xl md:text-4xl leading-none">ARTISTS YOU FOLLOW</h2>
      {list === null ? <div className="h-20 border-4 border-ink/20 bg-ink/5" aria-busy="true" />
        : list.length === 0 ? (
          <div className="border-4 border-ink bg-cream p-5 grid gap-3">
            <p>Follow an artist from their page and they show up here.</p>
            <div><Link href="/artists" className={`${btn} bg-acid-yellow inline-block`}>Browse artists</Link></div>
          </div>
        ) : (
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {list.map((a) => (
              <li key={a.slug}>
                <Link href={artistPath(a.slug)} className="block border-4 border-ink bg-cream hover:-translate-y-1 transition-transform">
                  {a.photo_url ? <img src={a.photo_url} alt="" className="w-full aspect-square object-cover border-b-4 border-ink" loading="lazy" />
                    : <span className="w-full aspect-square grid place-items-center bg-electric-blue text-cream font-display text-3xl border-b-4 border-ink">{a.name.slice(0, 1)}</span>}
                  <span className="block font-display text-sm leading-tight p-2 truncate">{a.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

function SchoolBlock() {
  return (
    <section aria-labelledby="school" className="grid gap-4">
      <h2 id="school" className="font-display text-3xl md:text-4xl leading-none">SCHOOL</h2>
      <div className="border-4 border-ink bg-magenta text-cream p-5 grid gap-3">
        <p>Your lessons, the tracks you are making and your streak live in School. Use the same email.</p>
        <div><a href={SCHOOL_URL} onClick={() => track("open_school")} className={`${btn} bg-cream text-ink inline-block`}>Open School</a></div>
      </div>
    </section>
  );
}

/** Promoters this person runs on CCD (migration 056). Hidden when there are none. */
function PromoterBlock() {
  const [rows, setRows] = useState<MyPromoter[]>([]);
  useEffect(() => { myPromoters().then(setRows); }, []);
  if (!rows.length) return null;
  return (
    <section aria-labelledby="promoters" className="grid gap-4">
      <h2 id="promoters" className="font-display text-3xl md:text-4xl leading-none">YOUR NIGHTS ON CCD</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map((p) => (
          <li key={p.slug}>
            <Link href={`/promote/${p.slug}`} className={`block border-4 border-ink ${accentOf(p.accent).bg} ${accentOf(p.accent).on} p-4`}>
              <b className="font-display font-normal text-xl">{p.name}</b>
              <span className="block text-sm">{p.status === "approved" ? `${p.nights} night${p.nights === 1 ? "" : "s"}` : p.status === "pending" ? "Waiting for CCD" : "Not approved"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Nights this person can run the door for (CCD team, hosts, or a night's door team). Hidden for everyone else. */
function DoorBlock() {
  const [nights, setNights] = useState<NightRow[]>([]);
  useEffect(() => {
    fetchNights().then((r) => {
      if (!r.ok) return;
      const today = todayIST();
      setNights((r.nights ?? []).filter((n) => (n.event_date ?? "") >= today).sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? "")).slice(0, 3));
    });
  }, []);
  if (!nights.length) return null;
  return (
    <section aria-labelledby="door" className="grid gap-4">
      <h2 id="door" className="font-display text-3xl md:text-4xl leading-none">THE DOOR</h2>
      <div className="border-4 border-ink bg-ink text-cream p-5 grid gap-3">
        <p>You are on the door for {nights.length === 1 ? "this night" : "these nights"}. Open it on the phone you will scan with, before doors, while there is signal.</p>
        <ul className="grid gap-2">
          {nights.map((n) => (
            <li key={n.slug} className="flex flex-wrap items-center gap-3">
              <span className="flex-1 min-w-0"><b className="font-display font-normal">{n.title}</b> <span className="text-cream/70 text-sm">{n.date ?? n.event_date}</span></span>
              <Link href={`/door/${n.slug}`} className={`${btn} bg-acid-yellow text-ink`}>Open door</Link>
              {n.lead && <Link href={`/door/${n.slug}/setup`} className="underline text-sm">Setup</Link>}
            </li>
          ))}
        </ul>
      </div>
    </section>
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
          {n.kind === "scene" && mode !== "past" && <Link href={`/whats-on?n=${n.key.slice(6)}`} className="underline underline-offset-4">On What's on</Link>}
          {mode === "next" && n.date && <a href={`/api/ics/${encodeURIComponent(n.key)}`} className="underline underline-offset-4">Add to calendar</a>}
          {mode !== "past" && n.plan?.state === "going" && (
            <button type="button" className="underline underline-offset-4" onClick={() => shareCard({ kind: "going", target: n.kind === "scene" ? n.key.slice(6) : n.key, path: n.kind === "scene" ? `/whats-on?n=${n.key.slice(6)}` : `/nights/${n.key}`, text: `I'm going to ${n.title}. Come with me:` })}>Share: I'm going</button>
          )}
          {mode === "past" && n.kind === "ccd" && (
            <button type="button" className="underline underline-offset-4" onClick={() => shareCard({ kind: "episode", target: n.key, path: `/nights/${n.key}`, text: `I was there: Cats Can Dance ${n.title}.` })}>Share: I was there</button>
          )}
        </div>
      </header>

      <div className="p-5 grid gap-5">
        {mode === "tonight" && n.tickets.length > 0 && (
          <div className="grid gap-3">
            <p className="font-display text-lg">Your ticket{n.tickets.length > 1 ? "s" : ""}</p>
            {n.tickets.map((t, i) => <TicketPass key={t.code} t={t} when={when} venue={n.venue} index={i} total={n.tickets.length} />)}
          </div>
        )}
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
