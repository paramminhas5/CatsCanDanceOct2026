import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { rpc, fmtDate } from "@/lib/ccd-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops: tour", robots: { index: false } };

type Stop = { id: string; city: string; from_date: string; to_date: string; state: "playing" | "open"; venue: string | null; ticket_url: string | null };
type Post = {
  id: string; kind: "touring" | "away"; act_name: string; artist_slug: string | null; home_city: string | null; home_country: string | null;
  instagram: string | null; ra: string | null; spotify: string | null; email: string; note: string | null; status: string;
  created_at: string; stops: Stop[];
};
type OldDate = { id: string; artist_slug: string; artist_name: string; email: string; city: string; from_date: string; to_date: string; note: string | null; created_at: string };

const T = () => process.env.OPS_TOKEN;
const STATUSES = ["pending", "approved", "rejected"] as const;
const done = (status: string) => {
  revalidatePath("/ops/tour"); revalidatePath("/ops"); revalidatePath("/tour");
  redirect(`/ops/tour${status && status !== "pending" ? `?status=${status}` : ""}`);
};

async function review(formData: FormData) {
  "use server";
  await rpc("ops_tour_review", {
    p_token: T(), p_id: String(formData.get("id")), p_status: String(formData.get("to")),
    p_artist_slug: String(formData.get("slug") ?? "").trim() || null,
  });
  done(String(formData.get("back") ?? ""));
}
async function reviewOld(formData: FormData) {
  "use server";
  await rpc("ops_set_inbox_status", { p_token: T(), p_kind: "dates", p_id: String(formData.get("id")), p_status: String(formData.get("to")) });
  done("");
}

const css = `
.tour{font:14px/1.45 system-ui,sans-serif;max-width:1180px;margin:0 auto;padding:28px 16px 80px;color:#111}
.tour h2{margin:0 0 4px}.tour h3{margin:28px 0 8px}.tour .muted{color:#666;font-size:13px}
.tour .tabs{display:flex;gap:8px;margin:16px 0}.tour .tabs a{padding:5px 10px;border:2px solid #111;color:#111;text-decoration:none;font-weight:600}
.tour .tabs a.on{background:#111;color:#fff}
.tour .card{border:2px solid #111;padding:14px;margin:0 0 12px;display:grid;gap:8px}
.tour .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tour .tag{display:inline-block;padding:1px 6px;border:1px solid #111;font-size:12px;font-weight:600}
.tour .tag.touring{background:#2563eb;color:#fff;border-color:#2563eb}.tour .tag.away{background:#dc2626;color:#fff;border-color:#dc2626}
.tour .tag.playing{background:#dc2626;color:#fff;border-color:#dc2626}.tour .tag.open{background:#b6ef36}
.tour table{border-collapse:collapse;width:100%}.tour td,.tour th{border-bottom:1px solid #ddd;padding:5px 8px;text-align:left;vertical-align:top}
.tour th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555}
.tour input{padding:5px;font:inherit;border:2px solid #111;background:#fff}
.tour .btn{padding:5px 10px;border:2px solid #111;background:#b6ef36;font:inherit;font-weight:600;cursor:pointer}
.tour .btn.alt{background:#fff}.tour .btn.red{background:#dc2626;color:#fff}
.tour .warn{border:2px solid #dc2626;padding:10px 12px;background:#fff5f5}
`;

