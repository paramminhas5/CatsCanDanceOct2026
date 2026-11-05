/**
 * Import an outside guest list into the door (migration 060). Download the attendee or booking export from District,
 * BookMyShow, Skillbox, Insider or anywhere else, drop the CSV here (or paste the rows), check which column is which, import.
 * Their codes then scan at the door like ours; names show in Guests. Same code again updates the row, so re-importing a newer export is safe.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchGuests, importGuests, sourceLabel, SOURCES, voidImport, type GateLimits } from "@/lib/door";

type Cols = { code: number; name: number; email: number; party: number };

/** A small CSV reader: commas, semicolons or tabs (pasted from a sheet), quoted cells, new lines inside quotes. */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const first = t.split(/\r?\n/, 1)[0] ?? "";
  const delim = [",", ";", "\t"].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some((c) => c)) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c)) rows.push(row);
  return rows;
}

const GUESS: [keyof Cols, RegExp][] = [
  ["code", /(booking|order|ticket|reference|ref|qr|barcode|confirmation|transaction)[\s_.-]*(id|no|number|code|ref)?|^code$|^id$/i],
  ["email", /e-?mail/i],
  ["party", /qty|quantity|no\.? ?of ?(tickets|people|seats|guests)|tickets? ?count|^tickets$|seats|pax|people|admits?/i],
  ["name", /name|attendee|customer|buyer|guest|holder/i],
];
export function guessCols(header: string[]): Cols {
  const c: Cols = { code: -1, name: -1, email: -1, party: -1 };
  for (const [k, re] of GUESS) {
    const i = header.findIndex((h, j) => re.test(h) && !Object.values(c).includes(j));
    if (i >= 0) c[k] = i;
  }
  return c;
}

const inp = "w-full bg-cream text-ink border-4 border-cream p-3";
const btn = "font-display px-4 py-3 bg-acid-yellow text-ink border-4 border-ink disabled:opacity-40";

