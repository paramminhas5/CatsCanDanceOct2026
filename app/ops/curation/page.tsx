import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { rpc } from "@/lib/ccd-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops: curation", robots: { index: false } };

type Row = {
  id: string; slug: string; name: string; status: string; source: string | null;
  based_city: string | null; from_city: string | null; genres: string[] | null; instagram: string | null;
  commercial: string | null; ccd_fit: number | null; verified_at: string | null; verify_note: string | null; has_photo: boolean;
};
type Counts = { total: number; approved: number; pending: number; hidden: number; scored: number; with_photo: number };
type Search = { status?: string; commercial?: string; photo?: string; min_fit?: string; unscored?: string };

const T = () => process.env.OPS_TOKEN;
const safeBack = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/ops/curation") ? s : "/ops/curation";
};
const done = (back: string) => {
  revalidatePath("/ops/curation"); revalidatePath("/ops"); revalidatePath("/artists"); revalidatePath("/prowl");
  redirect(back);
};

async function saveRow(formData: FormData) {
  "use server";
  const fit = String(formData.get("fit") ?? "").trim();
  await rpc("ops_set_curation", {
    p_token: T(), p_id: String(formData.get("id")),
    p_commercial: String(formData.get("commercial") ?? ""),
    p_fit: fit === "" ? null : Math.max(0, Math.min(100, Math.round(Number(fit)))),
    p_note: String(formData.get("note") ?? ""),
  });
  done(safeBack(formData.get("back")));
}
async function setOne(formData: FormData) {
  "use server";
  await rpc("ops_set_artist_status", { p_token: T(), p_id: String(formData.get("id")), p_status: String(formData.get("to")) });
  done(safeBack(formData.get("back")));
}
async function bulk(formData: FormData) {
  "use server";
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const to = String(formData.get("to") ?? "");
  if (ids.length > 0) await rpc("ops_curation_bulk", { p_token: T(), p_ids: ids, p_to: to });
  done(safeBack(formData.get("back")));
}

const css = `
.cur{font:14px/1.45 system-ui,sans-serif;max-width:1280px;margin:0 auto;padding:28px 16px 80px;color:#111}
.cur h2{margin:0 0 4px}.cur .muted{color:#666;font-size:13px}
.cur table{border-collapse:collapse;width:100%}.cur th,.cur td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
.cur th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555;position:sticky;top:0;background:#fff}
.cur input,.cur select,.cur textarea{padding:5px;font:inherit;border:2px solid #111;background:#fff}
.cur .btn{padding:5px 10px;border:2px solid #111;background:#b6ef36;font:inherit;font-weight:600;cursor:pointer}
.cur .btn.alt{background:#fff}.cur .btn.red{background:#dc2626;color:#fff}
.cur .filters{display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin:16px 0}
.cur .filters label{display:grid;gap:2px;font-size:12px;color:#555}
.cur .bulkbar{display:flex;gap:8px;align-items:center;margin:0 0 10px;flex-wrap:wrap}
.cur .stats{display:flex;gap:18px;flex-wrap:wrap;margin:12px 0}.cur .stats b{display:block;font-size:22px}
.cur .tag{display:inline-block;padding:1px 6px;border:1px solid #111;font-size:12px}
.cur .tag.approved{background:#b6ef36}.cur .tag.hidden{background:#eee}.cur .tag.pending{background:#fde68a}
.cur .fit{font-weight:700}.cur .edit{display:grid;gap:4px;min-width:260px}
.cur .edit .r{display:flex;gap:4px}
`;

