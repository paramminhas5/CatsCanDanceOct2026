/**
 * /promote/<promoter>: the promoter's dashboard. Their nights (state, tickets, going, door links), their look on CCD, and their team.
 */
import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SignInGate from "@/components/SignInGate";
import {
  ACCENT, ACCENTS, accentOf, getDashboard, nightPath, nightStatus, promoterPath, saveBrand, setTeam, stateOf, type Accent, type Dashboard, type PNight,
} from "@/lib/promoters";
import { todayIST } from "@/lib/nights";

const inp = "w-full border-4 border-ink bg-white p-3";
const btn = "font-display px-4 py-2.5 border-4 border-ink bg-acid-yellow";

function NightCard({ n, promoter, onChange }: { n: PNight; promoter: string; onChange: () => void }) {
  const st = stateOf(n);
  const [busy, setBusy] = useState(false);
  const act = async (a: "submit" | "withdraw") => { setBusy(true); await nightStatus(n.slug, a); setBusy(false); onChange(); };
  const past = (n.event_date ?? "") < todayIST();
  return (
    <li className="border-4 border-ink bg-white">
      <div className="p-4 flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[200px]">
          <span className={`inline-block text-xs font-bold px-2 py-0.5 border-2 border-ink ${st.tone}`}>{st.label}</span>
          <p className="font-display text-2xl leading-tight mt-2">{n.title}</p>
          <p className="text-sm text-ink/70">{[n.event_date, n.start_time, n.venue, n.city].filter(Boolean).join(" · ")}</p>
          <p className="text-sm mt-2">{st.next}</p>
        </div>
        <dl className="grid grid-cols-4 gap-2 text-center shrink-0">
          {([["Tickets", n.tickets], ["List", n.rsvps], ["Going", n.going], ["In", n.inside]] as const).map(([k, v]) => (
            <div key={k} className="border-2 border-ink px-2 py-1 min-w-[56px]"><dt className="text-[11px] uppercase text-ink/60">{k}</dt><dd className="font-display text-xl tabular-nums">{v}</dd></div>
          ))}
        </dl>
      </div>
      <div className="border-t-4 border-ink p-3 flex flex-wrap gap-2 items-center">
        <Link href={{ pathname: "/promote/[slug]/night", query: { slug: promoter, night: n.slug } }} className="font-display px-3 py-2 border-4 border-ink">Edit</Link>
        {!n.published && n.review_status !== "pending" && !past && <button disabled={busy} onClick={() => act("submit")} className={btn}>Send to CCD</button>}
        {(n.published || n.review_status === "pending") && <button disabled={busy} onClick={() => act("withdraw")} className="text-sm underline min-h-[44px] px-2">{n.published ? "Take it down" : "Withdraw"}</button>}
        {n.published && <Link href={nightPath(n.slug)} className="text-sm underline min-h-[44px] px-2 inline-flex items-center">View page</Link>}
        <span className="flex-1" />
        <Link href={`/door/${n.slug}`} className="font-display px-3 py-2 border-4 border-ink bg-ink text-cream">Door</Link>
        <Link href={`/door/${n.slug}/setup`} className="text-sm underline min-h-[44px] px-2 inline-flex items-center">Door setup</Link>
        <Link href={`/door/${n.slug}/report`} className="text-sm underline min-h-[44px] px-2 inline-flex items-center">Report</Link>
      </div>
    </li>
  );
}

