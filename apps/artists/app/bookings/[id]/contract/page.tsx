/**
 * The contract as a clean page to print or save as a PDF (plan section 8; migration 067).
 * Only the two sides of the booking can open it (contract_get checks the session or the thread key).
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseForRequest } from "@/lib/auth";
import { isUuid } from "@/lib/db";
import { clauses, KINDS, type Contract } from "@/lib/contract";
import PrintButton from "./PrintButton";

export const metadata: Metadata = { title: "Contract", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const inr = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function ContractPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string }> }) {
  const { id } = await params;
  const { k } = await searchParams;
  if (!isUuid(id)) notFound();
  const sb = await supabaseForRequest();
  const { data } = await sb.rpc("contract_get", { p_id: id, p_key: k && isUuid(k) ? k : null });
  const c = (data as { ok?: boolean; contract?: Contract | null } | null)?.contract;
  if (!c) return <main className="ctp"><p>This contract is not yours, or it has not been written yet. Sign in with the email you used, or open it from the booking thread.</p></main>;
  const b = c.body;
  return (
    <main className="ctp">
      <style>{`
        .ctp{max-width:760px;margin:0 auto;padding:48px 28px 80px;background:#fff;color:#111;font:15px/1.6 Georgia,'Times New Roman',serif}
        .ctp h1{font:800 34px/1.1 system-ui,sans-serif;margin:8px 0 0}.ctp .eye{font:600 12px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#555}
        .ctp table{width:100%;border-collapse:collapse;margin:24px 0}.ctp td{padding:8px 0;border-bottom:1px solid #ddd;vertical-align:top}.ctp td:first-child{width:40%;color:#555}
        .ctp ol{padding-left:22px}.ctp li{margin:0 0 16px}.ctp li b{font-family:system-ui,sans-serif}.ctp li p{margin:4px 0 0}
        .ctp .sigs{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:36px}.ctp .sig{border-top:1px solid #111;padding-top:8px}.ctp .sig i{font:28px "Brush Script MT","Segoe Script",cursive;display:block;min-height:40px}
        .ctp .small{font:12px system-ui,sans-serif;color:#666}.ctp .noprint{margin-bottom:24px}
        body{background:#fff!important} .ccd-banner,.k-banner,header,footer{display:none!important}
        @media print{.ctp .noprint{display:none}.ctp{padding:0}}
      `}</style>
      <div className="noprint"><PrintButton /></div>
      <div className="eye">Cats Can Dance · booking contract · version {c.version}</div>
      <h1>{b.artist.name} at {[b.venue, b.city].filter(Boolean).join(", ") || "the agreed venue"}</h1>
      <p className="small">{KINDS.find((x) => x.key === c.kind)?.label} · {c.status === "signed" ? "Signed by both sides" : "Draft, not signed by both sides yet"}</p>
      <table><tbody>
        {[["Date", b.date ?? ""], ["Fee", inr(b.fee_inr)], ["Deposit", b.deposit_inr ? `${inr(b.deposit_inr)} (${b.deposit_pct}%)` : "None"], ["Balance", inr(b.balance_inr)], ["Cats Can Dance fee (from the artist's side)", inr(b.ccd_fee_inr)], ["The artist receives", inr(b.artist_gets_inr)]].map(([x, y]) => <tr key={x}><td>{x}</td><td>{y}</td></tr>)}
      </tbody></table>
      <ol>{clauses(b, c.kind).map((s) => <li key={s.h}><b>{s.h}</b>{s.p.map((p) => <p key={p}>{p}</p>)}</li>)}</ol>
      <div className="sigs">
        {([["The artist", b.artist.name, c.artist_signed], ["The organiser", b.organiser.org || b.organiser.name, c.requester_signed]] as const).map(([role, who, s]) => (
          <div key={role} className="sig"><i>{s?.name ?? ""}</i><b>{who}</b><div className="small">{role}{s ? `, signed ${when(s.at)} with a code sent to their email` : ", not signed yet"}</div></div>
        ))}
      </div>
      {c.body_hash && <p className="small" style={{ marginTop: 28 }}>Record: {c.body_hash}. Cats Can Dance keeps this version, the time and the address each side signed from.</p>}
      <p className="small">A first draft in plain English. A lawyer reviews this template before money moves through it.</p>
    </main>
  );
}
