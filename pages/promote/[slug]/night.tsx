/**
 * /promote/<promoter>/night?night=<slug>: make or edit a night. Free ticket types (name, cap, per order) or your own ticket link,
 * plus an optional free list. Saving keeps it a draft; "Save and send to CCD" asks us to check it.
 */
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SignInGate from "@/components/SignInGate";
import ImageField from "@/components/promoters/ImageField";
import { getDashboard, nightStatus, saveNight, stateOf, type PNight, type Tier } from "@/lib/promoters";

const inp = "w-full border-4 border-ink bg-white p-3";
const lab = "block text-sm font-bold mb-1";

type Form = {
  title: string; event_date: string; start_time: string; venue: string; city: string; capacity: string; blurb: string; lineup: string; genres: string;
  poster_url: string; ticket_url: string; rsvp_open: boolean; mode: "free" | "link"; tiers: { name: string; capacity: string; max_per_order: string }[];
};
const blank: Form = { title: "", event_date: "", start_time: "", venue: "", city: "", capacity: "", blurb: "", lineup: "", genres: "", poster_url: "", ticket_url: "", rsvp_open: false, mode: "free",
  tiers: [{ name: "Free entry", capacity: "", max_per_order: "2" }] };

function fromNight(n: PNight): Form {
  return {
    title: n.title, event_date: n.event_date ?? "", start_time: n.start_time ?? "", venue: n.venue ?? "", city: n.city ?? "", capacity: n.capacity ? String(n.capacity) : "",
    blurb: n.blurb ?? "", lineup: (n.lineup ?? []).join(", "), genres: (n.genres ?? []).join(", "), poster_url: n.poster_url ?? "", ticket_url: n.ticket_url ?? "",
    rsvp_open: !!n.rsvp_open, mode: n.ticket_url && !(n.tiers ?? []).length ? "link" : "free",
    tiers: (n.tiers ?? []).length ? n.tiers.map((t: Tier) => ({ name: t.name, capacity: t.capacity ? String(t.capacity) : "", max_per_order: String(t.max_per_order ?? 2) })) : blank.tiers,
  };
}

