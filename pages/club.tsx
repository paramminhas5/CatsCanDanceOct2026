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
  const { loading, signedIn, member } = useMember();
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
              <Extras />
              <HostForm onDone={(m) => setMsg(m)} />
              {member.role === "staff" && <StaffPanel />}
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
  const [wa, setWa] = useState<{ url: string; num: string }>({ url: "", num: "" });
  const [m, setM] = useState("");
  const load = useCallback(async () => {
    const st = await supabase.rpc("my_standing"); setStanding(st.data);
    const ev = await supabase.from("events").select("slug,title,event_date").eq("published", true).gte("event_date", new Date().toISOString().slice(0, 10)).order("event_date");
    const list = (ev.data as any[]) ?? []; setEvents(list);
    const c: Record<string, any[]> = {};
    for (const e of list) { const r = await supabase.rpc("my_crew", { p_slug: e.slug }); c[e.slug] = (r.data as any[]) ?? []; }
    setCrews(c);
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
      <div>
        <h3 className="font-display">Going solo? Join a crew</h3>
        <p className="text-sm">Sign up alone and we group you with 4 or 5 people from your city who like the same music. You meet 30 minutes before.</p>
        {events.length === 0 ? <p className="text-sm">No upcoming nights yet.</p> : events.map((e) => (
          <div key={e.slug} className="border-t-2 border-ink py-2 text-sm">
            <div className="flex items-center justify-between gap-2"><span>{e.title} · {e.event_date}</span>
              <span className="flex gap-2"><a className={btn} href={`/tickets/${e.slug}`}>Tickets</a><button className={btn} onClick={async () => { await memberRpc("join_crew_pool", { p_slug: e.slug }); setM("You are on the list. We form crews before the night."); }}>Join a crew</button></span></div>
            {(crews[e.slug] ?? []).length > 0 && <p className="mt-1">Your crew: {crews[e.slug].map((c) => c.mate).join(", ")}. {crews[e.slug][0].pre_spot}</p>}
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