export default function ImportGuests({ slug, flash }: { slug: string; flash: (m: string) => void }) {
  const [source, setSource] = useState("district");
  const [text, setText] = useState("");
  const [cols, setCols] = useState<Cols>({ code: -1, name: -1, email: -1, party: -1 });
  const [busy, setBusy] = useState(false);
  const [limits, setLimits] = useState<GateLimits | null>(null);
  const [imports, setImports] = useState<{ batch: string; source: string; rows: number; at: string }[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const r = await fetchGuests(slug);
    if (r.ok) { const d = r.data as any; setLimits(d.limits); setImports(d.imports ?? []); setTotal((d.guests ?? []).length); }
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => (text.trim() ? parseCsv(text) : []), [text]);
  const header = rows[0] ?? [];
  const hasHeader = header.some((h) => /[a-z]{3,}/i.test(h) && !/^[A-Z0-9-]{6,}$/.test(h));
  const body = hasHeader ? rows.slice(1) : rows;
  useEffect(() => { if (rows.length) setCols(hasHeader ? guessCols(header) : { code: 0, name: header.length > 1 ? 1 : -1, email: -1, party: -1 }); }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const mapped = body.map((r) => ({
    code: cols.code >= 0 ? r[cols.code] : undefined,
    name: cols.name >= 0 ? r[cols.name] : undefined,
    email: cols.email >= 0 ? r[cols.email] : undefined,
    party: cols.party >= 0 ? Math.max(1, Math.min(20, parseInt(r[cols.party] || "1", 10) || 1)) : 1,
  })).filter((r) => r.code || r.name);

  const readFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { flash("That file is over 3 MB. Export only this night's bookings."); return; }
    if (/\.xlsx?$/i.test(f.name)) { flash("Save it as CSV first (File, Save as, CSV), or copy the rows and paste them below."); return; }
    f.text().then(setText);
  };

  const run = async () => {
    if (!mapped.length) return;
    setBusy(true);
    let added = 0, updated = 0, skipped = 0, failed = "";
    for (let i = 0; i < mapped.length; i += 500) {
      const r = await importGuests(slug, source, mapped.slice(i, i + 500));
      if (!r.ok) { failed = r.error ?? "Import failed."; break; }
      const d = r.data as any; added += d.added; updated += d.updated; skipped += d.skipped;
    }
    setBusy(false);
    if (failed) { flash(failed); return; }
    flash(`${added} added, ${updated} updated${skipped ? `, ${skipped} skipped` : ""}. Door phones pick it up within a minute.`);
    setText(""); load();
  };

  const pick = (k: keyof Cols, label: string) => (
    <label className="block">
      <span className="text-sm text-cream/70">{label}</span>
      <select value={cols[k]} onChange={(e) => setCols({ ...cols, [k]: Number(e.target.value) })} className="mt-1 w-full bg-cream text-ink border-4 border-cream p-2">
        <option value={-1}>Not in this file</option>
        {(hasHeader ? header : header.map((_, i) => `Column ${i + 1}`)).map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
      </select>
    </label>
  );

  return (
    <section>
      <h2 className="font-display text-2xl">Tickets sold elsewhere</h2>
      <p className="text-sm text-cream/70 mt-1">
        Selling on District, BookMyShow, Skillbox or Insider too? Download their attendee or booking list as CSV and import it here.
        Their QR codes and booking IDs then scan at this door, and every name shows in Guests. One door, one count.
      </p>
      {limits?.billing && limits.plan === "free" && (
        <p className="mt-2 text-sm font-bold text-acid-yellow">Free plan: up to {limits.import_cap} imported guests a night. Pro has no limit.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {Object.keys(SOURCES).map((k) => (
          <button key={k} type="button" onClick={() => setSource(k)} className={`font-display text-sm px-3 py-2 border-4 border-cream ${source === k ? "bg-acid-yellow text-ink" : ""}`}>{k === "other" ? "Other" : SOURCES[k]}</button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        <label className="block border-4 border-dashed border-cream p-4 text-center cursor-pointer">
          <span className="font-display">Choose the CSV file</span>
          <span className="block text-sm text-cream/70">or paste the rows below</span>
          <input type="file" accept=".csv,text/csv,text/plain,.xls,.xlsx" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} />
        </label>
        <textarea className={`${inp} font-mono text-sm`} rows={4} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={"Booking ID, Name, Email, Quantity\nDST12345, Asha Rao, asha@example.com, 2"} spellCheck={false} />
      </div>

      {rows.length > 0 && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {pick("code", "Code or booking ID")}
            {pick("name", "Name")}
            {pick("email", "Email")}
            {pick("party", "How many people")}
          </div>
          {cols.code < 0 && <p className="text-sm text-acid-yellow font-bold">No code column: guests can still be found by name, but their QR will not scan.</p>}
          <div className="border-4 border-cream/40 p-3 text-sm overflow-x-auto">
            <p className="text-cream/70 mb-2">First rows as they will import ({mapped.length} in all):</p>
            <table className="w-full">
              <tbody>
                {mapped.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-cream/20"><td className="py-1 pr-3 font-mono break-all">{r.code ?? "–"}</td><td className="py-1 pr-3">{r.name ?? "–"}</td><td className="py-1 tabular-nums">{r.party}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className={btn} disabled={busy || !mapped.length} onClick={run}>{busy ? "Importing…" : `Import ${mapped.length} from ${sourceLabel(source)}`}</button>
        </div>
      )}

      {imports.length > 0 && (
        <div className="mt-5">
          <p className="font-display text-lg">On the door now: {total} outside {total === 1 ? "guest" : "guests"}</p>
          <ul className="mt-2 space-y-2">
            {imports.map((b) => (
              <li key={b.batch} className="border-4 border-cream/40 p-3 flex items-center gap-3">
                <p className="flex-1 text-sm"><b>{sourceLabel(b.source)}</b> · {b.rows} {b.rows === 1 ? "row" : "rows"} · {new Date(b.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                <button type="button" className="text-sm underline min-h-[44px] px-2" onClick={async () => {
                  if (!confirm("Remove this import? Guests already checked in stay counted.")) return;
                  const r = await voidImport(slug, b.batch); flash(r.ok ? `Removed ${(r.data as any).removed}.` : r.error ?? "Could not remove."); load();
                }}>Undo</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-cream/60">Guests can also add a ticket they bought elsewhere on the night's page before they come. Those show in Guests as "added by the guest", with their screenshot.</p>
    </section>
  );
}
