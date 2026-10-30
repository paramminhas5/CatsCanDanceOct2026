import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEO from "@/components/SEO";
import { useMember, memberRpc } from "@/lib/member";
import { supabase } from "@/lib/supabase";

const box = "border-4 border-ink bg-cream p-4 shadow-[6px_6px_0_0_#0a0a0a]";
const btn = "border-4 border-ink bg-acid-yellow px-3 py-1 font-display text-sm text-ink";

// The eight CCD products, shown as the club's features.
const FEATURES = [
  { verb: "Go", name: "Episodes", to: "/episodes", line: "Watch the sets and the nights." },
  { verb: "Find", name: "Prowl", to: "/prowl", line: "Nights and gigs in your city." },
  { verb: "Book", name: "Litter", to: "/litter", line: "Book artists for your night." },
  { verb: "Tour", name: "Tour", to: "/tour", line: "See where the crew plays next." },
  { verb: "Learn", name: "CCD.SCHOOL", to: "/school", line: "Learn to DJ and produce." },
  { verb: "Wear", name: "Scratch", to: "/scratch", line: "Merch and drops." },
  { verb: "Adopt", name: "Nine Lives", to: "/nine-lives", line: "Back the scene." },
  { verb: "Listen", name: "Catwalk", to: "/catwalk", line: "Mixes and playlists." },
];

type FeedItem = { id: string; title: string; url: string | null; city: string | null; venue: string | null; event_date: string | null; why: string | null };
type Counts = Record<string, { likes: number; going: number }>;