export default async function Curation({ searchParams }: { searchParams: Search }) {
  const q = searchParams ?? {};
  const status = q.status ?? "";
  const commercial = q.commercial ?? "";
  const photo = q.photo ?? "";
  const minFit = q.min_fit ?? "";
  const unscored = q.unscored === "1";

  let rows: Row[] = [];
  let counts: Counts | null = null;
  let err = "";
  try {
    [rows, counts] = await Promise.all([
      rpc<Row[]>("ops_curation_list", {
        p_token: T(),
        p_status: status || null,
        p_commercial: commercial || null,
        p_has_photo: photo === "yes" ? true : photo === "no" ? false : null,
        p_min_fit: minFit !== "" && !Number.isNaN(Number(minFit)) ? Number(minFit) : null,
        p_unscored: unscored,
        p_limit: 400,
      }).then((r) => r ?? []),
      rpc<Counts>("ops_curation_counts", { p_token: T() }),
    ]);
  } catch (e) {
    err = String(e);
  }

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (commercial) params.set("commercial", commercial);
  if (photo) params.set("photo", photo);
  if (minFit) params.set("min_fit", minFit);
  if (unscored) params.set("unscored", "1");
  const back = "/ops/curation" + (params.toString() ? `?${params.toString()}` : "");

  return (
    <main className="cur">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p className="muted" style={{ margin: 0 }}><Link href="/ops">Back to ops</Link></p>
      <h2>Artist curation</h2>
      <p className="muted" style={{ margin: 0 }}>
        Fit is 0 to 100 against the Ep 03 and Ep 04 taste. Commercial is how mainstream the act is. Publishing puts an artist on the site, so check the note first. Nothing here is changed by a filter.
      </p>

      {err && <p style={{ color: "#dc2626" }}>Could not load: {err}</p>}

      {counts && (
        <div className="stats">
          <div><b>{counts.total}</b>artists</div>
          <div><b>{counts.approved}</b>published</div>
          <div><b>{counts.pending}</b>pending</div>
          <div><b>{counts.hidden}</b>hidden</div>
          <div><b>{counts.scored}</b>scored</div>
          <div><b>{counts.with_photo}</b>with photo</div>
        </div>
      )}

      <form method="get" className="filters">
        <label>Status
          <select name="status" defaultValue={status}>
            <option value="">any</option><option value="approved">published</option><option value="pending">pending</option><option value="hidden">hidden</option>
          </select>
        </label>
        <label>Commercial
          <select name="commercial" defaultValue={commercial}>
            <option value="">any</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="none">not set</option>
          </select>
        </label>
        <label>Photo
          <select name="photo" defaultValue={photo}>
            <option value="">any</option><option value="yes">has photo</option><option value="no">no photo</option>
          </select>
        </label>
        <label>Min fit
          <input name="min_fit" type="number" min={0} max={100} defaultValue={minFit} style={{ width: 80 }} />
        </label>
        <label style={{ display: "flex", gap: 4, alignItems: "center", paddingBottom: 6 }}>
          <input type="checkbox" name="unscored" value="1" defaultChecked={unscored} /> Unscored only
        </label>
        <button className="btn">Filter</button>
        <Link href="/ops/curation" className="btn alt" style={{ textDecoration: "none", color: "#111" }}>Reset</Link>
      </form>

      <p className="muted">{rows.length} shown{rows.length >= 400 ? " (first 400, narrow the filters to see more)" : ""}. Ordered by fit, highest first.</p>

      <form id="bulk" action={bulk} className="bulkbar">
        <input type="hidden" name="back" value={back} />
        <span className="muted">Selected rows:</span>
        <button className="btn" name="to" value="approved">Publish</button>
        <button className="btn alt" name="to" value="hidden">Hide</button>
        <button className="btn alt" name="to" value="pending">Set pending</button>
      </form>

      <table>
        <thead>
          <tr><th></th><th>Artist</th><th>Status</th><th>Fit</th><th>Commercial</th><th>Note and edit</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td><input type="checkbox" name="ids" value={a.id} form="bulk" aria-label={`Select ${a.name}`} /></td>
              <td>
                <b>{a.name}</b>
                <div className="muted">{[a.based_city ?? a.from_city, (a.genres ?? []).slice(0, 3).join(", ")].filter(Boolean).join(" · ")}</div>
                <div className="muted">{a.has_photo ? "photo" : "no photo"}{a.instagram ? ` · @${a.instagram.replace(/^@/, "")}` : ""}</div>
              </td>
              <td><span className={`tag ${a.status}`}>{a.status === "approved" ? "published" : a.status}</span></td>
              <td className="fit">{a.ccd_fit ?? "-"}</td>
              <td>{a.commercial ?? "-"}</td>
              <td>
                <form action={saveRow} className="edit">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="back" value={back} />
                  <div className="r">
                    <input name="fit" type="number" min={0} max={100} placeholder="fit" defaultValue={a.ccd_fit ?? ""} style={{ width: 70 }} />
                    <select name="commercial" defaultValue={a.commercial ?? ""}>
                      <option value="">not set</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
                    </select>
                    <button className="btn alt">Save</button>
                  </div>
                  <textarea name="note" rows={2} placeholder="verify note" defaultValue={a.verify_note ?? ""} />
                </form>
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                {a.status !== "approved" && (
                  <form action={setOne} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={a.id} /><input type="hidden" name="to" value="approved" /><input type="hidden" name="back" value={back} />
                    <button className="btn">Publish</button>
                  </form>
                )}{" "}
                {a.status !== "hidden" && (
                  <form action={setOne} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={a.id} /><input type="hidden" name="to" value="hidden" /><input type="hidden" name="back" value={back} />
                    <button className="btn alt">Hide</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && !err && <p className="muted">No artists match these filters.</p>}
    </main>
  );
}
