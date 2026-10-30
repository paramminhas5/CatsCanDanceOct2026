import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { rpc, fmtDate } from "@/lib/ccd-db";

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


const T = () => process.env.OPS_TOKEN;
async function artistStatus(formData: FormData) {
  "use server";
  await rpc("ops_set_artist_status", { p_token: T(), p_id: String(formData.get("id")), p_status: String(formData.get("status")) });
  revalidatePath("/ops"); revalidatePath("/prowl");
}
async function bulkArtists(formData: FormData) {
  "use server";
  await rpc("ops_bulk_artists", { p_token: T(), p_from: String(formData.get("from")), p_to: String(formData.get("to")) });
  revalidatePath("/ops"); revalidatePath("/prowl");
}
async function confirmCandidate(formData: FormData) {
  "use server";
  await rpc("ops_confirm_candidate", { p_token: T(), p_id: String(formData.get("id")) });
  revalidatePath("/ops");
}
async function discover() {
  "use server";
  await rpc("ops_discover_artists", { p_token: T() });
  revalidatePath("/ops");
}
async function setRole(formData: FormData) {
  "use server";
  await rpc("ops_set_member_role", { p_token: T(), p_email: String(formData.get("email")), p_role: String(formData.get("role")) });
  revalidatePath("/ops");
}
async function swapStatus(formData: FormData) {
  "use server";
  await rpc("ops_set_swap_status", { p_token: T(), p_id: String(formData.get("id")), p_status: String(formData.get("status")) });
  revalidatePath("/ops");
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

  const [todos, hidden, members, swaps] = await Promise.all([
    rpc<any>("ops_todos", { p_token: T() }).catch(() => null),
    rpc<any[]>("ops_artists", { p_token: T(), p_status: "hidden" }).catch(() => []),
    rpc<any[]>("ops_members", { p_token: T() }).catch(() => []),
    rpc<any[]>("ops_swaps", { p_token: T() }).catch(() => []),
  ]);
  const ROLES = ["member", "host", "staff", "owner"];
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

      <h3 style={{ marginBottom: 10 }}>To do</h3>
      <div className="scroll" style={{ marginBottom: 36 }}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>{todos?.events_to_review ?? 0} scene events to review (below)</li>
          <li>{hidden?.length ?? 0} artists waiting for approval (below)</li>
          <li>{todos?.hosted_events_pending ?? 0} member-hosted events waiting (staff approve on /club)</li>
          <li>{todos?.ticket_swaps_pending ?? 0} ticket listings waiting (below)</li>
          <li>{todos?.blog_drafts?.length ?? 0} blog drafts{(todos?.blog_drafts ?? []).map((d: any) => ` · ${d.title}`).join("")}</li>
          <li>{todos?.artists_missing_bio ?? 0} approved artists have no bio</li>
        </ul>
      </div>

      <h3 style={{ marginBottom: 10 }}>Artists waiting ({hidden?.length ?? 0})</h3>
      <p className="muted" style={{ marginTop: 0 }}>Hidden artists are not on the site. Approve puts them on /prowl. New names come from event lineups.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <form action={bulkArtists}><input type="hidden" name="from" value="hidden" /><input type="hidden" name="to" value="approved" /><button className="btn sm">Approve all {hidden?.length ?? 0}</button></form>
        <form action={discover}><button className="btn sm alt">Find new names in lineups</button></form>
      </div>
      <div className="scroll" style={{ marginBottom: 36, maxHeight: 420, overflow: "auto" }}>
        <table>
          <thead><tr><th>Artist</th><th>Source</th><th>Profiles found</th><th></th></tr></thead>
          <tbody>
            {(hidden ?? []).map((a: any) => (
              <tr key={a.id}>
                <td><b>{a.name}</b><div className="muted">{[a.based_city, (a.genres ?? []).join(", ")].filter(Boolean).join(" · ")}</div></td>
                <td>{a.source}</td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {a.candidates ? <>{a.candidates.deezer && <a href={a.candidates.deezer.link} target="_blank" rel="noreferrer">Deezer</a>} {a.candidates.apple && <a href={a.candidates.apple.link} target="_blank" rel="noreferrer">Apple</a>} · {a.confidence}</> : "none yet"}
                  {a.candidates && a.confidence !== "confirmed by CCD" && <form action={confirmCandidate} style={{ display: "inline" }}> <input type="hidden" name="id" value={a.id} /><button className="btn sm alt">Confirm</button></form>}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <form action={artistStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="approved" /><button className="btn sm">Approve</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginBottom: 10 }}>People and roles</h3>
      <p className="muted" style={{ marginTop: 0 }}>Visitor: not signed in. Member: likes, goes, follows, can host (reviewed). Host: events publish straight away. Staff: approves events. Owner: staff plus this page.</p>
      <form action={setRole} style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input name="email" type="email" placeholder="member email" required style={{ padding: 6 }} />
        <select name="role" style={{ padding: 6 }}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        <button className="btn sm">Set role</button>
      </form>
      <div className="scroll" style={{ marginBottom: 36 }}>
        <table>
          <thead><tr><th>Email</th><th>Name</th><th>City</th><th>Role</th></tr></thead>
          <tbody>
            {(members ?? []).map((m: any) => <tr key={m.email}><td>{m.email}</td><td>{m.display_name}</td><td>{m.city}</td><td><b>{m.role}</b></td></tr>)}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginBottom: 10 }}>Ticket listings ({(swaps ?? []).filter((x: any) => x.status === "pending").length} waiting)</h3>
      <div className="scroll" style={{ marginBottom: 36 }}>
        <table>
          <thead><tr><th>Event</th><th>Type</th><th>Price</th><th>Contact</th><th></th></tr></thead>
          <tbody>
            {(swaps ?? []).map((x: any) => (
              <tr key={x.id}>
                <td><b>{x.event_label}</b><div className="muted">{x.status} · {x.ticket_count} ticket(s) {x.tier ?? ""}</div></td>
                <td>{x.swap_type}</td><td>{x.face_value_inr ?? "-"}</td><td className="muted">{x.contact}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {x.status === "pending" && <form action={swapStatus} style={{ display: "inline" }}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="status" value="approved" /><button className="btn sm">Approve</button></form>}{" "}
                  <form action={swapStatus} style={{ display: "inline" }}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="status" value={x.status === "pending" ? "rejected" : "closed"} /><button className="btn sm alt">{x.status === "pending" ? "Reject" : "Close"}</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