export default function Club() {
  const { loading, signedIn, member, reload } = useMember();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    const f = await memberRpc<FeedItem[]>("my_feed");
    if (f.ok && Array.isArray(f.data)) setFeed(f.data);
    const c = await supabase.rpc("event_counts");
    const map: Counts = {};
    ((c.data as any[]) ?? []).forEach((r) => { map[r.event_id] = { likes: Number(r.likes), going: Number(r.going) }; });
    setCounts(map);
  }, []);

  useEffect(() => { if (member) refresh(); }, [member, refresh]);

  async function act(fn: string, args: Record<string, unknown>) {
    const r = await memberRpc(fn, args);
    setMsg(r.ok ? "" : r.error ?? "Something went wrong.");
    refresh();
  }

  return (
    <>
      <SEO title="CCD Club" description="Your feed of nights, the artists you follow, and who else is going." path="/club" noindex />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <PageHero eyebrow="CLUB" title="YOUR CLUB." bg="bg-electric-blue" textColor="text-cream" eyebrowColor="text-acid-yellow">
          <p>Your feed, your votes, your nights.</p>
        </PageHero>
        <section className="container py-12 space-y-10">
          {loading ? null : !signedIn || !member ? (
            <div className={box}>
              <p className="mb-3">Join to get a feed of nights in your city, follow artists, vote on the best events and see who else is going.</p>
              <Link href="/join" className={btn}>Join the club</Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl">Hi {member.display_name ?? "there"}. Your feed.</h2>
              {msg && <p className="text-hot-red">{msg}</p>}
              {feed.length === 0 ? <p>Nothing matches yet. Follow artists or pick more genres.</p> : (
                <ul className="grid gap-4 md:grid-cols-2">
                  {feed.map((e) => (
                    <li key={e.id} className={box}>
                      <p className="font-display text-lg">{e.title}</p>
                      <p className="text-sm">{[e.venue, e.city, e.event_date].filter(Boolean).join(" · ")}</p>
                      {e.why && <p className="text-xs mt-1">{e.why}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button className={btn} onClick={() => act("toggle_like", { p_event_id: e.id })}>Like {counts[e.id]?.likes ?? 0}</button>
                        <button className={btn} onClick={() => act("set_going", { p_event_id: e.id, p_going: true, p_show_name: true })}>Going {counts[e.id]?.going ?? 0}</button>
                        {e.url && <a className={btn} href={e.url} target="_blank" rel="noopener noreferrer">Details</a>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!member.quiz && <TasteQuiz onDone={() => reload()} />}
              <Extras />
              <GoAgain />
              <ArtistEditor />
              <MyBookings />
              <HostForm onDone={(m) => setMsg(m)} />
              {["host", "staff", "owner"].includes(member.role) && <GuestList />}
              {(member.role === "staff" || member.role === "owner") && <StaffPanel />}
            </>
          )}
          <div>
            <h2 className="font-display text-2xl mb-4">The club features</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <li key={f.to}><Link href={f.to} className={`${box} block h-full`}><span className="font-display text-xl">{f.verb}</span><br /><span className="text-sm">{f.name}. {f.line}</span></Link></li>
              ))}
            </ul>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}


function Extras() {
  const [standing, setStanding] = useState<any>(null);
  const [events, setEvents] = useState<{ slug: string; title: string; event_date: string | null }[]>([]);
  const [crews, setCrews] = useState<Record<string, any[]>>({});
  const [mateIds, setMateIds] = useState<Record<string, any[]>>({});
  const [status, setStatus] = useState<Record<string, any>>({});
  const [nstate, setNstate] = useState<Record<string, { liked: boolean; going: boolean }>>({});
  const [ncount, setNcount] = useState<Record<string, { likes: number; going: number }>>({});
  const [wa, setWa] = useState<{ url: string; num: string }>({ url: "", num: "" });
  const [m, setM] = useState("");
  const [needPhone, setNeedPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const load = useCallback(async () => {
    const st = await supabase.rpc("my_standing"); setStanding(st.data);
    const ev = await supabase.from("events").select("slug,title,event_date").eq("published", true).gte("event_date", new Date().toISOString().slice(0, 10)).order("event_date");
    const list = (ev.data as any[]) ?? []; setEvents(list);
    const c: Record<string, any[]> = {}; const ids: Record<string, any[]> = {}; const stm: Record<string, any> = {};
    for (const e of list) {
      const r = await supabase.rpc("my_crew", { p_slug: e.slug }); c[e.slug] = (r.data as any[]) ?? [];
      if (c[e.slug].length > 0) { const mm = await supabase.rpc("my_crew_mates", { p_slug: e.slug }); ids[e.slug] = (mm.data as any[]) ?? []; }
      const s2 = await supabase.rpc("my_crew_status", { p_slug: e.slug }); stm[e.slug] = s2.data ?? null;
    }
    setCrews(c); setMateIds(ids); setStatus(stm);
    const ns = await supabase.rpc("my_night_state"); const nsm: any = {};
    ((ns.data as any[]) ?? []).forEach((x) => { nsm[x.event_slug] = { liked: x.liked, going: x.going }; }); setNstate(nsm);
    const nc = await supabase.rpc("night_counts"); const ncm: any = {};
    ((nc.data as any[]) ?? []).forEach((x) => { ncm[x.event_slug] = { likes: Number(x.likes), going: Number(x.going) }; }); setNcount(ncm);
    const s = await supabase.from("site_settings").select("key,value").in("key", ["whatsapp_community_url", "whatsapp_number"]);
    const v: any = {}; (s.data ?? []).forEach((r: any) => { v[r.key] = typeof r.value === "string" ? r.value : ""; });
    setWa({ url: v.whatsapp_community_url ?? "", num: v.whatsapp_number ?? "" });
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className={`${box} space-y-4`}>
      <h2 className="font-display text-2xl">Your standing</h2>
      {standing && (
        <p className="text-sm">
          {standing.founding_number ? `Founding member #${standing.founding_number}.` : `${standing.founding_left} of 500 founding passes left.`} Nights attended: {standing.nights_attended}. People who want to go again with you: {standing.go_again_received}.
        </p>
      )}
      {standing && !standing.founding_number && <button className={btn} onClick={async () => { const r = await memberRpc("claim_founding_pass"); setM(r.ok ? "" : r.error ?? ""); load(); }}>Claim a founding pass</button>}
      {m && <p className="text-hot-red text-sm">{m}</p>}
      {needPhone && (
        <form className="flex flex-wrap gap-2" onSubmit={async (ev) => { ev.preventDefault(); const r = await memberRpc("set_my_phone", { p_phone: phone }); setM(r.ok ? "Saved. Tap Join a crew again." : r.error ?? "Could not save."); if (r.ok) setNeedPhone(false); }}>
          <input className="border-4 border-ink bg-cream p-2" inputMode="tel" placeholder="+91 phone number" value={phone} onChange={(ev) => setPhone(ev.target.value)} required />
          <button className={btn}>Save number</button>
          <span className="text-xs w-full">Crew mates are strangers, so we ask for a real number. It is only used for crew reminders and safety follow-up.</span>
        </form>
      )}
      <div>
        <h3 className="font-display">Going solo? Join a crew</h3>
        <p className="text-sm">Sign up alone and we group you with 4 or 5 people from your city who like the same music. You meet 30 minutes before.</p>
        {events.length === 0 ? <p className="text-sm">No upcoming nights yet.</p> : events.map((e) => (
          <div key={e.slug} className="border-t-2 border-ink py-2 text-sm">
            <div className="flex items-center justify-between gap-2"><span>{e.title} · {e.event_date}</span>
              <span className="flex flex-wrap gap-2">
                <a className={btn} href={`/tickets/${e.slug}`}>Tickets</a>
                <button className={btn} onClick={async () => { await memberRpc("set_night_going", { p_slug: e.slug, p_going: !nstate[e.slug]?.going, p_show_name: false }); load(); }}>{nstate[e.slug]?.going ? "Going ✓" : "I'm going"} ({ncount[e.slug]?.going ?? 0})</button>
                <button className={btn} onClick={async () => { await memberRpc("toggle_night_like", { p_slug: e.slug }); load(); }}>{nstate[e.slug]?.liked ? "Liked ♥" : "Like"} ({ncount[e.slug]?.likes ?? 0})</button>
                <button className={btn} onClick={async () => { const r = await memberRpc("join_crew_pool", { p_slug: e.slug }); setNeedPhone(!r.ok && (r as any).need === "phone"); setM(r.ok ? "You are on the list. We form crews before the night." : r.error ?? "Could not join."); load(); }}>Join a crew</button>
              </span></div>
            {status[e.slug]?.state === "waiting" && <p className="mt-1">You are in the crew list. {status[e.slug].need > 0 ? `We form crews once 3 people from your city are in. ${status[e.slug].waiting} so far.` : "Crews are formed by the team before the night."}</p>}
            {status[e.slug]?.state === "other_city" && (
              <p className="mt-1">This night is in {status[e.slug].event_city}, your city is {status[e.slug].your_city}. We will not put you in a crew for it.{" "}
                <button className="underline" onClick={async () => {
                  const u = await supabase.auth.getUser(); const em = u.data.user?.email;
                  if (em) { await supabase.rpc("signup", { p_email: em, p_source: `city:${status[e.slug].your_city}` }); setM(`Noted. We will tell you when a night is on in ${status[e.slug].your_city}.`); }
                }}>Tell me when a night is on in {status[e.slug].your_city}</button></p>
            )}
            {(crews[e.slug] ?? []).length > 0 && (
              <div className="mt-1">
                <p>Your crew: {crews[e.slug].map((c) => c.mate).join(", ")}. {crews[e.slug][0].pre_spot}</p>
                <p className="mt-1">Not comfortable with someone?{" "}
                  {(mateIds[e.slug] ?? []).map((c) => (
                    <button key={c.mate_id} className="underline mr-2" onClick={async () => {
                      const why = window.prompt(`Report ${c.mate}. What happened? The CCD team reads this.`); if (why === null) return;
                      const r = await memberRpc("report_crew_mate", { p_slug: e.slug, p_member: c.mate_id, p_reason: why });
                      setM(r.ok ? "Reported. The CCD team will look at it." : r.error ?? "Could not send.");
                    }}>Report {c.mate}</button>
                  ))}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      {(wa.url || wa.num) && (
        <div className="flex flex-wrap gap-2">
          {wa.url && <a className={btn} href={wa.url} target="_blank" rel="noopener noreferrer">Join the WhatsApp community</a>}
          {wa.num && <a className={btn} href={`https://wa.me/${wa.num.replace(/\D/g, "")}?text=${encodeURIComponent("Hi CCD, I want to hear about the next night.")}`} target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>}
        </div>
      )}
    </div>
  );
}

function CheckIn() {
  const [code, setCode] = useState(""); const [res, setRes] = useState("");
  return (
    <div>
      <h3 className="font-display">Door check-in</h3>
      <form className="flex gap-2 mt-1" onSubmit={async (e) => { e.preventDefault(); const r = await memberRpc("checkin_ticket", { p_code: code }); setRes(r.ok ? `OK: ${(r.data as any).holder}` : r.error ?? "Failed"); setCode(""); }}>
        <input className="border-4 border-ink bg-cream p-2 flex-1 font-mono uppercase" placeholder="Ticket code" value={code} onChange={(e) => setCode(e.target.value)} required />
        <button className={btn}>Check in</button>
      </form>
      {res && <p className="text-sm mt-1">{res}</p>}
    </div>
  );
}

function HostForm({ onDone }: { onDone: (m: string) => void }) {
  const [f, setF] = useState({ title: "", date: "", time: "", city: "", venue: "", lineup: "", ticket: "", about: "" });
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  const inp = "w-full border-4 border-ink bg-cream p-2";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await memberRpc("submit_hosted_event", {
      p_title: f.title, p_date: f.date || null, p_time: f.time || null, p_city: f.city, p_venue: f.venue,
      p_genres: [], p_lineup: f.lineup.split(",").map((s) => s.trim()).filter(Boolean), p_ticket_url: f.ticket || null, p_about: f.about || null,
    });
    onDone(r.ok ? "Sent. The CCD team will review it." : r.error ?? "Something went wrong.");
    if (r.ok) setF({ title: "", date: "", time: "", city: "", venue: "", lineup: "", ticket: "", about: "" });
  }
  return (
    <form onSubmit={submit} className={`${box} space-y-2`}>
      <h2 className="font-display text-2xl">Host an event</h2>
      <p className="text-sm">Send us your night. The CCD team approves it before it goes public.</p>
      <input className={inp} placeholder="Event name" value={f.title} onChange={set("title")} required />
      <div className="grid grid-cols-2 gap-2"><input className={inp} type="date" value={f.date} onChange={set("date")} required /><input className={inp} placeholder="Time, e.g. 9pm" value={f.time} onChange={set("time")} /></div>
      <div className="grid grid-cols-2 gap-2"><input className={inp} placeholder="City" value={f.city} onChange={set("city")} required /><input className={inp} placeholder="Venue" value={f.venue} onChange={set("venue")} required /></div>
      <input className={inp} placeholder="Lineup, comma separated" value={f.lineup} onChange={set("lineup")} />
      <input className={inp} placeholder="Ticket link" value={f.ticket} onChange={set("ticket")} />
      <textarea className={inp} placeholder="About" value={f.about} onChange={set("about")} rows={3} />
      <button className={btn}>Submit for review</button>
    </form>
  );
}

function StaffPanel() {
  const [vouch, setVouch] = useState<any[]>([]);
  const [hosted, setHosted] = useState<any[]>([]);
  const load = useCallback(async () => {
    const a = await memberRpc<any[]>("vouchable_events"); if (a.ok && Array.isArray(a.data)) setVouch(a.data);
    const b = await memberRpc<any[]>("pending_hosted_events"); if (b.ok && Array.isArray(b.data)) setHosted(b.data);
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className={`${box} space-y-6`}>
      <h2 className="font-display text-2xl">CCD team</h2>
      <CheckIn />
      <div>
        <h3 className="font-display">Pending scene events</h3>
        {vouch.length === 0 ? <p className="text-sm">None waiting.</p> : vouch.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 border-t-2 border-ink py-2 text-sm">
            <span>{e.title} · {e.city} · {e.event_date} ({e.vouches} vouches)</span>
            <button className={btn} disabled={e.vouched} onClick={async () => { await memberRpc("member_vouch", { p_event_id: e.id }); load(); }}>{e.vouched ? "Vouched" : "Vouch"}</button>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-display">Hosted by members</h3>
        {hosted.length === 0 ? <p className="text-sm">None waiting.</p> : hosted.map((h) => (
          <div key={h.id} className="border-t-2 border-ink py-2 text-sm">
            <p>{h.title} · {h.city} · {h.event_date} · by {h.host_name ?? h.host_email}</p>
            <div className="mt-1 flex gap-2">
              <button className={btn} onClick={async () => { await memberRpc("review_hosted_event", { p_id: h.id, p_approve: true }); load(); }}>Approve</button>
              <button className={btn} onClick={async () => { await memberRpc("review_hosted_event", { p_id: h.id, p_approve: false }); load(); }}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


const QUIZ = [
  { key: "good_night", q: "What makes a good night?", opts: ["Dancing until late", "Hearing a great set properly", "Meeting new people", "A good room with my friends"] },
  { key: "when", q: "When do you like to go out?", opts: ["Day parties", "Early evening", "Late nights"] },
  { key: "arrive", q: "How do you usually arrive?", opts: ["Alone", "With one friend", "With a group"] },
  { key: "crew", q: "Want us to place you in a crew of 4 to 6?", opts: ["Yes", "Maybe", "No, I have my crowd"] },
  { key: "pregame", q: "Meet your crew 30 minutes before?", opts: ["Yes", "Sometimes", "No"] },
  { key: "pets", q: "Pet friendly nights?", opts: ["Love them", "Fine either way", "Not for me"] },
] as const;

function TasteQuiz({ onDone }: { onDone: () => void }) {
  const [a, setA] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = QUIZ.every((q) => a[q.key]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setErr("");
    const r = await memberRpc("save_taste_quiz", { p_answers: a, p_phone: phone || null });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Something went wrong."); return; }
    onDone();
  }
  return (
    <form onSubmit={save} className={`${box} space-y-4`}>
      <h2 className="font-display text-2xl">Your taste</h2>
      <p className="text-sm">Six quick questions. We use them to place you in a crew and pick nights for you. No looks, no follower counts.</p>
      {QUIZ.map((q) => (
        <fieldset key={q.key}>
          <legend className="font-display text-sm mb-1">{q.q}</legend>
          <div className="flex flex-wrap gap-2">
            {q.opts.map((o) => (
              <button key={o} type="button" aria-pressed={a[q.key] === o} onClick={() => setA({ ...a, [q.key]: o })}
                className={`border-4 border-ink px-3 py-1 text-sm font-display ${a[q.key] === o ? "bg-ink text-cream" : "bg-cream text-ink"}`}>{o}</button>
            ))}
          </div>
        </fieldset>
      ))}
      <div>
        <label className="font-display text-sm block mb-1" htmlFor="quiz-phone">WhatsApp number (optional)</label>
        <input id="quiz-phone" inputMode="tel" className="w-full border-4 border-ink bg-cream p-2" placeholder="+91" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <p className="text-xs mt-1">Only used to send reminders for nights you join. Leave it blank if you prefer.</p>
      </div>
      {err && <p className="text-hot-red text-sm">{err}</p>}
      <button className={`${btn} disabled:opacity-50`} disabled={!ready || busy}>{busy ? "Saving..." : "Save my taste"}</button>
    </form>
  );
}

type PastCrew = { event_slug: string; title: string; event_date: string };
type Mate = { mate_id: string; mate: string; tapped: boolean };

function GoAgain() {
  const [past, setPast] = useState<PastCrew[]>([]);
  const [mates, setMates] = useState<Record<string, Mate[]>>({});
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const p = await supabase.rpc("my_past_crews");
    const list = ((p.data as PastCrew[]) ?? []);
    setPast(list);
    const m: Record<string, Mate[]> = {};
    for (const e of list) { const r = await supabase.rpc("my_crew_mates", { p_slug: e.event_slug }); m[e.event_slug] = (r.data as Mate[]) ?? []; }
    setMates(m);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (past.length === 0) return null;
  return (
    <div className={`${box} space-y-3`}>
      <h2 className="font-display text-2xl">Who would you go again with?</h2>
      <p className="text-sm">Tap the people from your crew you would go out with again. They are not told who you tapped. It only counts towards their standing.</p>
      {msg && <p className="text-hot-red text-sm">{msg}</p>}
      {past.map((e) => (
        <div key={e.event_slug} className="border-t-2 border-ink pt-2">
          <p className="font-display text-sm">{e.title} · {e.event_date}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {(mates[e.event_slug] ?? []).length === 0 && <span className="text-sm">No crew mates to show.</span>}
            {(mates[e.event_slug] ?? []).map((m) => (
              <button key={m.mate_id} disabled={m.tapped} className={`${btn} disabled:opacity-60`}
                onClick={async () => { const r = await memberRpc("say_go_again", { p_slug: e.event_slug, p_to: m.mate_id }); setMsg(r.ok ? "" : r.error ?? "Something went wrong."); load(); }}>
                {m.tapped ? `${m.mate} ✓` : `Go again with ${m.mate}`}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


function GuestList() {
  const [events, setEvents] = useState<{ slug: string; title: string }[]>([]);
  const [slug, setSlug] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    supabase.from("events").select("slug,title").eq("published", true).gte("event_date", new Date().toISOString().slice(0, 10)).order("event_date")
      .then(({ data }) => { const l = (data as any[]) ?? []; setEvents(l); if (l[0]) setSlug(l[0].slug); });
  }, []);
  useEffect(() => {
    if (!slug) return;
    memberRpc<any>("guest_list", { p_slug: slug }).then((r) => { setErr(r.ok ? "" : r.error ?? ""); setRows(r.ok ? (r.data as any).guests : null); });
  }, [slug]);
  return (
    <div className={`${box} space-y-2`}>
      <h2 className="font-display text-2xl">Guest list</h2>
      <p className="text-sm">Who is coming, with their record: nights attended before and how many people want to go again with them.</p>
      <select className="border-4 border-ink bg-cream p-2" value={slug} onChange={(e) => setSlug(e.target.value)}>
        {events.map((e) => <option key={e.slug} value={e.slug}>{e.title}</option>)}
      </select>
      {err && <p className="text-hot-red text-sm">{err}</p>}
      {rows && rows.length === 0 && <p className="text-sm">No guests yet.</p>}
      {rows && rows.length > 0 && (
        <table className="w-full text-sm"><thead><tr className="text-left"><th>Name</th><th>Via</th><th>Tickets</th><th>In</th><th>Nights before</th><th>Go again</th></tr></thead>
          <tbody>{rows.map((g, i) => <tr key={i} className="border-t-2 border-ink"><td>{g.name}</td><td>{g.via}</td><td>{g.tickets}</td><td>{g.checked_in}</td><td>{g.nights_before}</td><td>{g.go_again_received}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}

function ArtistEditor() {
  const [a, setA] = useState<any>(null);
  const [f, setF] = useState<any>({});
  const [media, setMedia] = useState<any[]>([]);
  const [reqs, setReqs] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [mm, setMm] = useState({ kind: "mix", url: "", caption: "" });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.rpc("my_artist");
    if (!data) return;
    setA(data);
    setF({ bio: data.bio ?? "", city: data.based_city ?? "", genres: (data.genres ?? []).join(", "), instagram: data.instagram ?? "", soundcloud: data.soundcloud ?? "", website: data.website ?? "", mix: data.mix_url ?? "", photo: data.photo_url ?? "" });
    const m = await supabase.rpc("my_media"); setMedia((m.data as any[]) ?? []);
    const r = await supabase.rpc("my_booking_requests"); setReqs((r.data as any[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!a) return null;
  const inp = "w-full border-4 border-ink bg-cream p-2";
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });

  async function upload(file: File, asProfile: boolean) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMsg("Use a JPG, PNG or WebP image."); return; }
    if (file.size > 8 * 1024 * 1024) { setMsg("Image is over 8 MB."); return; }
    setBusy(true); setMsg("");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${a.slug}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("artist-media").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) { setBusy(false); setMsg("Upload failed: " + up.error.message); return; }
    const url = supabase.storage.from("artist-media").getPublicUrl(path).data.publicUrl;
    if (asProfile) {
      const r = await memberRpc("update_my_artist", { p_bio: null, p_city: null, p_genres: null, p_instagram: null, p_soundcloud: null, p_website: null, p_mix_url: null, p_photo_url: url });
      setMsg(r.ok ? "Profile photo updated." : r.error ?? "Could not save.");
    } else {
      const r = await memberRpc("add_my_media", { p_kind: "photo", p_url: url, p_caption: null });
      setMsg(r.ok ? "Photo added." : r.error ?? "Could not save.");
    }
    setBusy(false); load();
  }

  return (
    <div className="space-y-4">
      <form className={`${box} space-y-2`} onSubmit={async (e) => {
        e.preventDefault();
        const r = await memberRpc("update_my_artist", { p_bio: f.bio, p_city: f.city, p_genres: f.genres, p_instagram: f.instagram, p_soundcloud: f.soundcloud, p_website: f.website, p_mix_url: f.mix, p_photo_url: f.photo });
        setMsg(r.ok ? "Saved. Your page updates within a few minutes." : r.error ?? "Could not save.");
      }}>
        <h2 className="font-display text-2xl">Your artist page: {a.name}</h2>
        <p className="text-sm">Leave a box empty and save to clear it. <Link href={`/litter/${a.slug}`} className="underline">See your public page</Link></p>
        <div className="flex items-center gap-3">
          {f.photo ? <img src={f.photo} alt="" className="h-20 w-20 border-4 border-ink object-cover" /> : <div className="h-20 w-20 border-4 border-ink grid place-items-center text-xs">No photo</div>}
          <label className={`${btn} cursor-pointer`}>{busy ? "Uploading..." : "Upload profile photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => { const x = e.target.files?.[0]; if (x) upload(x, true); e.target.value = ""; }} /></label>
        </div>
        <textarea className={inp} rows={4} placeholder="Bio" value={f.bio} onChange={set("bio")} />
        <div className="grid grid-cols-2 gap-2"><input className={inp} placeholder="City" value={f.city} onChange={set("city")} /><input className={inp} placeholder="Genres, comma separated" value={f.genres} onChange={set("genres")} /></div>
        <div className="grid grid-cols-2 gap-2"><input className={inp} placeholder="Instagram" value={f.instagram} onChange={set("instagram")} /><input className={inp} placeholder="SoundCloud" value={f.soundcloud} onChange={set("soundcloud")} /></div>
        <div className="grid grid-cols-2 gap-2"><input className={inp} placeholder="Website" value={f.website} onChange={set("website")} /><input className={inp} placeholder="Main mix link" value={f.mix} onChange={set("mix")} /></div>
        {msg && <p className="text-sm">{msg}</p>}
        <button className={btn}>Save</button>
      </form>

      <div className={`${box} space-y-2`}>
        <h2 className="font-display text-2xl">Photos, mixes and videos</h2>
        <p className="text-sm">Only upload photos you own or have the photographer's OK to use. Up to 30 items.</p>
        {media.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {media.map((m) => (
              <li key={m.id} className="border-4 border-ink p-1 text-xs">
                {m.kind === "photo" ? <img src={m.url} alt={m.caption ?? ""} className="h-24 w-full object-cover" /> : <a href={m.url} target="_blank" rel="noreferrer" className="block h-24 break-all underline">{m.kind}: {m.caption || m.url}</a>}
                <button className="mt-1 underline" onClick={async () => { await memberRpc("remove_my_media", { p_id: m.id }); load(); }}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <label className={`${btn} inline-block cursor-pointer`}>{busy ? "Uploading..." : "Add a photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => { const x = e.target.files?.[0]; if (x) upload(x, false); e.target.value = ""; }} /></label>
        <form className="grid gap-2 sm:grid-cols-4" onSubmit={async (e) => {
          e.preventDefault();
          const r = await memberRpc("add_my_media", { p_kind: mm.kind, p_url: mm.url, p_caption: mm.caption });
          setMsg(r.ok ? "Added." : r.error ?? "Could not add."); if (r.ok) { setMm({ ...mm, url: "", caption: "" }); load(); }
        }}>
          <select className={inp} value={mm.kind} onChange={(e) => setMm({ ...mm, kind: e.target.value })}><option value="mix">Mix</option><option value="video">Video</option><option value="press">Press</option></select>
          <input className={`${inp} sm:col-span-2`} placeholder="https:// link" value={mm.url} onChange={(e) => setMm({ ...mm, url: e.target.value })} />
          <input className={inp} placeholder="Caption" value={mm.caption} onChange={(e) => setMm({ ...mm, caption: e.target.value })} />
          <button className={btn}>Add link</button>
        </form>
      </div>

      <FactsReview onChange={load} />

      <div className={`${box} space-y-2`}>
        <h2 className="font-display text-2xl">Booking requests for you</h2>
        {reqs.length === 0 ? <p className="text-sm">None yet. When someone asks to book you, it shows here.</p> : (
          <ul className="space-y-2">
            {reqs.map((r) => <BookingRow key={r.id} r={r} onDone={load} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function BookingRow({ r, onDone }: { r: any; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  async function answer(resp: "interested" | "declined") {
    const x = await memberRpc("respond_booking", { p_id: r.id, p_response: resp, p_note: note });
    if (!x.ok) { setErr(x.error ?? "Could not send."); return; }
    fetch("/api/email/booking-answer", { method: "POST" }).catch(() => {});
    onDone();
  }
  return (
    <li className="border-4 border-ink p-2 text-sm">
      <b>{r.name}</b>{r.org ? `, ${r.org}` : ""}{r.city ? `, ${r.city}` : ""}{r.event_date ? ` on ${r.event_date}` : ""}{r.budget ? `, budget ${r.budget}` : ""}
      {r.message && <p className="mt-1">{r.message}</p>}
      {r.response ? <p className="mt-1 font-bold">You said: {r.response}{r.note ? ` (${r.note})` : ""}</p> : (
        <div className="mt-2 space-y-1">
          <input className="w-full border-4 border-ink bg-cream p-1" placeholder="Note to them (optional): fee, dates, what you need" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2"><button className={btn} onClick={() => answer("interested")}>I am interested</button><button className="border-4 border-ink px-3 py-1 font-display text-sm" onClick={() => answer("declined")}>Pass</button></div>
          {err && <p className="text-xs">{err}</p>}
        </div>
      )}
    </li>
  );
}

function MyBookings() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.rpc("my_bookings").then(({ data }) => setRows((data as any[]) ?? [])); }, []);
  if (rows.length === 0) return null;
  return (
    <div className={`${box} space-y-2`}>
      <h2 className="font-display text-2xl">Your booking requests</h2>
      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="border-t-2 border-ink pt-1">
            <b>{r.artist ?? r.slug}</b>{r.event_date ? `, ${r.event_date}` : ""}: {r.response === "interested" ? "interested" : r.response === "declined" ? "passed" : "waiting for a reply"}{r.note ? ` (${r.note})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

const SECTION_NAMES: Record<string, string> = { upcoming: "Upcoming dates", tours: "Where you have played", plays: "What you play", listens: "Fans also listen to", expect: "What to expect", fans: "Your fans", played_with: "Played with" };

function FactsReview({ onChange }: { onChange: () => void }) {
  const [facts, setFacts] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState<Record<string, string>>({});
  const load = useCallback(async () => { const r = await supabase.rpc("my_artist_facts"); setFacts((r.data as any[]) ?? []); }, []);
  useEffect(() => { load(); }, [load]);
  const waiting = facts.filter((f) => f.status === "proposed");
  const live = facts.filter((f) => f.status === "approved");
  if (facts.length === 0) return null;
  async function act(id: string, status: "approved" | "rejected", label?: string) {
    const r = await memberRpc("review_my_fact", { p_id: id, p_status: status, p_label: label ?? null, p_detail: null });
    setMsg(r.ok ? (status === "approved" ? "Approved. It is on your page." : "Removed.") : r.error ?? "Could not save.");
    load(); onChange();
  }
  return (
    <div className={`${box} space-y-3`}>
      <h2 className="font-display text-2xl">We filled in your page. Check it.</h2>
      <p className="text-sm">We collected these from public sources and our own records. Only what you approve shows on your public page. Fix any wording, remove anything wrong.</p>
      {waiting.length > 0 && (
        <button className={btn} onClick={async () => { const r = await memberRpc("approve_my_facts", { p_confidence: "medium" }); setMsg(r.ok ? `Approved ${(r.data as any)?.approved ?? ""} items.` : r.error ?? "Could not save."); load(); onChange(); }}>Approve all {waiting.length}</button>
      )}
      {msg && <p className="text-sm">{msg}</p>}
      {waiting.length > 0 && (
        <ul className="space-y-2 text-sm">
          {waiting.map((f) => (
            <li key={f.id} className="border-4 border-ink p-2">
              <div className="text-xs uppercase">{SECTION_NAMES[f.section] ?? f.section} · {f.source}</div>
              <input className="w-full border-2 border-ink bg-cream p-1 mt-1" value={edit[f.id] ?? f.label} onChange={(e) => setEdit({ ...edit, [f.id]: e.target.value })} />
              {f.detail && <div className="text-xs mt-1">{f.detail}</div>}
              <div className="mt-1 flex gap-2"><button className={btn} onClick={() => act(f.id, "approved", edit[f.id] && edit[f.id] !== f.label ? edit[f.id] : undefined)}>Approve</button><button className="border-4 border-ink px-3 py-1 font-display text-sm" onClick={() => act(f.id, "rejected")}>Not right</button></div>
            </li>
          ))}
        </ul>
      )}
      {live.length > 0 && <p className="text-sm">{live.length} items are live on your page.</p>}
    </div>
  );
}
