import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { rpc } from "@/lib/ccd-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops: bookings", robots: { index: false } };

type Row = {
  id: string; group_id: string | null; stage: string; artist_slug: string; artist: string | null; claimed: boolean; name: string; email: string;
  org: string | null; city: string | null; event_date: string | null; venue: string | null; room_size: number | null; set_length: string | null;
  budget_band: string | null; fee_inr: number | null; created_at: string; updated_at: string; seen_at: string | null; last_actor: string | null; messages: number;
};
type Nudge = { id: string; stage: string; artist: string | null; artist_slug: string; claimed: boolean; name: string; email: string; city: string | null; event_date: string | null; waiting_since: string; waiting_on: "artist" | "organiser" };
type Pipeline = { counts: Record<string, number>; rows: Row[]; nudges: Nudge[] };

const T = () => process.env.OPS_TOKEN;
const STAGES = ["sent", "seen", "interested", "countered", "accepted", "confirmed", "declined", "cancelled"];
const LABEL: Record<string, string> = { sent: "Sent", seen: "Seen", interested: "Interested", countered: "Counter", accepted: "Accepted", confirmed: "Confirmed", declined: "Declined", cancelled: "Withdrawn" };

async function setStage(formData: FormData) {
  "use server";
  await rpc("ops_booking_set_stage", { p_token: T(), p_id: String(formData.get("id")), p_stage: String(formData.get("stage")), p_note: String(formData.get("note") ?? "") || null });
  revalidatePath("/ops/bookings");
}

const ago = (iso: string) => {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
};

const css = `
.bk{font:14px/1.45 system-ui,sans-serif;max-width:1280px;margin:0 auto;padding:28px 16px 80px;color:#111}
.bk h2{margin:0 0 4px}.bk h3{margin:28px 0 8px}.bk .muted{color:#666;font-size:13px}
.bk table{border-collapse:collapse;width:100%}.bk th,.bk td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
.bk th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555;background:#fff}
.bk select,.bk input{padding:4px;font:inherit;border:2px solid #111;background:#fff}
.bk .btn{padding:4px 10px;border:2px solid #111;background:#b6ef36;font:inherit;font-weight:600;cursor:pointer}
.bk .stats{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.bk .stat{border:2px solid #111;padding:8px 12px;min-width:90px}.bk .stat b{display:block;font-size:22px}
.bk .pill{display:inline-block;border:2px solid #111;padding:0 6px;font-size:12px;font-weight:700}
.bk .confirmed{background:#dc2626;color:#fff}.bk .accepted,.bk .interested{background:#b6ef36}.bk .countered{background:#2563eb;color:#fff}.bk .declined,.bk .cancelled{color:#888;border-color:#aaa}
.bk .scroll{overflow-x:auto}.bk .warn{color:#dc2626;font-weight:700}
`;

