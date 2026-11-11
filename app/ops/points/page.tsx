import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { rpc } from "@/lib/ccd-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops: points", robots: { index: false } };

type Overview = {
  members_with_points: number; redemptions_30d: number; points_spent_30d: number; referred_members: number;
  top: { display_name: string | null; email: string; balance: number; tier: string; nights: number }[];
  recent: { id: string; created_at: string; email: string; perk_id: string; event_slug: string; cost: number; status: string }[];
};
const T = () => process.env.OPS_TOKEN;

async function adjust(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const delta = parseInt(String(formData.get("delta") ?? "0"), 10);
  const note = String(formData.get("note") ?? "").trim();
  let q = "";
  try {
    const r = await rpc<{ ok: boolean; error?: string }>("ops_points_adjust", { p_token: T(), p_email: email, p_delta: delta, p_note: note });
    q = r?.ok ? "?m=Saved" : `?m=${encodeURIComponent(r?.error ?? "Could not save")}`;
  } catch (e) { q = `?m=${encodeURIComponent(String(e).slice(0, 120))}`; }
  revalidatePath("/ops/points");
  redirect(`/ops/points${q}`);
}

async function voidIt(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (id) await rpc("ops_points_void", { p_token: T(), p_redemption: id });
  revalidatePath("/ops/points");
  redirect("/ops/points?m=Voided");
}

const css = `
.pt{font:14px/1.45 system-ui,sans-serif;max-width:980px;margin:0 auto;padding:28px 16px 80px;color:#111}
.pt h2{margin:24px 0 6px}.pt .muted{color:#666;font-size:13px}
.pt .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:14px 0}
.pt .stat{border:2px solid #111;box-shadow:3px 3px 0 #111;padding:10px 12px;background:#fff}
.pt .stat b{font-size:24px;display:block}
.pt table{width:100%;border-collapse:collapse;background:#fff;border:2px solid #111}
.pt td,.pt th{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}
.pt form.inline{display:inline}
.pt .btn{padding:4px 10px;border:2px solid #111;font:inherit;font-weight:700;cursor:pointer;background:#b6ef36}
.pt input{border:2px solid #111;padding:5px 8px;font:inherit}
.pt .msg{background:#b6ef36;border:2px solid #111;padding:6px 10px;display:inline-block}
`;

export default async function OpsPoints({ searchParams }: { searchParams: { m?: string } }) {
  let o: Overview | null = null;
  let err = "";
  try { o = await rpc<Overview>("ops_points_overview", { p_token: T() }); } catch (e) { err = String(e); }
  return (
    <main className="pt">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p className="muted" style={{ margin: 0 }}><Link href="/ops">Back to ops</Link></p>
      <h2 style={{ marginTop: 8 }}>Points</h2>
      <p className="muted" style={{ margin: 0 }}>
        Earning is worked out from check-ins, referrals, crews and ratings, so there is nothing to approve. Use a grant for a make-good
        (a scanner that failed, a door mix-up) and always say why. Voiding a redemption gives the points back; it does not undo a free ticket code
        or a list spot already used.
      </p>
      {searchParams?.m && <p className="msg">{searchParams.m}</p>}
      {err && <p style={{ color: "#dc2626" }}>Could not load: {err}</p>}
      {!o && !err && <p>Points are not set up yet. Apply migration 071.</p>}
      {o && (
        <>
          <div className="stats">
            <div className="stat"><b>{o.members_with_points}</b>members with a night</div>
            <div className="stat"><b>{o.referred_members}</b>joined with an invite</div>
            <div className="stat"><b>{o.redemptions_30d}</b>perks used, 30 days</div>
            <div className="stat"><b>{o.points_spent_30d}</b>points spent, 30 days</div>
          </div>

          <h2>Grant or take points</h2>
          <form action={adjust} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input name="email" type="email" placeholder="member email" required />
            <input name="delta" type="number" placeholder="+100 or -50" required style={{ width: 120 }} />
            <input name="note" placeholder="why" required style={{ flex: 1, minWidth: 200 }} />
            <button className="btn" type="submit">Save</button>
          </form>

          <h2>Top balances</h2>
          <table>
            <thead><tr><th>Member</th><th>Status</th><th>Nights (12m)</th><th>Balance</th></tr></thead>
            <tbody>
              {o.top.map((t) => (
                <tr key={t.email}><td>{t.display_name ?? "-"} <span className="muted">{t.email}</span></td><td>{t.tier}</td><td>{t.nights}</td><td><b>{t.balance}</b></td></tr>
              ))}
            </tbody>
          </table>

          <h2>Recent redemptions</h2>
          <table>
            <thead><tr><th>When</th><th>Member</th><th>Perk</th><th>Night</th><th>Cost</th><th></th></tr></thead>
            <tbody>
              {o.recent.map((r) => (
                <tr key={r.id}>
                  <td>{r.created_at.slice(0, 16).replace("T", " ")}</td><td>{r.email}</td><td>{r.perk_id}</td>
                  <td><a href={`/nights/${r.event_slug}`}>{r.event_slug}</a></td><td>{r.cost}</td>
                  <td>{r.status === "done" ? (
                    <form action={voidIt} className="inline"><input type="hidden" name="id" value={r.id} /><button className="btn" style={{ background: "#eee" }}>Void</button></form>
                  ) : <span className="muted">{r.status}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
