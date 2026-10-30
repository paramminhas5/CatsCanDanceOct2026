import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { rpc, fmtDate } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops", robots: { index: false } };

type Snapshot = {
  counts: Record<string, number>;
  pending: { id: string; score: number; event_date: string | null; title: string; venue: string | null; city: string | null; source: string; genres: string[]; url: string; score_reasons: string[] }[];
  published: { id: string; event_date: string | null; title: string; venue: string | null; city: string | null; featured: boolean }[];
  runs: { job: string; started_at: string; finished_at: string | null; ok: boolean | null; stats: Record<string, unknown>; error: string | null }[];
  build: { id: number; area: string; title: string; status: string; detail: string | null; link: string | null; updated_at: string }[];
  ccd_events: { slug: string; title: string; date: string | null; event_date: string | null; venue: string | null; published: boolean }[];
};

async function setStatus(formData: FormData) {
  "use server";
  await rpc("ops_set_event_status", {
    p_token: process.env.OPS_TOKEN,
    p_id: String(formData.get("id")),
    p_status: String(formData.get("status")),
  });
  revalidatePath("/ops");
  revalidatePath("/events");
  revalidatePath("/");
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 2880) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

export default async function Ops() {
  let s: Snapshot | null = null;
  let err = "";
  try {
    s = await rpc<Snapshot>("ops_snapshot", { p_token: process.env.OPS_TOKEN });
  } catch (e) {
    err = String(e);
  }
  if (!s) return <main className="wrap ops"><h2 style={{ margin: "40px 0 12px" }}>Ops</h2><p className="bad">Could not load: {err || "no data"}</p></main>;

  const lastScrape = s.runs.find((r) => r.job === "scrape-events");
  const stats: [string, number | string][] = [
    ["Pending picks", s.counts.pending ?? 0],
    ["Published picks", s.counts.published ?? 0],
    ["Artists", s.counts.artists ?? 0],
    ["CCD events", s.counts.ccd_events ?? 0],
    ["RSVPs", s.counts.rsvps ?? 0],
    ["Signups", s.counts.signups ?? 0],
  ];

  return (
    <main className="wrap ops" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
        <h2>CCD Ops</h2>
        <span>
          Last scrape:{" "}
          {lastScrape ? (
            <span className={lastScrape.ok ? "ok" : "bad"}>
              {ago(lastScrape.started_at)} · {lastScrape.ok ? "ok" : "failed"} · {String(lastScrape.stats?.inserted ?? 0)} new
            </span>
          ) : (
            <span className="bad">never</span>
          )}
        </span>
      </div>

      <div className="stats" style={{ margin: "20px 0 36px" }}>
        {stats.map(([k, v]) => (
          <div className="stat" key={k}><b>{v}</b>{k}</div>
        ))}
      </div>

      <h3 style={{ marginBottom: 10 }}>What we&apos;re building</h3>
      <div className="scroll" style={{ marginBottom: 36 }}>
        <table>
          <thead><tr><th>Status</th><th>Area</th><th>Item</th><th>Updated</th></tr></thead>
          <tbody>
            {s.build.map((b) => (
              <tr key={b.id}>
                <td><span className={`pill ${b.status}`}>{b.status.replace("_", " ")}</span></td>
                <td>{b.area}</td>
                <td>
                  <b>{b.link ? <a href={b.link} target="_blank" rel="noreferrer">{b.title}</a> : b.title}</b>
                  {b.detail && <div className="muted">{b.detail}</div>}
                </td>
                <td>{ago(b.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginBottom: 10 }}>Pending picks ({s.pending.length})</h3>
      <p className="muted" style={{ marginTop: 0 }}>Highest score first. Publish puts it on /events within a few minutes.</p>
      <div className="scroll" style={{ marginBottom: 36 }}>
        <table>
          <thead><tr><th>Score</th><th>Date</th><th>Event</th><th>Why</th><th></th></tr></thead>
          <tbody>
            {s.pending.map((e) => (
              <tr key={e.id}>
                <td><b>{e.score}</b></td>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDate(e.event_date)}</td>
                <td>
                  <a href={e.url} target="_blank" rel="noreferrer"><b>{e.title}</b></a>
                  <div className="muted">{[e.venue, e.city, e.source].filter(Boolean).join(" · ")}</div>
                </td>
                <td className="muted" style={{ fontSize: 13 }}>{e.score_reasons.join(", ")}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <form action={setStatus}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="status" value="published" /><button className="btn sm">Publish</button></form>{" "}
                  <form action={setStatus}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="status" value="rejected" /><button className="btn sm alt">Skip</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginBottom: 10 }}>Live picks</h3>
      <div className="scroll" style={{ marginBottom: 36 }}>
        <table>
          <thead><tr><th>Date</th><th>Event</th><th></th></tr></thead>
          <tbody>
            {s.published.map((e) => (
              <tr key={e.id}>
                <td>{fmtDate(e.event_date)}</td>
                <td><b>{e.title}</b><div className="muted">{[e.venue, e.city].filter(Boolean).join(" · ")}</div></td>
                <td><form action={setStatus}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="status" value="pending" /><button className="btn sm alt">Unpublish</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginBottom: 10 }}>Cron runs</h3>
      <div className="scroll">
        <table>
          <thead><tr><th>Job</th><th>When</th><th>Result</th><th>Stats</th></tr></thead>
          <tbody>
            {s.runs.map((r, i) => (
              <tr key={i}>
                <td>{r.job}</td>
                <td>{ago(r.started_at)}</td>
                <td className={r.ok ? "ok" : "bad"}>{r.ok === null ? "running" : r.ok ? "ok" : r.error ?? "failed"}</td>
                <td className="muted" style={{ fontSize: 13 }}>{JSON.stringify(r.stats)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
