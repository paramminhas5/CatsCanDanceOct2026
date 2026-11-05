/**
 * /door/<night>/report: how the door went. Turnout, tiers, the free list, walk-ins and takings,
 * arrivals every 15 minutes, repeat guests and first-timers, pass-outs, and which phone did what.
 * Anyone who can open the night's door (door_report).
 */
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import DoorGate from "@/components/door/DoorGate";
import { fetchReport, sourceLabel, timeIST } from "@/lib/door";

type Report = {
  night: { title: string; date: string | null; venue: string | null; capacity: number | null };
  tiers: { tier: string; sold: number; in: number }[];
  list: { people: number; in: number };
  outside?: { source: string; people: number; in: number; uploaded: number }[];
  walkins: { people: number; takings: Record<string, number> };
  arrivals: { t: string; n: number }[];
  repeat: number; first_timers: number; passouts: number;
  devices: { device: string; actions: number }[];
};

function ReportBody({ slug }: { slug: string }) {
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { fetchReport(slug).then((x) => (x.ok ? setR(x.data as Report) : setErr(x.error ?? "Could not load."))); }, [slug]);
  if (err) return <p className="mt-6">{err}</p>;
  if (!r) return <p className="mt-6 text-cream/70">Loading…</p>;

  const sold = r.tiers.reduce((s, t) => s + t.sold, 0);
  const ticketsIn = r.tiers.reduce((s, t) => s + t.in, 0);
  const outP = (r.outside ?? []).reduce((s, o) => s + o.people, 0);
  const outIn = (r.outside ?? []).reduce((s, o) => s + o.in, 0);
  const expected = sold + r.list.people + outP;
  const came = ticketsIn + r.list.in + outIn;
  const total = came + r.walkins.people;
  const turnout = expected ? Math.round((came / expected) * 100) : null;
  const takings = Object.values(r.walkins.takings).reduce((s, v) => s + v, 0);
  const peak = r.arrivals.reduce((m, a) => (a.n > m.n ? a : m), { t: "", n: 0 });
  const max = Math.max(1, ...r.arrivals.map((a) => a.n));

  const summary = [
    `${r.night.title}${r.night.date ? `, ${r.night.date}` : ""}${r.night.venue ? `, ${r.night.venue}` : ""}`,
    `${total} through the door${r.night.capacity ? ` (cap ${r.night.capacity})` : ""}.`,
    expected ? `${came} of ${expected} on the list came (${turnout}%). ${expected - came} no-shows.` : "",
    r.walkins.people ? `${r.walkins.people} walk-ins, ₹${takings.toLocaleString("en-IN")} at the door.` : "",
    peak.n ? `Busiest 15 minutes: ${timeIST(peak.t)} with ${peak.n}.` : "",
    r.repeat + r.first_timers ? `${r.repeat} came back from an earlier night, ${r.first_timers} first time.` : "",
  ].filter(Boolean).join("\n");

  const stat = (label: string, v: string | number, sub?: string) => (
    <div className="border-4 border-cream p-3">
      <p className="text-xs text-cream/60 uppercase tracking-wide">{label}</p>
      <p className="font-display text-3xl tabular-nums leading-tight">{v}</p>
      {sub && <p className="text-xs text-cream/60">{sub}</p>}
    </div>
  );

  return (
    <div className="mt-6 space-y-8">
      <div>
        <h1 className="font-display text-3xl leading-tight">{r.night.title}</h1>
        <p className="text-cream/70">{[r.night.date, r.night.venue].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stat("Through the door", total, r.night.capacity ? `cap ${r.night.capacity}` : undefined)}
        {stat("Turnout", turnout === null ? "–" : `${turnout}%`, expected ? `${came} of ${expected} on the list` : "nobody on the list")}
        {stat("No-shows", Math.max(0, expected - came))}
        {stat("Walk-ins", r.walkins.people, takings ? `₹${takings.toLocaleString("en-IN")}` : undefined)}
        {stat("Came back", r.repeat, "from an earlier night")}
        {stat("First time", r.first_timers)}
      </div>

      <section>
        <h2 className="font-display text-xl">Arrivals every 15 minutes</h2>
        {r.arrivals.length === 0 ? <p className="text-cream/70 text-sm mt-1">Nobody checked in.</p> : (
          <>
            <div className="mt-2 flex items-end gap-1 h-36 border-b-4 border-cream" role="img" aria-label={`Peak ${peak.n} at ${peak.t ? timeIST(peak.t) : ""}`}>
              {r.arrivals.map((a) => (
                <div key={a.t} className="flex-1 h-full flex flex-col justify-end min-w-0" title={`${timeIST(a.t)}: ${a.n}`}>
                  <div className={`w-full ${a.t === peak.t ? "bg-acid-yellow" : "bg-cream/60"}`} style={{ height: `${(a.n / max) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-cream/60 mt-1">
              <span>{timeIST(r.arrivals[0].t)}</span><span>Busiest {timeIST(peak.t)} ({peak.n})</span><span>{timeIST(r.arrivals[r.arrivals.length - 1].t)}</span>
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl">Tickets and the list</h2>
        <table className="w-full mt-2 text-sm">
          <thead><tr className="text-left text-cream/60"><th className="py-1">Type</th><th className="text-right">Sold</th><th className="text-right">Came</th></tr></thead>
          <tbody>
            {r.tiers.map((t) => <tr key={t.tier} className="border-t-2 border-cream/20"><td className="py-2">{t.tier}</td><td className="text-right tabular-nums">{t.sold}</td><td className="text-right tabular-nums">{t.in}</td></tr>)}
            {r.list.people > 0 && <tr className="border-t-2 border-cream/20"><td className="py-2">Free list (RSVP)</td><td className="text-right tabular-nums">{r.list.people}</td><td className="text-right tabular-nums">{r.list.in}</td></tr>}
            {(r.outside ?? []).map((o) => <tr key={o.source} className="border-t-2 border-cream/20"><td className="py-2">{sourceLabel(o.source)}{o.uploaded ? ` (${o.uploaded} added by guests)` : ""}</td><td className="text-right tabular-nums">{o.people}</td><td className="text-right tabular-nums">{o.in}</td></tr>)}
          </tbody>
        </table>
        {Object.keys(r.walkins.takings).length > 0 && (
          <p className="text-sm mt-3">Door takings: {Object.entries(r.walkins.takings).map(([m, v]) => `${m.toUpperCase()} ₹${v.toLocaleString("en-IN")}`).join(" · ")}</p>
        )}
        {r.passouts > 0 && <p className="text-sm mt-1">{r.passouts} pass-out{r.passouts === 1 ? "" : "s"}.</p>}
        {r.devices.length > 0 && <p className="text-xs text-cream/60 mt-3">Door phones: {r.devices.map((d) => `${d.device} (${d.actions})`).join(" · ")}</p>}
      </section>

      <section className="border-4 border-cream p-3">
        <pre className="whitespace-pre-wrap text-sm font-sans">{summary}</pre>
        <button type="button" className="mt-2 font-display px-4 py-3 bg-acid-yellow text-ink border-4 border-ink"
          onClick={async () => { try { await navigator.clipboard.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ } }}>
          {copied ? "Copied" : "Copy summary"}
        </button>
      </section>
    </div>
  );
}

export default function DoorReportPage() {
  const { query, isReady } = useRouter();
  const slug = typeof query.slug === "string" ? query.slug : "";
  return (
    <>
      <Head>
        <title>Door report | Cats Can Dance</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <DoorGate next={`/door/${slug}/report`}>
        <div className="min-h-[100dvh] bg-ink text-cream px-4 py-6">
          <div className="max-w-lg mx-auto">
            <p className="font-display text-acid-yellow text-sm tracking-widest">CCD DOOR · REPORT</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <Link href={`/door/${slug}`} className="underline font-bold">Open the door</Link>
              <Link href="/door" className="underline">All nights</Link>
            </div>
            {isReady && slug && <ReportBody slug={slug} />}
          </div>
        </div>
      </DoorGate>
    </>
  );
}
