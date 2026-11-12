"use client";
/**
 * How it went (board H39-Report): the morning-after report from door_report. Who came in, arrivals by
 * hour with the busiest hour lit, how people got in, and what the door took. Export downloads the numbers.
 */
import { useEffect, useState } from "react";
import { fetchReport, sourceLabel, type Report as R } from "@/lib/door";
import { Gls, Top, dayShort } from "@/components/app/ui";

const hourIST = (t: string) => (new Date(Date.parse(t) + 5.5 * 36e5).getUTCHours());

export default function Report({ slug }: { slug: string }) {
  const [r, setR] = useState<R | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fetchReport(slug).then((x) => (x.ok && x.data ? setR(x.data) : setErr(x.error ?? "Could not load the report"))); }, [slug]);
  if (err) return <><Top back="/parties" /><p className="err" style={{ padding: "0 20px" }} role="alert">{err}</p></>;
  if (!r) return <><Top back="/parties" /><p className="b" style={{ padding: "0 20px" }} aria-busy="true">Building the report</p></>;

  const sold = r.tiers.reduce((a, t) => a + t.sold, 0);
  const inT = r.tiers.reduce((a, t) => a + t.in, 0);
  const outside = r.outside ?? [];
  const inO = outside.reduce((a, o) => a + o.in, 0);
  const total = inT + r.list.in + inO + r.walkins.people;
  const expected = sold + r.list.people + outside.reduce((a, o) => a + o.people, 0);
  const noShows = Math.max(0, expected - (inT + r.list.in + inO));
  const takings = Object.entries(r.walkins.takings ?? {});
  const took = takings.reduce((a, [, v]) => a + Number(v), 0);

  // Arrivals come in 15-minute slots; the board shows hours.
  const byHour = new Map<number, number>();
  for (const a of r.arrivals) byHour.set(hourIST(a.t), (byHour.get(hourIST(a.t)) ?? 0) + a.n);
  const order = [...byHour.keys()].sort((a, b) => ((a + 12) % 24) - ((b + 12) % 24));
  const peak = Math.max(1, ...byHour.values());
  const busiest = order.find((h) => byHour.get(h) === peak);
  const pad = (h: number) => String(h).padStart(2, "0");

  const exportCsv = () => {
    const rows = [["What", "People", "In"], ...r.tiers.map((t) => [`Tickets: ${t.tier}`, t.sold, t.in]), ["Guest list", r.list.people, r.list.in], ...outside.map((o) => [sourceLabel(o.source), o.people, o.in]), ["Walk-ins", r.walkins.people, r.walkins.people], ...takings.map(([m, v]) => [`Door takings: ${m}`, v, ""]), ["Pass-outs", r.passouts, ""], ...order.map((h) => [`Arrived ${pad(h)}:00`, byHour.get(h) ?? 0, ""])];
    const blob = new Blob([rows.map((x) => x.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${slug}-report.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <Top back="/parties" right={<button type="button" className="m" onClick={exportCsv} style={{ background: "none", border: 0, cursor: "pointer", color: "inherit" }}>Export</button>} />
      <div style={{ padding: "4px 20px 0", flex: "none" }}>
        <span className="m">{[r.night.title, r.night.venue, dayShort(r.night.date)].filter(Boolean).map((x, i) => <span key={i}>{i > 0 && <span style={{ opacity: 0.35 }}> / </span>}{x}</span>)}</span>
        <h1 className="d" style={{ fontSize: 40, marginTop: 10, marginBottom: 0 }}>How it went</h1>
        <div style={{ marginTop: 18 }} className="rise"><Gls cells={[{ label: "In", value: total }, { label: "No-shows", value: expected ? noShows : "–" }, { label: took ? "Door took" : "Came back", value: took ? `₹${took.toLocaleString("en-IN")}` : r.repeat }]} /></div>
        <div className="row" style={{ marginTop: 22 }}><span className="m" style={{ flex: 1 }}>Arrivals by hour</span>{busiest != null && <span className="m">Busiest {pad(busiest)}:00</span>}</div>
        {order.length ? (
          <div className="row" style={{ alignItems: "flex-end", gap: 10, height: 140, marginTop: 16 }} role="img" aria-label={`Arrivals by hour, busiest ${busiest != null ? pad(busiest) : ""}:00`}>
            {order.map((h) => (
              <div key={h} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div className="host-bar" style={{ width: "100%", height: Math.max(6, ((byHour.get(h) ?? 0) / peak) * 110), borderRadius: 6, background: h === busiest ? "var(--pc)" : "rgba(255,255,255,.14)", animation: "host-grow-y .8s cubic-bezier(.2,.8,.2,1) both", transformOrigin: "bottom" }} title={`${byHour.get(h)} at ${pad(h)}:00`} />
                <span className="m">{pad(h)}</span>
              </div>
            ))}
          </div>
        ) : <p className="b" style={{ marginTop: 12 }}>No arrivals were scanned at the door.</p>}
        <div style={{ marginTop: 22 }}>
          {r.tiers.map((t) => <div key={t.tier} className="rw" style={{ padding: "12px 0" }}><span style={{ flex: 1, fontSize: 15 }}>{t.tier}</span><span style={{ fontSize: 15, fontWeight: 600 }}>{t.in} of {t.sold}</span></div>)}
          {r.list.people > 0 && <div className="rw" style={{ padding: "12px 0" }}><span style={{ flex: 1, fontSize: 15 }}>Guest list</span><span style={{ fontSize: 15, fontWeight: 600 }}>{r.list.in} of {r.list.people}</span></div>}
          {outside.map((o) => <div key={o.source} className="rw" style={{ padding: "12px 0" }}><span style={{ flex: 1, fontSize: 15 }}>Outside tickets</span><span style={{ fontSize: 15, fontWeight: 600 }}>{o.in} from {sourceLabel(o.source)}</span></div>)}
          {r.walkins.people > 0 && <div className="rw" style={{ padding: "12px 0" }}><span style={{ flex: 1, fontSize: 15 }}>Walk-ins</span><span style={{ fontSize: 15, fontWeight: 600 }}>{r.walkins.people}</span></div>}
          {takings.map(([m, v]) => <div key={m} className="rw" style={{ padding: "12px 0" }}><span style={{ flex: 1, fontSize: 15 }}>Door, {({ upi: "UPI", cash: "cash", card: "card" } as Record<string, string>)[m] ?? m}</span><span style={{ fontSize: 15, fontWeight: 600 }}>₹{Number(v).toLocaleString("en-IN")}</span></div>)}
          <div className="rw" style={{ padding: "12px 0" }}><span style={{ flex: 1, fontSize: 15 }}>First time with us</span><span style={{ fontSize: 15, fontWeight: 600 }}>{r.first_timers}</span></div>
          <div className="hl" />
        </div>
        <div className="b" style={{ fontSize: 13, marginTop: 12 }}>{r.passouts ? `${r.passouts} pass-outs. ` : ""}Counts come from the door, so anyone let in without a scan is not here.</div>
      </div>
    </>
  );
}