function Brand({ d, onSaved }: { d: Dashboard; onSaved: () => void }) {
  const p = d.promoter;
  const [f, setF] = useState({ name: p.name, tagline: p.tagline ?? "", blurb: p.blurb ?? "", city: p.city ?? "", instagram: p.instagram ?? "", website: p.website ?? "",
    accent: p.accent as Accent, logo_url: p.logo_url ?? "", cover_url: p.cover_url ?? "", genres: (p.genres ?? []).join(", ") });
  const [msg, setMsg] = useState("");
  const a = ACCENT[f.accent];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveBrand(p.slug, { ...f, genres: f.genres.split(",").map((s) => s.trim()).filter(Boolean) } as any);
        setMsg(r.ok ? "Saved." : r.error ?? "Could not save."); if (r.ok) onSaved();
      }}>
        <input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Name" maxLength={80} />
        <input className={inp} value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} placeholder="One line, e.g. House and disco in small rooms" maxLength={120} />
        <div>
          <p className="text-sm font-bold mb-1">Your colour</p>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((k) => (
              <button key={k} type="button" onClick={() => setF({ ...f, accent: k })} aria-pressed={f.accent === k}
                className={`w-12 h-12 border-4 ${ACCENT[k].bg} ${f.accent === k ? "border-ink ring-4 ring-ink ring-offset-2" : "border-ink"}`} title={ACCENT[k].label}>
                <span className="sr-only">{ACCENT[k].label}</span>
              </button>
            ))}
          </div>
        </div>
        <input className={inp} value={f.logo_url} onChange={(e) => setF({ ...f, logo_url: e.target.value })} placeholder="Logo image link (https://…), square works best" autoCapitalize="none" />
        <input className={inp} value={f.cover_url} onChange={(e) => setF({ ...f, cover_url: e.target.value })} placeholder="Cover photo link (https://…), wide" autoCapitalize="none" />
        <textarea className={inp} rows={4} value={f.blurb} onChange={(e) => setF({ ...f, blurb: e.target.value })} placeholder="About you, in a few plain lines" maxLength={1200} />
        <div className="grid grid-cols-2 gap-2">
          <input className={inp} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="City" />
          <input className={inp} value={f.genres} onChange={(e) => setF({ ...f, genres: e.target.value })} placeholder="Sounds, comma separated" />
          <input className={inp} value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} placeholder="Instagram" autoCapitalize="none" />
          <input className={inp} value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="Website" autoCapitalize="none" />
        </div>
        <button className={btn}>Save your look</button>
        {msg && <p className="text-sm font-bold">{msg}</p>}
      </form>
      <div>
        <p className="text-sm font-bold mb-1">Preview</p>
        <div className="border-4 border-ink chunk-shadow overflow-hidden">
          <div className={`relative ${a.bg} ${a.on} p-5 min-h-[180px] flex flex-col justify-end`}>
            {f.cover_url && /^https:\/\//.test(f.cover_url) && <img src={f.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
            <div className="relative flex items-end gap-3">
              {f.logo_url && /^https:\/\//.test(f.logo_url) && <img src={f.logo_url} alt="" className="w-16 h-16 object-cover border-4 border-ink bg-cream" />}
              <div>
                <p className="font-display text-3xl leading-none">{f.name || "Your name"}</p>
                {f.tagline && <p className="mt-1 font-bold">{f.tagline}</p>}
              </div>
            </div>
          </div>
          <div className="bg-cream p-4 text-sm">
            <p className="text-ink/70">On CCD at catscandance.com{promoterPath(p.slug)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Team({ d, onChange }: { d: Dashboard; onChange: () => void }) {
  const [email, setEmail] = useState(""); const [role, setRole] = useState<"admin" | "owner">("admin"); const [msg, setMsg] = useState("");
  const canEdit = d.role === "owner" || d.role === "staff";
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {d.team.map((t) => (
          <li key={t.email} className="border-4 border-ink bg-white p-3 flex items-center gap-3">
            <span className="flex-1 min-w-0 break-all font-bold">{t.email}</span>
            <span className="text-sm">{t.role === "owner" ? "Owner" : "Admin"}</span>
            {canEdit && <button className="text-sm underline min-h-[44px] px-2" onClick={async () => { const r = await setTeam(d.promoter.slug, t.email, t.role, true); setMsg(r.ok ? "" : r.error ?? ""); onChange(); }}>Remove</button>}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await setTeam(d.promoter.slug, email, role); setMsg(r.ok ? "Added. They sign in with that email." : r.error ?? ""); if (r.ok) { setEmail(""); onChange(); } }}>
          <input className={`${inp} flex-1 min-w-[200px]`} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="border-4 border-ink bg-white p-3" value={role} onChange={(e) => setRole(e.target.value as any)}><option value="admin">Admin</option><option value="owner">Owner</option></select>
          <button className={btn}>Add</button>
        </form>
      ) : <p className="text-sm text-ink/70">Only an owner can change the team.</p>}
      {msg && <p className="text-sm font-bold">{msg}</p>}
      <p className="text-sm text-ink/70">Admins can make nights and run the door. Owners can also change the team. For door staff on one night only, use Door setup on that night.</p>
    </div>
  );
}

function Body({ slug }: { slug: string }) {
  const [d, setD] = useState<Dashboard | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => { getDashboard(slug).then((r) => (r.ok ? setD(r.data) : setErr(r.error ?? "Could not load."))); }, [slug]);
  useEffect(() => { load(); }, [load]);
  if (err) return <p className="py-10">{err} <Link href="/promote" className="underline">Back</Link></p>;
  if (!d) return <p className="py-10 text-ink/70">Loading…</p>;
  const a = accentOf(d.promoter.accent);
  const today = todayIST();
  const nights = d.nights;
  const upcoming = nights.filter((n) => (n.event_date ?? "") >= today).reverse();
  const past = nights.filter((n) => (n.event_date ?? "") < today);
  const approved = d.promoter.status === "approved" || d.role === "staff";
  return (
    <div className="space-y-12">
      <div className={`border-4 border-ink ${a.bg} ${a.on} p-5 chunk-shadow`}>
        <p className="text-xs font-bold uppercase tracking-wide">Promoter on CCD</p>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-1">{d.promoter.name}</h1>
        {d.promoter.status === "approved" && <Link href={promoterPath(slug)} className="inline-block mt-3 underline font-bold">Your public page</Link>}
      </div>
      {d.promoter.status === "pending" && <p className="border-4 border-ink bg-white p-4"><b>Waiting for CCD.</b> We look at your past nights and get back to you, usually within a couple of days. You can set up your look while you wait.</p>}
      {d.promoter.status === "hidden" && <p className="border-4 border-magenta bg-white p-4"><b>Not approved this time.</b> {d.promoter.review_note ?? "Write to hello@catscandance.com if you think we got it wrong."}</p>}

      <section>
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <h2 className="font-display text-3xl leading-none">Nights</h2>
          {approved && <Link href={{ pathname: "/promote/[slug]/night", query: { slug } }} className={btn}>New night</Link>}
        </div>
        {!approved && <p className="mt-3 text-ink/70">You can add nights once we approve you.</p>}
        {approved && nights.length === 0 && <p className="mt-3 text-ink/70">No nights yet. Make one, send it to CCD, and it goes up once we have checked it.</p>}
        {upcoming.length > 0 && <ul className="mt-4 space-y-4">{upcoming.map((n) => <NightCard key={n.slug} n={n} promoter={slug} onChange={load} />)}</ul>}
        {past.length > 0 && (<><h3 className="font-display text-xl mt-8">Past</h3><ul className="mt-3 space-y-4">{past.map((n) => <NightCard key={n.slug} n={n} promoter={slug} onChange={load} />)}</ul></>)}
      </section>

      <section>
        <h2 className="font-display text-3xl leading-none mb-4">Your look on CCD</h2>
        <Brand d={d} onSaved={load} />
      </section>

      <section>
        <h2 className="font-display text-3xl leading-none mb-4">Team</h2>
        <Team d={d} onChange={load} />
      </section>
    </div>
  );
}

export default function PromoterDashboard() {
  const { query, isReady } = useRouter();
  const slug = typeof query.slug === "string" ? query.slug : "";
  return (
    <main className="bg-cream text-ink min-h-screen">
      <Head><title>Promoter dashboard | Cats Can Dance</title><meta name="robots" content="noindex, nofollow" /></Head>
      <Nav />
      <div className="container max-w-5xl pt-28 pb-16">
        <Link href="/promote" className="text-sm underline">All your promoters</Link>
        <div className="mt-4">
          <SignInGate next={`/promote/${slug}`} title="Sign in" line="Use the email on your promoter team.">
            {isReady && slug && <Body slug={slug} />}
          </SignInGate>
        </div>
      </div>
      <Footer />
    </main>
  );
}