export default async function OpsBookings() {
  let p: Pipeline | null = null;
  let err = "";
  try { p = await rpc<Pipeline>("ops_booking_pipeline", { p_token: T() }); } catch (e) { err = String(e); }
  const missing = !p && /ops_booking_pipeline|PGRST202|404/.test(err);
  const inbox = !p ? await rpc<any>("ops_inbox", { p_token: T() }).catch(() => null) : null;

  return (
    <main className="bk">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p className="muted" style={{ margin: 0 }}><Link href="/ops">Back to ops</Link></p>
      <h2>Bookings</h2>
      <p className="muted">Every request from the booking desk, by stage. The nudge list shows anything waiting more than 48 hours on one side.</p>

      {!p ? (
        <>
          <p className="warn">{missing ? "The pipeline needs migration 041_booking_desk.sql. Until it is applied, new requests land in the ops Inbox as before." : `Could not load: ${err}`}</p>
          {inbox?.bookings?.length > 0 && (
            <>
              <h3>New requests (from the Inbox)</h3>
              <div className="scroll"><table><thead><tr><th>When</th><th>Artist</th><th>From</th><th>City</th><th>Date</th><th>Budget</th><th>Message</th></tr></thead>
                <tbody>{inbox.bookings.map((b: any) => (
                  <tr key={b.id}><td>{ago(b.created_at)}</td><td>{b.artist_slug}</td><td>{b.name}<br /><span className="muted">{b.email}</span></td><td>{b.city}</td><td>{b.event_date}</td><td>{b.budget_inr}</td><td style={{ maxWidth: 420, whiteSpace: "pre-line" }}>{String(b.message ?? "").slice(0, 400)}</td></tr>
                ))}</tbody></table></div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="stats">
            {STAGES.map((s) => <div className="stat" key={s}><b>{p!.counts[s] ?? 0}</b>{LABEL[s]}</div>)}
          </div>

          <h3>Nudge list: no reply in 48 hours ({p.nudges.length})</h3>
          {p.nudges.length === 0 ? <p className="muted">Nothing waiting.</p> : (
            <div className="scroll"><table><thead><tr><th>Waiting</th><th>On</th><th>Stage</th><th>Artist</th><th>Organiser</th><th>Night</th><th>Do</th></tr></thead>
              <tbody>{p.nudges.map((n) => (
                <tr key={n.id}>
                  <td className="warn">{ago(n.waiting_since)}</td>
                  <td>{n.waiting_on === "artist" ? `Artist${n.claimed ? "" : " (page not claimed)"}` : "Organiser"}</td>
                  <td><span className={`pill ${n.stage}`}>{LABEL[n.stage] ?? n.stage}</span></td>
                  <td><a href={`/artists/${n.artist_slug}`}>{n.artist ?? n.artist_slug}</a></td>
                  <td>{n.name}<br /><a href={`mailto:${n.email}`}>{n.email}</a></td>
                  <td>{[n.event_date, n.city].filter(Boolean).join(", ")}</td>
                  <td>{n.waiting_on === "artist" && !n.claimed ? "Reach the artist directly and pass the brief on." : n.waiting_on === "artist" ? "Remind the artist to answer in their booking desk." : "Ask the organiser to accept, counter in the thread or withdraw."}</td>
                </tr>
              ))}</tbody></table></div>
          )}

          <h3>Pipeline, last 180 days ({p.rows.length})</h3>
          <div className="scroll"><table><thead><tr><th>Sent</th><th>Stage</th><th>Artist</th><th>Organiser</th><th>Night</th><th>Brief</th><th>Fee</th><th>Msgs</th><th>Set stage</th></tr></thead>
            <tbody>{p.rows.map((r) => (
              <tr key={r.id}>
                <td>{ago(r.created_at)}{r.group_id ? <><br /><span className="muted">group {r.group_id.slice(0, 6)}</span></> : null}</td>
                <td><span className={`pill ${r.stage}`}>{LABEL[r.stage] ?? r.stage}</span>{r.seen_at ? null : <><br /><span className="muted">not opened</span></>}</td>
                <td><a href={`/artists/${r.artist_slug}`}>{r.artist ?? r.artist_slug}</a>{r.claimed ? "" : <><br /><span className="muted">not claimed</span></>}</td>
                <td>{r.name}{r.org ? `, ${r.org}` : ""}<br /><a href={`mailto:${r.email}`}>{r.email}</a></td>
                <td>{[r.event_date, r.city, r.venue].filter(Boolean).join(", ")}</td>
                <td>{[r.room_size ? `${r.room_size} ppl` : "", r.set_length, r.budget_band].filter(Boolean).join(" · ")}</td>
                <td>{r.fee_inr ? `₹${r.fee_inr.toLocaleString("en-IN")}` : ""}</td>
                <td>{r.messages}</td>
                <td>
                  <form action={setStage} style={{ display: "flex", gap: 4 }}>
                    <input type="hidden" name="id" value={r.id} />
                    <select name="stage" defaultValue={r.stage}>{STAGES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}</select>
                    <input name="note" placeholder="Note (shows in thread)" style={{ width: 160 }} />
                    <button className="btn">Set</button>
                  </form>
                </td>
              </tr>
            ))}</tbody></table></div>
        </>
      )}
    </main>
  );
}