function Editor({ promoter, night }: { promoter: string; night: string | null }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(blank);
  const [current, setCurrent] = useState<PNight | null>(null);
  const [ready, setReady] = useState(!night);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!night) return;
    getDashboard(promoter).then((r) => {
      if (!r.ok) { setErr(r.error ?? "Could not load."); return; }
      const n = r.data.nights.find((x) => x.slug === night);
      if (!n) { setErr("Night not found."); return; }
      setCurrent(n); setF(fromNight(n)); setReady(true);
    });
  }, [promoter, night]);

  const save = async (send: boolean) => {
    setBusy(true); setErr("");
    const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
    const r = await saveNight(promoter, night, {
      title: f.title, event_date: f.event_date, start_time: f.start_time, venue: f.venue, city: f.city, capacity: f.capacity, blurb: f.blurb,
      lineup: list(f.lineup), genres: list(f.genres), poster_url: f.poster_url, rsvp_open: f.rsvp_open,
      ticket_url: f.mode === "link" ? f.ticket_url : "",
      tiers: f.mode === "free" ? f.tiers.filter((t) => t.name.trim()) : [],
    });
    if (!r.ok) { setBusy(false); setErr(r.error ?? "Could not save."); return; }
    const slug = (r.data as any).slug as string;
    if (send) await nightStatus(slug, "submit");
    setBusy(false);
    router.push(`/promote/${promoter}`);
  };

  if (err && !ready) return <p className="py-10">{err}</p>;
  if (!ready) return <p className="py-10 text-ink/70">Loading…</p>;
  const st = current ? stateOf(current) : null;
  const setTier = (i: number, k: "name" | "capacity" | "max_per_order", v: string) => setF({ ...f, tiers: f.tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)) });

  return (
    <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); save(false); }}>
      <div>
        <h1 className="font-display text-4xl leading-none">{night ? "Edit night" : "New night"}</h1>
        {st && <p className="mt-2"><span className={`inline-block text-xs font-bold px-2 py-0.5 border-2 border-ink ${st.tone}`}>{st.label}</span> <span className="text-sm">{st.next}</span></p>}
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">The night</h2>
        <div><label className={lab}>Name</label><input className={inp} required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} placeholder="e.g. Basement Sessions 04" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lab}>Date</label><input className={inp} type="date" required value={f.event_date} onChange={(e) => setF({ ...f, event_date: e.target.value })} /></div>
          <div><label className={lab}>Start time</label><input className={inp} value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} placeholder="e.g. 9pm" /></div>
          <div><label className={lab}>Venue</label><input className={inp} required value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></div>
          <div><label className={lab}>City</label><input className={inp} required value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
        </div>
        <div><label className={lab}>Lineup</label><input className={inp} value={f.lineup} onChange={(e) => setF({ ...f, lineup: e.target.value })} placeholder="Names, comma separated" /></div>
        <div><label className={lab}>Sounds</label><input className={inp} value={f.genres} onChange={(e) => setF({ ...f, genres: e.target.value })} placeholder="e.g. house, disco" /></div>
        <div><label className={lab}>About the night</label><textarea className={inp} rows={4} value={f.blurb} onChange={(e) => setF({ ...f, blurb: e.target.value })} maxLength={1500} placeholder="What to expect, in a few plain lines" /></div>
        <ImageField promoter={promoter} kind="poster" label="Poster" hint="Portrait (4:5) works best." value={f.poster_url} onChange={(u) => setF((x) => ({ ...x, poster_url: u }))} inputClass={inp} />
        <div><label className={lab}>Capacity</label><input className={inp} inputMode="numeric" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value.replace(/\D/g, "") })} placeholder="How many the room holds" /></div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Tickets</h2>
        <div className="grid grid-cols-2 border-4 border-ink" role="group">
          <button type="button" onClick={() => setF({ ...f, mode: "free" })} aria-pressed={f.mode === "free"} className={`font-display py-3 ${f.mode === "free" ? "bg-acid-yellow" : "bg-white"}`}>Free tickets on CCD</button>
          <button type="button" onClick={() => setF({ ...f, mode: "link" })} aria-pressed={f.mode === "link"} className={`font-display py-3 border-l-4 border-ink ${f.mode === "link" ? "bg-acid-yellow" : "bg-white"}`}>My own ticket link</button>
        </div>
        {f.mode === "free" ? (
          <div className="space-y-2">
            <p className="text-sm text-ink/75">Each guest gets a QR ticket for the door. Paid tickets on CCD come later; for a paid night, use your own ticket link.</p>
            {f.tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_90px_auto] gap-2 items-end">
                <div><label className="text-xs font-bold">Type</label><input className={inp} value={t.name} onChange={(e) => setTier(i, "name", e.target.value)} placeholder="e.g. Early entry" maxLength={60} /></div>
                <div><label className="text-xs font-bold">Cap</label><input className={inp} inputMode="numeric" value={t.capacity} onChange={(e) => setTier(i, "capacity", e.target.value.replace(/\D/g, ""))} placeholder="100" /></div>
                <div><label className="text-xs font-bold">Per order</label><input className={inp} inputMode="numeric" value={t.max_per_order} onChange={(e) => setTier(i, "max_per_order", e.target.value.replace(/\D/g, ""))} placeholder="2" /></div>
                <button type="button" className="text-sm underline min-h-[44px] px-1" onClick={() => setF({ ...f, tiers: f.tiers.filter((_, j) => j !== i) })} disabled={f.tiers.length === 1}>Remove</button>
              </div>
            ))}
            <button type="button" className="text-sm underline" onClick={() => setF({ ...f, tiers: [...f.tiers, { name: "", capacity: "", max_per_order: "2" }] })}>Add a ticket type</button>
          </div>
        ) : (
          <div><label className={lab}>Ticket link</label><input className={inp} value={f.ticket_url} onChange={(e) => setF({ ...f, ticket_url: e.target.value })} placeholder="https://…" autoCapitalize="none" /></div>
        )}
        <label className="flex items-center gap-3 border-4 border-ink bg-white p-3">
          <input type="checkbox" className="w-6 h-6" checked={f.rsvp_open} onChange={(e) => setF({ ...f, rsvp_open: e.target.checked })} />
          <span><b>Free list (RSVP)</b><span className="block text-sm text-ink/70">Guests put their name down with plus-ones. The door checks them in by name.</span></span>
        </label>
      </section>

      {err && <p className="font-bold text-magenta">{err}</p>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className="font-display text-lg px-5 py-3 border-4 border-ink bg-white">{busy ? "Saving…" : "Save draft"}</button>
        {!current?.published && <button type="button" disabled={busy} onClick={() => save(true)} className="font-display text-lg px-5 py-3 border-4 border-ink bg-acid-yellow">Save and send to CCD</button>}
        {current?.published && <span className="text-sm self-center">This night is live. Saving updates it straight away.</span>}
      </div>
    </form>
  );
}

export default function NightEditorPage() {
  const { query, isReady } = useRouter();
  const promoter = typeof query.slug === "string" ? query.slug : "";
  const night = typeof query.night === "string" ? query.night : null;
  return (
    <main className="bg-cream text-ink min-h-screen">
      <Head><title>Night | Cats Can Dance</title><meta name="robots" content="noindex, nofollow" /></Head>
      <Nav />
      <div className="container max-w-3xl pt-28 pb-16">
        <Link href={`/promote/${promoter}`} className="text-sm underline">Back to your nights</Link>
        <div className="mt-4">
          <SignInGate next={`/promote/${promoter}/night${night ? `?night=${night}` : ""}`} title="Sign in" line="Use the email on your promoter team.">
            {isReady && promoter && <Editor promoter={promoter} night={night} />}
          </SignInGate>
        </div>
      </div>
      <Footer />
    </main>
  );
}
