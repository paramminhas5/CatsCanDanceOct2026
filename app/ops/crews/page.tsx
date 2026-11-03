import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { rpc } from "@/lib/ccd-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops: crews and entry", robots: { index: false } };

type NightRow = {
  night_key: string; title: string; city: string | null; venue: string | null; event_date: string | null;
  crews: number; members: number; verified: number; pool_waiting: number; partner: string | null; partner_email: string | null; entry_sent_at: string | null;
};
type Partner = { id: string; name: string; city: string | null; venue_match: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null; entry_notes: string | null; active: boolean };
type Entry = { night: { title: string; venue: string | null; city: string | null; event_date: string | null; kind: string } | null; partner: Partner | null; crews: { name: string; meet_time: string | null; people: { name: string | null; captain: boolean; ticket: string; ref: string | null }[] | null }[] };

const T = () => process.env.OPS_TOKEN;
const back = (key?: string) => (key ? `/ops/crews?n=${encodeURIComponent(key)}` : "/ops/crews");

async function formCrews(fd: FormData) {
  "use server";
  const key = String(fd.get("key"));
  await rpc("ops_form_crews", { p_token: T(), p_slug: key, p_pre_spot: String(fd.get("pre_spot") ?? "") || null });
  revalidatePath("/ops/crews"); redirect(back(key));
}
async function markSent(fd: FormData) {
  "use server";
  const key = String(fd.get("key"));
  await rpc("ops_mark_entry_sent", { p_token: T(), p_key: key });
  revalidatePath("/ops/crews"); redirect(back(key));
}
async function saveTimes(fd: FormData) {
  "use server";
  const key = String(fd.get("key"));
  const date = String(fd.get("date") ?? "");
  // One line per set: "22:30 Artist name". Times after midnight roll into the next day.
  const rows = String(fd.get("lines") ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(\d{1,2})[:.](\d{2})\s+(.+)$/);
    if (!m || !date) return null;
    const h = Number(m[1]);
    const d = new Date(`${date}T${String(h).padStart(2, "0")}:${m[2]}:00+05:30`);
    if (h < 8) d.setDate(d.getDate() + 1);
    return { artist: m[3], starts_at: d.toISOString() };
  }).filter(Boolean);
  await rpc("ops_set_times", { p_token: T(), p_key: key, p_rows: rows });
  revalidatePath("/ops/crews"); redirect(back(key));
}
async function savePartner(fd: FormData) {
  "use server";
  const g = (k: string) => String(fd.get(k) ?? "").trim();
  await rpc("ops_upsert_venue_partner", {
    p_token: T(), p_id: g("id") || null, p_name: g("name"), p_city: g("city") || null, p_match: g("match") || g("name"),
    p_contact_name: g("contact_name") || null, p_contact_email: g("contact_email") || null, p_contact_phone: g("contact_phone") || null,
    p_entry_notes: g("notes") || null, p_active: fd.get("active") === "on",
  });
  revalidatePath("/ops/crews"); redirect("/ops/crews#partners");
}

function entryText(e: Entry): string {
  const n = e.night;
  const lines = [`Cats Can Dance crew entry list`, `${n?.title ?? ""}`, `${[n?.venue, n?.city].filter(Boolean).join(", ")} · ${n?.event_date ?? ""}`, ""];
  for (const c of e.crews) {
    lines.push(`${c.name}${c.meet_time ? ` (arriving after ${c.meet_time})` : ""}`);
    for (const p of c.people ?? []) lines.push(`  ${p.name ?? "Member"}${p.captain ? " (captain)" : ""} · ${p.ticket}${p.ref ? ` · ${p.ref}` : ""}`);
    lines.push("");
  }
  lines.push("Each crew arrives together. The captain can speak for the crew at the door. Questions: reply to this email.");
  return lines.join("\n");
}

const css = `
.crw{font:14px/1.45 system-ui,sans-serif;max-width:1180px;margin:0 auto;padding:28px 16px 80px;color:#111}
.crw h2{margin:28px 0 6px}.crw .muted{color:#666;font-size:13px}
.crw table{border-collapse:collapse;width:100%}.crw th,.crw td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
.crw th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555}
.crw input,.crw textarea{padding:5px;font:inherit;border:2px solid #111;background:#fff}
.crw .btn{padding:5px 10px;border:2px solid #111;background:#b6ef36;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;color:#111;display:inline-block}
.crw .btn.alt{background:#fff}.crw .card{border:3px solid #111;padding:14px;margin:12px 0;background:#fafaf7}
.crw .warn{background:#fff3cd;border:2px solid #111;padding:10px;margin:12px 0}
.crw .grid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
`;