export default async function OpsTour({ searchParams }: { searchParams: { status?: string } }) {
  const status = STATUSES.includes((searchParams?.status ?? "pending") as any) ? (searchParams?.status ?? "pending") : "pending";
  let posts: Post[] = [];
  let missing = false;
  let err = "";
  try {
    posts = (await rpc<Post[]>("ops_tour_posts", { p_token: T(), p_status: status })) ?? [];
  } catch (e) {
    const msg = String(e);
    if (/404|PGRST202|Could not find the function/i.test(msg)) missing = true;
    else err = msg;
  }
  let old: OldDate[] = [];
  try {
    const inbox = await rpc<{ dates?: OldDate[] }>("ops_inbox", { p_token: T() });
    old = inbox?.dates ?? [];
  } catch {}

  return (
    <main className="tour">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p className="muted" style={{ margin: 0 }}><Link href="/ops">Back to ops</Link> · <a href="/tour" target="_blank" rel="noreferrer">Open /tour</a></p>
      <h2>Tour posts</h2>
      <p className="muted" style={{ margin: 0 }}>
        Approve puts every stop of a post on /tour. Check the links first: is this the act, are the dates real. If the act is on our roster, add their slug so fans can follow them and promoters get the booking desk.
      </p>

      {missing && (
        <p className="warn" style={{ marginTop: 16 }}>
          Migration 040 (tour_posts, submit_tour, tour_board) is not applied yet. Until it is, the /tour form sends each stop through the old form, so posts show below under Older single-city posts.
        </p>
      )}
      {err && <p style={{ color: "#dc2626" }}>Could not load: {err}</p>}

      {!missing && (
        <>
          <nav className="tabs" aria-label="Status">
            {STATUSES.map((s) => <Link key={s} href={s === "pending" ? "/ops/tour" : `/ops/tour?status=${s}`} className={s === status ? "on" : ""}>{s}</Link>)}
          </nav>
          {posts.length === 0 && !err && <p className="muted">Nothing {status}.</p>}
          {posts.map((p) => (
            <div key={p.id} className="card">
              <div className="row">
                <span className={`tag ${p.kind}`}>{p.kind === "touring" ? "Touring India" : "Away from home"}</span>
                <b style={{ fontSize: 16 }}>{p.act_name}</b>
                <span className="muted">from {[p.home_city, p.home_country].filter(Boolean).join(", ") || "?"} · <a href={`mailto:${p.email}`}>{p.email}</a> · {new Date(p.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
              </div>
              <div className="row muted">
                {p.instagram && <a href={p.instagram.startsWith("http") ? p.instagram : `https://instagram.com/${p.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">Instagram</a>}
                {p.ra && <a href={p.ra} target="_blank" rel="noreferrer">RA</a>}
                {p.spotify && <a href={p.spotify} target="_blank" rel="noreferrer">Spotify</a>}
                {p.artist_slug && <span>roster: <a href={`/artists/${p.artist_slug}`} target="_blank" rel="noreferrer">{p.artist_slug}</a></span>}
              </div>
              <table>
                <thead><tr><th></th><th>City</th><th>Dates</th><th>Venue</th><th>Tickets</th></tr></thead>
                <tbody>
                  {p.stops.map((s) => (
                    <tr key={s.id}>
                      <td><span className={`tag ${s.state}`}>{s.state}</span></td>
                      <td>{s.city}</td>
                      <td>{fmtDate(s.from_date)} to {fmtDate(s.to_date)}</td>
                      <td>{s.venue ?? ""}</td>
                      <td>{s.ticket_url ? <a href={s.ticket_url} target="_blank" rel="noreferrer">link</a> : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {p.note && <p style={{ margin: 0 }}>{p.note}</p>}
              <form action={review} className="row">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="back" value={status} />
                <label className="muted">Roster slug <input name="slug" defaultValue={p.artist_slug ?? ""} placeholder="artist-slug" style={{ width: 160 }} /></label>
                {p.status !== "approved" && <button className="btn" name="to" value="approved">Approve</button>}
                {p.status !== "rejected" && <button className="btn red" name="to" value="rejected">Reject</button>}
                {p.status !== "pending" && <button className="btn alt" name="to" value="pending">Back to pending</button>}
                {p.status === "approved" && <button className="btn alt" name="to" value="approved">Save slug</button>}
              </form>
            </div>
          ))}
        </>
      )}

      <h3>Older single-city posts ({old.length})</h3>
      <p className="muted" style={{ marginTop: 0 }}>From the old form (artist_dates). Approved ones show on /tour as Open.</p>
      {old.length === 0 ? <p className="muted">Nothing waiting.</p> : (
        <table>
          <thead><tr><th>Act</th><th>Note</th><th></th></tr></thead>
          <tbody>
            {old.map((d) => (
              <tr key={d.id}>
                <td><b>{d.artist_name}</b> · {d.city}<div className="muted">{fmtDate(d.from_date)} to {fmtDate(d.to_date)} · <a href={`mailto:${d.email}`}>{d.email}</a></div></td>
                <td className="muted">{d.note}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <form action={reviewOld} style={{ display: "inline" }}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="to" value="approved" /><button className="btn">Approve</button></form>{" "}
                  <form action={reviewOld} style={{ display: "inline" }}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="to" value="rejected" /><button className="btn alt">Reject</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
