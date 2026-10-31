import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { rpc, fmtDate } from "@/lib/ccd-db";
import { emailCrews, emailCityWaitlist } from "@/lib/mailer";

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
async function factReview(formData: FormData) {
  "use server";
  await rpc("ops_review_fact", { p_token: T(), p_id: String(formData.get("id")), p_status: String(formData.get("status")) });
  revalidatePath("/ops");
}
async function factsBulk(formData: FormData) {
  "use server";
  await rpc("ops_approve_facts_bulk", { p_token: T(), p_confidence: String(formData.get("confidence") || "high"), p_section: String(formData.get("section") || "") || null });
  revalidatePath("/ops"); revalidatePath("/prowl"); revalidatePath("/litter");
}
async function buildFacts() {
  "use server";
  await rpc("ops_build_internal_facts", { p_token: T() });
  revalidatePath("/ops");
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

async function addTier(formData: FormData) {
  "use server";
  await rpc("ops_upsert_tier", { p_token: T(), p_slug: String(formData.get("slug")), p_name: String(formData.get("name")), p_price: Number(formData.get("price")), p_capacity: Number(formData.get("capacity")) });
  revalidatePath("/ops");
}
async function saveProduct(formData: FormData) {
  "use server";
  await rpc("ops_upsert_product", {
    p_token: T(), p_slug: String(formData.get("slug")).toLowerCase().replace(/[^a-z0-9]+/g, "-"), p_name: String(formData.get("name")),
    p_description: String(formData.get("description") ?? ""), p_price: Number(formData.get("price")), p_image: String(formData.get("image") ?? ""),
    p_sizes: String(formData.get("sizes") ?? "").split(",").map((x) => x.trim()).filter(Boolean), p_stock: Number(formData.get("stock")), p_active: formData.get("active") === "on",
  });
  revalidatePath("/ops"); revalidatePath("/shop");
}
async function shipOrder(formData: FormData) {
  "use server";
  await rpc("ops_shop_ship", { p_token: T(), p_order: String(formData.get("id")), p_tracking: String(formData.get("tracking")) });
  revalidatePath("/ops");
}
async function formCrews(formData: FormData) {
  "use server";
  await rpc("ops_form_crews", { p_token: T(), p_slug: String(formData.get("slug")), p_pre_spot: String(formData.get("pre_spot") ?? "") });
  revalidatePath("/ops");
}
async function inboxStatus(formData: FormData) {
  "use server";
  await rpc("ops_set_inbox_status", {
    p_token: T(), p_kind: String(formData.get("kind")), p_id: String(formData.get("id")), p_status: String(formData.get("status")),
  });
  revalidatePath("/ops"); revalidatePath("/tour");
}
async function savePromo(formData: FormData) {
  "use server";
  const pct = Number(formData.get("percent") || 0), flat = Number(formData.get("flat") || 0), max = Number(formData.get("max") || 0);
  await rpc("ops_upsert_promo", {
    p_token: T(), p_code: String(formData.get("code")), p_slug: String(formData.get("slug") ?? ""),
    p_percent: pct > 0 ? pct : null, p_flat: flat > 0 ? flat : null, p_max: max > 0 ? max : null,
    p_expires: String(formData.get("expires") ?? "") || null, p_active: formData.get("active") === "on",
  });
  revalidatePath("/ops");
}
async function refundOrder(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const r = await rpc<any>("ops_refund_order", { p_token: T(), p_order: id, p_note: String(formData.get("note") ?? "") });
  // If the order was paid online and Razorpay keys exist, refund the money too. Otherwise refund by hand in the Razorpay dashboard.
  const keyId = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (r?.ok && r.razorpay_payment_id && r.amount_inr > 0 && keyId && secret) {
    await fetch(`https://api.razorpay.com/v1/payments/${r.razorpay_payment_id}/refund`, {
      method: "POST",
      headers: { Authorization: "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64"), "Content-Type": "application/json" },
      body: JSON.stringify({ amount: r.amount_inr * 100 }),
    }).catch(() => {});
  }
  revalidatePath("/ops");
}
async function resolveReport(formData: FormData) {
  "use server";
  await rpc("ops_resolve_report", { p_token: T(), p_id: String(formData.get("id")), p_action: String(formData.get("action")) });
  revalidatePath("/ops");
}
async function sendCrewEmails(formData: FormData) {
  "use server";
  await emailCrews(String(formData.get("slug")));
  revalidatePath("/ops");
}
async function notifyCity(formData: FormData) {
  "use server";
  const slug = String(formData.get("slug")), city = String(formData.get("city"));
  const list = await rpc<any[]>("ops_city_waitlist", { p_token: T() });
  const row = (list ?? []).find((x) => String(x.city).toLowerCase() === city.toLowerCase());
  if (row) {
    const e = (await (await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?slug=eq.${encodeURIComponent(slug)}&select=title,date,venue`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" } })).json())?.[0];
    if (e) await emailCityWaitlist(city, row.emails, e.title, e.date, e.venue);
  }
  revalidatePath("/ops");
}
async function saveSetting(formData: FormData) {
  "use server";
  await rpc("ops_set_setting", { p_token: T(), p_key: String(formData.get("key")), p_value: String(formData.get("value")) });
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

  const claims = await rpc<any[]>("ops_claim_checks", { p_token: T() }).catch(() => []);
  const [factSum, facts] = await Promise.all([
    rpc<any>("ops_artist_facts_summary", { p_token: T() }).catch(() => null),
    rpc<any[]>("ops_artist_facts", { p_token: T(), p_status: "proposed", p_limit: 120 }).catch(() => []),
  ]);
  const [tickets, orders, crewsO, todos, hidden, members, swaps, inbox, recent, promos, reports, cityWait] = await Promise.all([
    rpc<any[]>("ops_ticket_summary", { p_token: T() }).catch(() => []),
    rpc<any[]>("ops_shop_orders", { p_token: T() }).catch(() => []),
    rpc<any[]>("ops_crew_overview", { p_token: T() }).catch(() => []),
    rpc<any>("ops_todos", { p_token: T() }).catch(() => null),
    rpc<any[]>("ops_artists", { p_token: T(), p_status: "hidden" }).catch(() => []),
    rpc<any[]>("ops_members", { p_token: T() }).catch(() => []),
    rpc<any[]>("ops_swaps", { p_token: T() }).catch(() => []),
    rpc<any>("ops_inbox", { p_token: T() }).catch(() => null),
    rpc<any[]>("ops_recent_orders", { p_token: T() }).catch(() => []),
    rpc<any[]>("ops_promos", { p_token: T() }).catch(() => []),
    rpc<any[]>("ops_crew_reports", { p_token: T() }).catch(() => []),
    rpc<any[]>("ops_city_waitlist", { p_token: T() }).catch(() => []),
  ]);
  const inboxCount = inbox
    ? (inbox.contact?.length ?? 0) + (inbox.promoters?.length ?? 0) + (inbox.artists?.length ?? 0) + (inbox.dates?.length ?? 0) + (inbox.bookings?.length ?? 0)
    : 0;
  const InboxBtns = ({ kind, id, ok, no }: { kind: string; id: string; ok: [string, string]; no?: [string, string] }) => (
    <td style={{ whiteSpace: "nowrap" }}>
      <form action={inboxStatus} style={{ display: "inline" }}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={ok[0]} /><button className="btn sm">{ok[1]}</button></form>{" "}
      {no && <form action={inboxStatus} style={{ display: "inline" }}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={no[0]} /><button className="btn sm alt">{no[1]}</button></form>}
    </td>
  );
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
          <li>{inboxCount} messages and form submissions in the inbox (below)</li>
        </ul>
      </div>

      <h3 style={{ marginBottom: 10 }}>Inbox ({inboxCount})</h3>
      <p className="muted" style={{ marginTop: 0 }}>Everything sent through the public forms. Approving tour dates puts them on /tour. Contact messages and bookings are replied to by email.</p>
      <div className="scroll" style={{ marginBottom: 36, maxHeight: 520, overflow: "auto" }}>
        {inboxCount === 0 && <p className="muted">Nothing waiting.</p>}
        {(inbox?.contact?.length ?? 0) > 0 && (
          <table>
            <thead><tr><th>Message</th><th>From</th><th></th></tr></thead>
            <tbody>
              {inbox.contact.map((m: any) => (
                <tr key={m.id}>
                  <td style={{ whiteSpace: "pre-wrap", maxWidth: 520 }}>{m.message}</td>
                  <td><b>{m.name}</b><div className="muted"><a href={`mailto:${m.email}`}>{m.email}</a> · {ago(m.created_at)}</div></td>
                  <InboxBtns kind="contact" id={m.id} ok={["handled", "Done"]} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(inbox?.promoters?.length ?? 0) > 0 && (
          <table>
            <thead><tr><th>Promoter application</th><th>About</th><th></th></tr></thead>
            <tbody>
              {inbox.promoters.map((p: any) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b><div className="muted"><a href={`mailto:${p.email}`}>{p.email}</a> · {p.city} · {ago(p.created_at)}</div>
                    <div className="muted">{[p.instagram, p.website, p.sample_event].filter(Boolean).join(" · ")}</div></td>
                  <td style={{ whiteSpace: "pre-wrap", maxWidth: 420 }}>{p.bio}<div className="muted">{(p.genres ?? []).join(", ")}</div></td>
                  <InboxBtns kind="promoter" id={p.id} ok={["approved", "Approve"]} no={["rejected", "Reject"]} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(inbox?.artists?.length ?? 0) > 0 && (
          <table>
            <thead><tr><th>Artist submission</th><th>Links</th><th></th></tr></thead>
            <tbody>
              {inbox.artists.map((a: any) => (
                <tr key={a.id}>
                  <td><b>{a.name}</b> <span className="muted">({a.kind === "claim" ? `claim: ${a.artist_slug}` : "new"})</span>
                    <div className="muted"><a href={`mailto:${a.email}`}>{a.email}</a> · {[a.based_city, (a.genres ?? []).join(", ")].filter(Boolean).join(" · ")} · {ago(a.created_at)}</div>
                    {a.bio && <div className="muted" style={{ maxWidth: 420 }}>{a.bio}</div>}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{[a.instagram, a.soundcloud, a.mix_url].filter(Boolean).map((u: string, i: number) => <div key={i}><a href={u.startsWith("http") ? u : `https://instagram.com/${u.replace(/^@/, "")}`} target="_blank" rel="noreferrer">{u}</a></div>)}</td>
                  <InboxBtns kind="artist" id={a.id} ok={["approved", "Mark done"]} no={["rejected", "Reject"]} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(inbox?.dates?.length ?? 0) > 0 && (
          <table>
            <thead><tr><th>Tour dates</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {inbox.dates.map((d: any) => (
                <tr key={d.id}>
                  <td><b>{d.artist_name}</b> · {d.city}<div className="muted">{fmtDate(d.from_date)} to {fmtDate(d.to_date)} · <a href={`mailto:${d.email}`}>{d.email}</a> · {ago(d.created_at)}</div></td>
                  <td className="muted">{d.note}</td>
                  <InboxBtns kind="dates" id={d.id} ok={["approved", "Publish"]} no={["rejected", "Reject"]} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(inbox?.bookings?.length ?? 0) > 0 && (
          <table>
            <thead><tr><th>Booking request</th><th>Details</th><th></th></tr></thead>
            <tbody>
              {inbox.bookings.map((b: any) => (
                <tr key={b.id}>
                  <td><b>{b.name}</b> for {b.artist_slug}<div className="muted"><a href={`mailto:${b.email}`}>{b.email}</a> · {[b.org, b.city].filter(Boolean).join(" · ")} · {ago(b.created_at)}</div></td>
                  <td style={{ whiteSpace: "pre-wrap", maxWidth: 420 }}>{[b.event_date && fmtDate(b.event_date), b.budget_inr].filter(Boolean).join(" · ")}<div className="muted">{b.message}</div></td>
                  <InboxBtns kind="booking" id={b.id} ok={["sent", "Passed on"]} no={["closed", "Close"]} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3 style={{ marginBottom: 10 }}>Artist profile facts ({factSum?.proposed ?? 0} waiting)</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        We pre-fill each artist page (upcoming dates, who they played with, what they play, who fans also listen to, fans). Nothing shows publicly until the artist or you approve it.
        {factSum && <> {factSum.artists_with_facts} of {factSum.artists} artists have facts, {factSum.artists_with_approved} have approved ones. Approved {factSum.approved}, rejected {factSum.rejected}.</>}
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <form action={factsBulk}><input type="hidden" name="confidence" value="high" /><button className="btn sm">Approve all high confidence</button></form>
        <form action={factsBulk}><input type="hidden" name="confidence" value="medium" /><button className="btn sm alt">Approve high and medium</button></form>
        <form action={buildFacts}><button className="btn sm alt">Rebuild from our own data</button></form>
      </div>
      <div className="scroll" style={{ marginBottom: 36, maxHeight: 420, overflow: "auto" }}>
        <table>
          <thead><tr><th>Artist</th><th>Section</th><th>Fact</th><th>Source</th><th></th></tr></thead>
          <tbody>
            {(facts ?? []).map((f: any) => (
              <tr key={f.id}>
                <td><b>{f.artist}</b></td>
                <td>{f.section}</td>
                <td>{f.url ? <a href={f.url} target="_blank" rel="noreferrer">{f.label}</a> : f.label}<div className="muted">{[f.date && fmtDate(f.date), f.detail].filter(Boolean).join(" · ")}</div></td>
                <td className="muted">{f.source} · {f.confidence}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <form action={factReview} style={{ display: "inline" }}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="approved" /><button className="btn sm">Approve</button></form>{" "}
                  <form action={factReview} style={{ display: "inline" }}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="rejected" /><button className="btn sm alt">Reject</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginBottom: 10 }}>Artist claims to check ({claims?.length ?? 0})</h3>
      <p className="muted" style={{ marginTop: 0 }}>A claim on a live page gives the claimant edit rights only after you approve. Ask them to put the code in their Instagram bio or send it from the artist account, then approve. Green ticks are weak signals, not proof.</p>
      {(claims?.length ?? 0) > 0 && (
        <table style={{ marginBottom: 24 }}>
          <thead><tr><th>Page</th><th>Claimant</th><th>Code</th><th>Signals</th><th></th></tr></thead>
          <tbody>
            {claims!.map((c: any) => (
              <tr key={c.id}>
                <td>{c.slug ?? "(new page)"}<br /><span className="muted">{c.name}</span></td>
                <td>{c.email}<br /><span className="muted">IG {c.claimant_instagram ?? "none"} vs page {c.page_instagram ?? "none"}</span></td>
                <td><code>{c.code}</code></td>
                <td>{c.instagram_matches ? "IG match. " : ""}{c.email_matches_booking ? "Booking email match. " : ""}{c.email_domain_matches_site ? "Email domain matches website. " : ""}{!c.instagram_matches && !c.email_matches_booking && !c.email_domain_matches_site ? "No automatic match" : ""}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <form action={inboxStatus} style={{ display: "inline" }}><input type="hidden" name="kind" value="artist" /><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="approved" /><button className="btn sm">Approve</button></form>{" "}
                  <form action={inboxStatus} style={{ display: "inline" }}><input type="hidden" name="kind" value="artist" /><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="rejected" /><button className="btn sm alt">Reject</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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

      <h3 style={{ marginBottom: 10 }}>Tickets</h3>
      <p className="muted" style={{ marginTop: 0 }}>Add ticket types to a CCD event (use its slug, e.g. episode-5). Set price 0 for a free list. The event must be published with a future date. Payment needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel.</p>
      <form action={addTier} style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input name="slug" placeholder="event slug" required style={{ padding: 6 }} /><input name="name" placeholder="ticket name" required style={{ padding: 6 }} />
        <input name="price" type="number" min="0" placeholder="price INR" required style={{ padding: 6, width: 100 }} /><input name="capacity" type="number" min="1" placeholder="capacity" required style={{ padding: 6, width: 100 }} />
        <button className="btn sm">Add ticket type</button>
      </form>
      <div className="scroll" style={{ marginBottom: 20 }}><table><thead><tr><th>Event</th><th>Orders</th><th>Tickets</th><th>Checked in</th><th>Revenue</th></tr></thead><tbody>
        {(tickets ?? []).map((t: any) => <tr key={t.event_slug}><td>{t.event_slug}</td><td>{t.orders}</td><td>{t.tickets}</td><td>{t.checked_in}</td><td>₹{t.revenue_inr}</td></tr>)}
      </tbody></table></div>

      <h3 style={{ marginBottom: 10 }}>Orders, refunds and promo codes</h3>
      <p className="muted" style={{ marginTop: 0 }}>Refund cancels the order and voids its tickets, so they stop working at the door. If it was paid online and Razorpay keys are set, the money is refunded too; otherwise refund it in the Razorpay dashboard.</p>
      <div className="scroll" style={{ marginBottom: 16 }}><table><thead><tr><th>Order</th><th>Buyer</th><th>Status</th><th></th></tr></thead><tbody>
        {(recent ?? []).map((o: any) => (
          <tr key={o.id}><td>{o.event_slug}<div className="muted">₹{o.amount_inr}{o.promo_code ? ` (${o.promo_code} -₹${o.discount_inr})` : ""}</div></td><td>{o.buyer_name}<div className="muted">{o.buyer_email}</div></td>
            <td>{o.status}{o.emailed_at ? " · emailed" : ""}</td>
            <td>{["paid", "free"].includes(o.status) && <form action={refundOrder}><input type="hidden" name="id" value={o.id} /><input name="note" placeholder="note" style={{ padding: 4, width: 110 }} /> <button className="btn sm alt">Refund</button></form>}</td></tr>
        ))}
      </tbody></table></div>
      <form action={savePromo} style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input name="code" placeholder="CODE" required style={{ padding: 6, width: 110 }} /><input name="slug" placeholder="event slug (blank = any)" style={{ padding: 6 }} />
        <input name="percent" type="number" min="0" max="100" placeholder="% off" style={{ padding: 6, width: 80 }} /><input name="flat" type="number" min="0" placeholder="or INR off" style={{ padding: 6, width: 90 }} />
        <input name="max" type="number" min="0" placeholder="max uses" style={{ padding: 6, width: 90 }} /><input name="expires" type="date" style={{ padding: 6 }} />
        <label><input type="checkbox" name="active" defaultChecked /> Live</label><button className="btn sm">Save code</button>
      </form>
      <div className="scroll" style={{ marginBottom: 36 }}><table><thead><tr><th>Code</th><th>Event</th><th>Off</th><th>Used</th><th>Live</th></tr></thead><tbody>
        {(promos ?? []).map((c: any) => <tr key={c.code}><td><b>{c.code}</b></td><td>{c.event_slug ?? "any"}</td><td>{c.percent ? `${c.percent}%` : ""} {c.flat_inr ? `₹${c.flat_inr}` : ""}</td><td>{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ""}</td><td>{c.active ? "yes" : "no"}</td></tr>)}
      </tbody></table></div>

      <h3 style={{ marginBottom: 10 }}>Crews (solo goers)</h3>
      <form action={formCrews} style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input name="slug" placeholder="event slug" required style={{ padding: 6 }} /><input name="pre_spot" placeholder="pre-spot, e.g. Toit, 30 min before" style={{ padding: 6, minWidth: 260 }} />
        <button className="btn sm">Form crews</button>
        <span className="muted">{(crewsO ?? []).map((c: any) => `${c.event_slug}: ${c.pool} signed up, ${c.unplaced} not placed`).join(" · ")}</span>
      </form>
      <form action={sendCrewEmails} style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input name="slug" placeholder="event slug" required style={{ padding: 6 }} /><button className="btn sm alt">Email crews</button>
        <span className="muted">Sends each member their crew and crew mates. Needs RESEND_API_KEY in Vercel. Only crews not emailed yet.</span>
      </form>
      <h4 style={{ margin: "12px 0 6px" }}>Reports about crew mates ({(reports ?? []).length} open)</h4>
      <div className="scroll" style={{ marginBottom: 16 }}><table><thead><tr><th>Night</th><th>About</th><th>Reason</th><th></th></tr></thead><tbody>
        {(reports ?? []).map((r: any) => (
          <tr key={r.id}><td>{r.event_slug}<div className="muted">by {r.reporter_name}</div></td><td><b>{r.reported_name}</b><div className="muted">{r.reported_email} · reported {r.times_reported}x</div></td><td>{r.reason}</td>
            <td style={{ whiteSpace: "nowrap" }}>
              <form action={resolveReport} style={{ display: "inline" }}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="ban" /><button className="btn sm">Ban from crews</button></form>{" "}
              <form action={resolveReport} style={{ display: "inline" }}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="dismiss" /><button className="btn sm alt">Dismiss</button></form>
            </td></tr>
        ))}
      </tbody></table></div>
      <h4 style={{ margin: "12px 0 6px" }}>City waitlists</h4>
      <p className="muted" style={{ marginTop: 0 }}>People who asked to hear when a night is on in their city. Add the night as an event, then send.</p>
      {(cityWait ?? []).map((c: any) => (
        <form key={c.city} action={notifyCity} style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <b>{c.city}</b> <span className="muted">{c.waiting} waiting</span>
          <input type="hidden" name="city" value={c.city} /><input name="slug" placeholder="event slug to announce" required style={{ padding: 6 }} /><button className="btn sm">Email them</button>
        </form>
      ))}
      {(cityWait ?? []).length === 0 && <p className="muted">Nobody waiting.</p>}
      <div style={{ marginBottom: 36 }} />

      <h3 style={{ marginBottom: 10 }}>Shop</h3>
      <p className="muted" style={{ marginTop: 0 }}>Add or edit a product (same slug updates it). Image is a full URL. Tick Live to show it on /shop.</p>
      <form action={saveProduct} style={{ display: "grid", gap: 8, maxWidth: 560, marginBottom: 16 }}>
        <input name="name" placeholder="Name" required style={{ padding: 6 }} /><input name="slug" placeholder="slug, e.g. logo-tee" required style={{ padding: 6 }} />
        <input name="price" type="number" min="0" placeholder="Price INR" required style={{ padding: 6 }} /><input name="stock" type="number" min="0" placeholder="Stock" required style={{ padding: 6 }} />
        <input name="sizes" placeholder="Sizes, comma separated (blank for none)" style={{ padding: 6 }} /><input name="image" placeholder="Image URL" style={{ padding: 6 }} />
        <textarea name="description" placeholder="Description" style={{ padding: 6 }} /><label><input type="checkbox" name="active" /> Live</label>
        <button className="btn sm">Save product</button>
      </form>
      <div className="scroll" style={{ marginBottom: 36 }}><table><thead><tr><th>Order</th><th>Buyer</th><th>Items</th><th>Ship to</th><th></th></tr></thead><tbody>
        {(orders ?? []).map((o: any) => (
          <tr key={o.id}><td>₹{o.amount_inr}<div className="muted">{o.status}</div></td><td>{o.buyer_name}<div className="muted">{o.buyer_email} {o.buyer_phone}</div></td>
            <td>{(o.items ?? []).map((i: any) => `${i.name} ${i.size ?? ""} x${i.qty}`).join(", ")}</td>
            <td className="muted">{[o.address?.line1, o.address?.line2, o.address?.city, o.address?.state, o.address?.pin].filter(Boolean).join(", ")}</td>
            <td>{o.status === "paid" ? <form action={shipOrder}><input type="hidden" name="id" value={o.id} /><input name="tracking" placeholder="tracking" required style={{ padding: 4, width: 110 }} /> <button className="btn sm">Shipped</button></form> : o.tracking}</td></tr>
        ))}
      </tbody></table></div>

      <h3 style={{ marginBottom: 10 }}>WhatsApp</h3>
      <form action={saveSetting} style={{ display: "flex", gap: 8, marginBottom: 36, flexWrap: "wrap" }}>
        <select name="key" style={{ padding: 6 }}><option value="whatsapp_community_url">Community invite link</option><option value="whatsapp_number">Number for click to chat (digits, with country code)</option></select>
        <input name="value" placeholder="value" required style={{ padding: 6, minWidth: 280 }} /><button className="btn sm">Save</button>
      </form>

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
