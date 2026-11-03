import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { rpc } from "@/lib/ccd-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops: gig links", robots: { index: false } };

type Row = {
  id: string; artist_slug: string; artist_name: string; match_method: string; matched_text: string | null; status: string;
  event_id: string; title: string; event_date: string | null; city: string | null; venue: string | null; url: string | null; event_status: string;
};
type Search = { status?: string; all?: string };

const T = () => process.env.OPS_TOKEN;
const safeBack = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/ops/gig-links") ? s : "/ops/gig-links";
};

async function setLink(formData: FormData) {
  "use server";
  await rpc("ops_set_event_artist", { p_token: T(), p_id: String(formData.get("id")), p_status: String(formData.get("to")) });
  const slug = String(formData.get("slug") ?? "");
  revalidatePath("/ops/gig-links");
  if (slug) revalidatePath(`/artists/${slug}`);
  redirect(safeBack(formData.get("back")));
}
async function rematch() {
  "use server";
  await rpc("ops_rematch_event_artists", { p_token: T() });
  revalidatePath("/ops/gig-links");
  redirect("/ops/gig-links");
}

const css = `
.gl{font:14px/1.45 system-ui,sans-serif;max-width:1180px;margin:0 auto;padding:28px 16px 80px;color:#111}
.gl h2{margin:0 0 4px}.gl .muted{color:#666;font-size:13px}
.gl table{border-collapse:collapse;width:100%}.gl th,.gl td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
.gl th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555}
.gl select{padding:5px;font:inherit;border:2px solid #111;background:#fff}
.gl .btn{padding:5px 10px;border:2px solid #111;background:#b6ef36;font:inherit;font-weight:600;cursor:pointer}
.gl .btn.alt{background:#fff}
.gl .bar{display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin:16px 0}
.gl .tag{display:inline-block;padding:1px 6px;border:1px solid #111;font-size:12px}
.gl .tag.published,.gl .tag.confirmed{background:#b6ef36}.gl .tag.pending,.gl .tag.proposed{background:#fde68a}.gl .tag.rejected,.gl .tag.expired{background:#eee}
`;

export default async function GigLinks({ searchParams }: { searchParams: Search }) {
  const status = searchParams?.status ?? "proposed";
  const all = searchParams?.all === "1";
  let rows: Row[] = [];
  let err = "";
  try {
    rows = (await rpc<Row[]>("ops_event_artists", { p_token: T(), p_status: status === "any" ? null : status, p_future: !all })) ?? [];
  } catch (e) {
    err = String(e);
  }
  const back = `/ops/gig-links?status=${encodeURIComponent(status)}${all ? "&all=1" : ""}`;

  return (
    <main className="gl">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p className="muted" style={{ margin: 0 }}><Link href="/ops">Back to ops</Link></p>
      <h2>Gig links</h2>
      <p className="muted" style={{ margin: 0 }}>
        The gig radar links an event to an artist when a lineup name matches the artist name or a stored alias exactly. No AI.
        An artist page shows a date only when the link is confirmed here and the event is published.
      </p>
      {err && <p style={{ color: "#dc2626" }}>Could not load: {err}</p>}

      <div className="bar">
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "end" }}>
          <label className="muted" style={{ display: "grid", gap: 2 }}>Status
            <select name="status" defaultValue={status}>
              <option value="proposed">to check</option><option value="confirmed">confirmed</option><option value="rejected">rejected</option><option value="any">any</option>
            </select>
          </label>
          <label className="muted" style={{ display: "flex", gap: 4, alignItems: "center", paddingBottom: 6 }}>
            <input type="checkbox" name="all" value="1" defaultChecked={all} /> Include past events
          </label>
          <button className="btn">Show</button>
        </form>
        <form action={rematch}><button className="btn alt">Match again</button></form>
      </div>

      <table>
        <thead><tr><th>Date</th><th>Event</th><th>Artist</th><th>Matched on</th><th>Link</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ whiteSpace: "nowrap" }}>{r.event_date ?? "TBA"}</td>
              <td>
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer"><b>{r.title}</b></a> : <b>{r.title}</b>}
                <div className="muted">{[r.venue, r.city].filter(Boolean).join(", ")}</div>
                <span className={`tag ${r.event_status}`}>event {r.event_status}</span>
              </td>
              <td><a href={`/artists/${r.artist_slug}`} target="_blank" rel="noreferrer">{r.artist_name}</a></td>
              <td><span className="muted">{r.match_method}:</span> {r.matched_text ?? "-"}</td>
              <td><span className={`tag ${r.status}`}>{r.status}</span></td>
              <td style={{ whiteSpace: "nowrap" }}>
                {r.status !== "confirmed" && (
                  <form action={setLink} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="to" value="confirmed" />
                    <input type="hidden" name="slug" value={r.artist_slug} /><input type="hidden" name="back" value={back} />
                    <button className="btn">Confirm</button>
                  </form>
                )}{" "}
                {r.status !== "rejected" && (
                  <form action={setLink} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="to" value="rejected" />
                    <input type="hidden" name="slug" value={r.artist_slug} /><input type="hidden" name="back" value={back} />
                    <button className="btn alt">Not them</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && !err && <p className="muted">Nothing here.</p>}
    </main>
  );
}