export default async function CrewsOps({ searchParams }: { searchParams: { n?: string } }) {
  const key = searchParams.n ?? "";
  let missing = false;
  const [nights, partners, entry, times] = await Promise.all([
    rpc<NightRow[]>("ops_crew_nights", { p_token: T() }).catch(() => { missing = true; return [] as NightRow[]; }),
    rpc<Partner[]>("ops_venue_partners", { p_token: T() }).catch(() => [] as Partner[]),
    key ? rpc<Entry>("ops_crew_entry_list", { p_token: T(), p_key: key }).catch(() => null) : Promise.resolve(null),
    key ? rpc<{ artist_name: string; starts_at: string }[]>("night_set_times", { p_key: key }).catch(() => []) : Promise.resolve([]),
  ]);
  const sel = (nights ?? []).find((x) => x.night_key === key);
  const text = entry ? entryText(entry) : "";
  const mail = entry?.partner?.contact_email
    ? `mailto:${entry.partner.contact_email}?subject=${encodeURIComponent(`Crew entry list: ${entry.night?.title ?? ""}`)}&body=${encodeURIComponent(text)}`
    : null;
  const timeLines = (times ?? []).map((t) => `${new Date(t.starts_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} ${t.artist_name}`).join("\n");

  return (
    <div className="crw">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p><Link href="/ops">← Ops</Link></p>
      <h1 style={{ margin: "8px 0 4px" }}>Crews and entry</h1>
      <p className="muted">Crews for any night: our nights and nights on What&apos;s on. Form crews 2 to 3 days before, check tickets in the club staff panel, then send the entry list to the venue.</p>
      {missing && <p className="warn">Migration 039 is not applied yet, so this page is empty. Apply supabase/migrations/039_going_and_crews.sql in the Supabase SQL editor.</p>}

      <h2>Nights with crew sign-ups</h2>
      <table>
        <thead><tr><th>Night</th><th>Date</th><th>Waiting</th><th>Crews</th><th>Placed</th><th>Tickets checked</th><th>Venue partner</th><th>Entry list</th><th></th></tr></thead>
        <tbody>
          {(nights ?? []).map((r) => (
            <tr key={r.night_key} style={r.night_key === key ? { background: "#eef6d8" } : undefined}>
              <td><b>{r.title}</b><div className="muted">{[r.venue, r.city].filter(Boolean).join(", ")} · {r.night_key.startsWith("scene:") ? "What's on" : "Our night"}</div></td>
              <td>{r.event_date ?? "TBA"}</td>
              <td>{r.pool_waiting}</td><td>{r.crews}</td><td>{r.members}</td><td>{r.verified}</td>
              <td>{r.partner ?? <span className="muted">none</span>}</td>
              <td>{r.entry_sent_at ? `sent ${r.entry_sent_at.slice(0, 10)}` : <span className="muted">not sent</span>}</td>
              <td><Link className="btn alt" href={back(r.night_key)}>Open</Link></td>
            </tr>
          ))}
          {(nights ?? []).length === 0 && !missing && <tr><td colSpan={9} className="muted">Nobody has joined a crew list yet.</td></tr>}
        </tbody>
      </table>

      {key && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{sel?.title ?? entry?.night?.title ?? key}</h2>
          <form action={formCrews} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input type="hidden" name="key" value={key} />
            <input name="pre_spot" placeholder="Default meet point (optional)" style={{ minWidth: 260 }} />
            <button className="btn">Form crews from the waiting list</button>
            <span className="muted">Groups of 3 to 6 from the same city. Mutual go-again pairs stay together. Captains can change the meet point.</span>
          </form>

          <h3>Entry list</h3>
          {entry && entry.crews.length > 0 ? (<>
            <textarea readOnly value={text} rows={Math.min(24, text.split("\n").length + 1)} style={{ width: "100%", fontFamily: "ui-monospace,monospace", fontSize: 13 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
              {mail ? <a className="btn" href={mail}>Email to {entry.partner?.contact_name ?? entry.partner?.name}</a> : <span className="muted">No partner venue matched. Copy the list above or add the venue below.</span>}
              <form action={markSent}><input type="hidden" name="key" value={key} /><button className="btn alt">Mark as sent</button></form>
            </div>
            <p className="muted">Names only, no phone numbers. Ticket status comes from the club staff panel (Ticket checks).</p>
          </>) : <p className="muted">No crews formed yet for this night.</p>}

          <h3>Set times (shown to members on the night)</h3>
          <form action={saveTimes} style={{ display: "grid", gap: 6, maxWidth: 520 }}>
            <input type="hidden" name="key" value={key} />
            <label>Night date <input name="date" type="date" defaultValue={sel?.event_date ?? entry?.night?.event_date ?? ""} required /></label>
            <textarea name="lines" rows={6} defaultValue={timeLines} placeholder={"22:00 Opening set\n23:30 Headliner\n01:30 Closing set"} />
            <button className="btn" style={{ justifySelf: "start" }}>Save set times</button>
          </form>
        </div>
      )}

      <h2 id="partners">Venue partners</h2>
      <p className="muted">Venues that agreed to crew entry. A night matches a partner when its venue text contains the match text.</p>
      <table>
        <thead><tr><th>Venue</th><th>Match text</th><th>Contact</th><th>Entry notes</th><th>Active</th></tr></thead>
        <tbody>
          {(partners ?? []).map((p) => (
            <tr key={p.id}><td><b>{p.name}</b><div className="muted">{p.city}</div></td><td>{p.venue_match}</td>
              <td>{[p.contact_name, p.contact_email, p.contact_phone].filter(Boolean).join(" · ")}</td><td>{p.entry_notes}</td><td>{p.active ? "yes" : "no"}</td></tr>
          ))}
          {(partners ?? []).length === 0 && <tr><td colSpan={5} className="muted">No partners yet.</td></tr>}
        </tbody>
      </table>
      <form action={savePartner} className="card">
        <b>Add or update a partner</b>
        <div className="grid" style={{ marginTop: 8 }}>
          <select name="id" defaultValue="" style={{ padding: 5, border: "2px solid #111" }}>
            <option value="">New partner</option>
            {(partners ?? []).map((p) => <option key={p.id} value={p.id}>Update: {p.name}</option>)}
          </select>
          <input name="name" placeholder="Venue name" required />
          <input name="city" placeholder="City" />
          <input name="match" placeholder="Match text, e.g. humming tree" />
          <input name="contact_name" placeholder="Contact name" />
          <input name="contact_email" placeholder="Contact email" type="email" />
          <input name="contact_phone" placeholder="Contact phone" />
          <input name="notes" placeholder="Entry notes (side door, before 11)" />
          <label><input type="checkbox" name="active" defaultChecked /> Active</label>
        </div>
        <button className="btn" style={{ marginTop: 8 }}>Save partner</button>
      </form>
    </div>
  );
}
