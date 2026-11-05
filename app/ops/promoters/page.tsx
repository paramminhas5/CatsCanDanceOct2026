import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { rpc, fmtDate, select } from "@/lib/ccd-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops: promoters", robots: { index: false } };

type PendingPromoter = { id: string; slug: string; name: string; city: string | null; instagram: string | null; website: string | null; blurb: string | null; created_at: string; owner: string | null };
type PendingNight = { slug: string; title: string; event_date: string | null; venue: string | null; city: string | null; lineup: string[] | null; blurb: string | null; ticket_url: string | null; promoter: string; promoter_slug: string; submitted_at: string | null };

const T = () => process.env.OPS_TOKEN;

async function reviewPromoter(formData: FormData) {
  "use server";
  await rpc("ops_review_promoter", { p_token: T(), p_id: String(formData.get("id")), p_approve: formData.get("to") === "approve", p_note: String(formData.get("note") ?? "").trim() || null });
  revalidatePath("/ops/promoters");
  redirect("/ops/promoters");
}
async function reviewNight(formData: FormData) {
  "use server";
  const slug = String(formData.get("slug"));
  await rpc("ops_review_night", { p_token: T(), p_slug: slug, p_approve: formData.get("to") === "approve", p_note: String(formData.get("note") ?? "").trim() || null });
  revalidatePath("/ops/promoters"); revalidatePath(`/nights/${slug}`); revalidatePath("/whats-on");
  redirect("/ops/promoters");
}

const css = `
.pr{font:14px/1.45 system-ui,sans-serif;max-width:1100px;margin:0 auto;padding:28px 16px 80px;color:#111}
.pr h2{margin:0 0 4px}.pr h3{margin:28px 0 8px}.pr .muted{color:#666;font-size:13px}
.pr .card{border:2px solid #111;padding:14px;margin:0 0 12px;display:grid;gap:8px}
.pr .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.pr input{padding:5px;font:inherit;border:2px solid #111;background:#fff;min-width:260px}
.pr .btn{padding:5px 10px;border:2px solid #111;background:#b6ef36;font:inherit;font-weight:600;cursor:pointer}
.pr .btn.red{background:#dc2626;color:#fff}
.pr table{border-collapse:collapse;width:100%}.pr td,.pr th{border-bottom:1px solid #ddd;padding:5px 8px;text-align:left;vertical-align:top}
`;

export default async function OpsPromoters() {
  let q: { promoters: PendingPromoter[]; nights: PendingNight[] } = { promoters: [], nights: [] };
  let err = "";
  try { q = (await rpc<typeof q>("ops_promoter_queue", { p_token: T() })) ?? q; } catch (e) { err = String(e); }
  const live = await select<any>("events?promoter_id=not.is.null&published=is.true&select=slug,title,event_date,venue,series_label&order=event_date.desc&limit=30", 0).catch(() => []);
  return (
    <main className="pr">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p><Link href="/ops">← Ops</Link></p>
      <h2>Promoters</h2>
      <p className="muted">Anyone can apply at /promote. Approve the promoter first, then each night they send. Nothing they make is public until a night is approved here. Free for now.</p>
      {err && <p style={{ color: "#dc2626" }}>Could not load: {err}</p>}

      <h3>Promoters waiting ({q.promoters.length})</h3>
      {q.promoters.length === 0 && <p className="muted">None waiting.</p>}
      {q.promoters.map((p) => (
        <div key={p.id} className="card">
          <div><b>{p.name}</b> · {p.city} <span className="muted">· applied {fmtDate(p.created_at)} by {p.owner}</span></div>
          <div className="muted">{[p.instagram, p.website].filter(Boolean).join(" · ")}</div>
          {p.blurb && <div>{p.blurb}</div>}
          <form action={reviewPromoter} className="row">
            <input type="hidden" name="id" value={p.id} />
            <input name="note" placeholder="Note to them (shown if not approved)" />
            <button className="btn" name="to" value="approve">Approve</button>
            <button className="btn red" name="to" value="reject">Not approved</button>
          </form>
        </div>
      ))}

      <h3>Nights waiting ({q.nights.length})</h3>
      {q.nights.length === 0 && <p className="muted">None waiting.</p>}
      {q.nights.map((n) => (
        <div key={n.slug} className="card">
          <div><b>{n.title}</b> by <a href={`/promoters/${n.promoter_slug}`}>{n.promoter}</a> <span className="muted">· {n.event_date ? fmtDate(n.event_date) : ""} · {[n.venue, n.city].filter(Boolean).join(", ")}</span></div>
          {(n.lineup ?? []).length > 0 && <div>Lineup: {(n.lineup ?? []).join(", ")}</div>}
          {n.blurb && <div className="muted">{n.blurb}</div>}
          {n.ticket_url && <div className="muted">Ticket link: <a href={n.ticket_url} target="_blank" rel="noreferrer">{n.ticket_url}</a></div>}
          <form action={reviewNight} className="row">
            <input type="hidden" name="slug" value={n.slug} />
            <input name="note" placeholder="Note to them (shown if not approved)" />
            <button className="btn" name="to" value="approve">Approve and publish</button>
            <button className="btn red" name="to" value="reject">Not approved</button>
          </form>
        </div>
      ))}

      <h3>Live promoter nights</h3>
      {live.length === 0 ? <p className="muted">None yet.</p> : (
        <table><tbody>{live.map((e: any) => (
          <tr key={e.slug}><td>{e.event_date ? fmtDate(e.event_date) : ""}</td><td><a href={`/nights/${e.slug}`}>{e.title}</a></td><td>{e.series_label}</td><td className="muted">{e.venue}</td>
            <td><form action={reviewNight}><input type="hidden" name="slug" value={e.slug} /><input type="hidden" name="note" value="Taken down by CCD" /><button className="btn red" name="to" value="reject">Take down</button></form></td></tr>
        ))}</tbody></table>
      )}
    </main>
  );
}
