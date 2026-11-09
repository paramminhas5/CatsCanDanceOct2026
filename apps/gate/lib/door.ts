/**
 * Door: data, local checks and the offline queue for /door/<night>.
 * Ported from apps/ccd/src/lib/door.ts. Every RPC name is unchanged.
 *
 * The phone keeps the night's list (tickets, free list, walk-ins, outside guests) and checks every scan
 * against it first, so the answer is instant and works with no signal. Each action is queued and sent to
 * the server (door_checkin, door_rsvp, door_walkin, door_undo_ticket, door_void_walkin, door_passout,
 * door_guest_set). The server decides: first check-in wins, so two phones on one door cannot let the same
 * ticket in twice.
 *
 * Storage: the list and the queue live in localStorage (fast, synchronous) and are mirrored into IndexedDB,
 * which holds far more than 5 MB and survives when localStorage is blocked or full.
 */
import { memberRpc } from "@/lib/member";

export type DTicket = { code: string; name: string | null; tier: string | null; in_at: string | null; out_at?: string | null; void: boolean; order: string };
export type DRsvp = { id: string; name: string; party: number; in_count: number; in_at: string | null };
export type DWalk = { id: string; name: string; party: number; amount: number; method: string; at: string };
export type DNight = { slug: string; title: string; event_date: string | null; date: string | null; start_time: string | null; venue: string | null; city: string | null; capacity: number | null };
export type DSettings = { age_check: boolean; note: string | null; upi_vpa: string | null; upi_name: string | null; lead: boolean };
/** A guest holding a ticket from another platform (imported list or added by the guest), migration 060. */
export type DGuest = { id: string; code: string | null; name: string | null; source: string; party: number; in_count: number; in_at: string | null; uploaded: boolean; proof: string | null };
export type GateLimits = { plan: "free" | "pro"; billing: boolean; import_cap: number; plan_if_billing: "free" | "pro" };
export type DoorData = { night: DNight; settings: DSettings; tickets: DTicket[]; rsvps: DRsvp[]; walkins: DWalk[]; guests?: DGuest[]; limits?: GateLimits; server_time: string };

export const SOURCES: Record<string, string> = { district: "District", bookmyshow: "BookMyShow", skillbox: "Skillbox", insider: "Insider", highape: "HighApe", ra: "RA", other: "Outside ticket" };
export const sourceLabel = (s: string) => SOURCES[s] ?? "Outside ticket";
/** Booking codes are compared on letters and digits only (same as gate_code in the database). */
export const gateCode = (s: string | null | undefined) => (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export type NightRow = DNight & { expected: number; inside: number; lead?: boolean };

export type Op =
  | { id: string; kind: "ticket"; at: string; code: string }
  | { id: string; kind: "undo_ticket"; at: string; code: string }
  | { id: string; kind: "passout"; at: string; code: string }
  | { id: string; kind: "rsvp"; at: string; rsvp: string; count: number }
  | { id: string; kind: "walkin"; at: string; walk: DWalk & { phone?: string } }
  | { id: string; kind: "void_walkin"; at: string; walk: string }
  | { id: string; kind: "guest"; at: string; guest: string; count: number };

export type ScanResult =
  | { kind: "admit"; name: string; tier: string | null; code: string; party?: number }
  | { kind: "already"; name: string; tier: string | null; at: string; code: string }
  | { kind: "back"; name: string; tier: string | null; code: string }
  | { kind: "out"; name: string; code: string }
  | { kind: "already_out"; name: string; code: string }
  | { kind: "not_in"; name: string; code: string }
  | { kind: "void"; name: string; code: string }
  | { kind: "wrong_night"; name: string; event: string; code: string }
  | { kind: "not_found"; code: string }
  | { kind: "check_name"; code: string };

/* ---------- storage: localStorage first, IndexedDB behind it ---------- */

const store = {
  get<T>(k: string): T | null { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked: IndexedDB still has it */ } },
};

const IDB = "gate-door";
function idb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(IDB, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore("kv"); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function idbGet<T>(k: string): Promise<T | null> {
  const db = await idb(); if (!db) return null;
  return new Promise((resolve) => {
    try {
      const r = db.transaction("kv", "readonly").objectStore("kv").get(k);
      r.onsuccess = () => resolve((r.result as T) ?? null);
      r.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function idbSet(k: string, v: unknown) {
  const db = await idb(); if (!db) return;
  try { db.transaction("kv", "readwrite").objectStore("kv").put(v, k); } catch { /* ignore */ }
}

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`);

/** A short name for this phone, shown in the header so a team can tell doors apart. */
export function deviceName(): string {
  let d = store.get<string>("gate-door-device");
  if (!d) { d = `Door ${Math.random().toString(36).slice(2, 5).toUpperCase()}`; store.set("gate-door-device", d); }
  return d;
}
export function setDeviceName(n: string) { store.set("gate-door-device", n.slice(0, 24)); }

export const cleanCode = (raw: string) => {
  // Our QR holds the bare code. If someone shows a link instead, take the part after the last / = or :.
  const s = raw.trim().replace(/[/?#=:]+$/, "");
  const last = s.split(/[/=:]/).pop() ?? s;
  return last.toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const cacheKey = (slug: string) => `gate-door-list:${slug}`;
const queueKey = (slug: string) => `gate-door-queue:${slug}`;

/** The saved list: localStorage, then IndexedDB. */
export async function loadCache(slug: string): Promise<DoorData | null> {
  return store.get<DoorData>(cacheKey(slug)) ?? (await idbGet<DoorData>(cacheKey(slug)));
}
export function saveCache(slug: string, d: DoorData) { store.set(cacheKey(slug), d); void idbSet(cacheKey(slug), d); }
export async function loadQueue(slug: string): Promise<Op[]> {
  return store.get<Op[]>(queueKey(slug)) ?? (await idbGet<Op[]>(queueKey(slug))) ?? [];
}
export function saveQueue(slug: string, q: Op[]) { store.set(queueKey(slug), q); void idbSet(queueKey(slug), q); }

/* ---------- server ---------- */

export async function fetchNights(): Promise<{ ok: boolean; error?: string; nights?: NightRow[] }> {
  const r = await memberRpc<{ nights: NightRow[] }>("door_nights");
  return r.ok ? { ok: true, nights: r.data?.nights ?? [] } : { ok: false, error: r.error };
}

export async function fetchList(slug: string): Promise<{ ok: boolean; error?: string; data?: DoorData }> {
  const [r, g] = await Promise.all([
    memberRpc<DoorData>("door_list", { p_slug: slug }),
    memberRpc<{ guests: DGuest[]; limits: GateLimits }>("door_guests_list", { p_slug: slug }),
  ]);
  if (!r.ok || !r.data) return { ok: false, error: r.error ?? "Could not load the list." };
  const d = r.data;
  const gd = g.ok ? g.data : null;
  const settings: DSettings = { age_check: false, note: null, upi_vpa: null, upi_name: null, lead: false, ...(d.settings ?? {}) };
  return { ok: true, data: { night: d.night, settings, tickets: d.tickets ?? [], rsvps: d.rsvps ?? [], walkins: d.walkins ?? [], guests: gd?.guests ?? [], limits: gd?.limits, server_time: d.server_time } };
}

/** Apply one action to the local copy. Pure: returns a new object. */
export function applyLocal(d: DoorData, op: Op): DoorData {
  switch (op.kind) {
    case "ticket":
      // In for the first time, or back from a pass-out.
      return { ...d, tickets: d.tickets.map((t) => (t.code !== op.code ? t : !t.in_at ? { ...t, in_at: op.at } : t.out_at ? { ...t, out_at: null } : t)) };
    case "passout":
      return { ...d, tickets: d.tickets.map((t) => (t.code === op.code && t.in_at && !t.out_at ? { ...t, out_at: op.at } : t)) };
    case "undo_ticket":
      return { ...d, tickets: d.tickets.map((t) => (t.code === op.code ? { ...t, in_at: null, out_at: null } : t)) };
    case "rsvp":
      return { ...d, rsvps: d.rsvps.map((r) => (r.id === op.rsvp ? { ...r, in_count: Math.max(0, Math.min(r.party, op.count)), in_at: op.count > 0 ? r.in_at ?? op.at : null } : r)) };
    case "walkin":
      return d.walkins.some((w) => w.id === op.walk.id) ? d : { ...d, walkins: [op.walk, ...d.walkins] };
    case "void_walkin":
      return { ...d, walkins: d.walkins.filter((w) => w.id !== op.walk) };
    case "guest":
      return { ...d, guests: (d.guests ?? []).map((g) => (g.id === op.guest ? { ...g, in_count: Math.max(0, Math.min(g.party, op.count)), in_at: op.count > 0 ? g.in_at ?? op.at : null } : g)) };
  }
}

/** Server copy plus anything this phone has not sent yet. */
export const withPending = (d: DoorData, q: Op[]) => q.reduce(applyLocal, d);

/** Check a scanned code against the local list. `check_name` means: not on this phone's list. */
export function localCheck(d: DoorData, code: string): ScanResult {
  const t = d.tickets.find((x) => x.code === code);
  if (!t) return { kind: "check_name", code };
  const name = t.name || "Guest";
  if (t.void) return { kind: "void", name, code };
  if (t.in_at && t.out_at) return { kind: "back", name, tier: t.tier, code };
  if (t.in_at) return { kind: "already", name, tier: t.tier, at: t.in_at, code };
  return { kind: "admit", name, tier: t.tier, code };
}

/** An outside ticket on this phone's list. Matches the code exactly, or a known code of 6+ characters inside a longer QR (a link). */
export function localGuest(d: DoorData, raw: string): DGuest | null {
  const full = gateCode(raw);
  if (!full) return null;
  const list = (d.guests ?? []).filter((g) => g.code);
  return list.find((g) => g.code === full) ?? list.filter((g) => (g.code as string).length >= 6 && full.includes(g.code as string))
    .sort((a, b) => (b.code as string).length - (a.code as string).length)[0] ?? null;
}

type GuestCheck = { result: string; name?: string; tier?: string; party: number; at?: string; event?: string };

/** Ask the server about an outside code this phone doesn't know. */
export async function serverGuestCheck(slug: string, raw: string, device: string): Promise<ScanResult | null> {
  const r = await memberRpc<GuestCheck>("door_check_guest", { p_slug: slug, p_code: raw, p_device: device, p_client_at: new Date().toISOString() });
  if (!r.ok || !r.data) return null;
  const x = r.data; const code = gateCode(raw);
  const tier = x.tier ? `${sourceLabel(x.tier)}${x.party > 1 ? ` · party of ${x.party}` : ""}` : null;
  switch (x.result) {
    case "admit": return { kind: "admit", name: x.name || "Guest", tier, code, party: x.party };
    case "already": return { kind: "already", name: x.name || "Guest", tier, at: x.at ?? new Date().toISOString(), code };
    case "wrong_night": return { kind: "wrong_night", name: "Outside ticket", event: x.event ?? "another night", code };
    default: return null;
  }
}

/** Scanning people out for a pass-out. */
export function localCheckOut(d: DoorData, code: string): ScanResult {
  const t = d.tickets.find((x) => x.code === code);
  if (!t || t.void) return { kind: "check_name", code };
  const name = t.name || "Guest";
  if (!t.in_at) return { kind: "not_in", name, code };
  if (t.out_at) return { kind: "already_out", name, code };
  return { kind: "out", name, code };
}

type CheckinResult = { result: string; name?: string; tier?: string | null; at?: string; event?: string };

/** Send one queued action. Returns the server's answer for a ticket, so the screen can correct itself. */
export async function sendOp(slug: string, op: Op, device: string): Promise<{ ok: boolean; error?: string; result?: CheckinResult }> {
  switch (op.kind) {
    case "ticket": {
      const r = await memberRpc<CheckinResult>("door_checkin", { p_slug: slug, p_code: op.code, p_device: device, p_client_at: op.at });
      return { ok: r.ok, error: r.error, result: r.data };
    }
    case "undo_ticket": return memberRpc("door_undo_ticket", { p_slug: slug, p_code: op.code, p_device: device });
    case "passout": return memberRpc("door_passout", { p_slug: slug, p_code: op.code, p_device: device, p_client_at: op.at });
    case "rsvp": return memberRpc("door_rsvp", { p_slug: slug, p_id: op.rsvp, p_count: op.count, p_device: device, p_client_at: op.at });
    case "walkin": return memberRpc("door_walkin", {
      p_slug: slug, p_id: op.walk.id, p_name: op.walk.name, p_party: op.walk.party, p_amount: op.walk.amount, p_method: op.walk.method,
      p_phone: op.walk.phone || null, p_device: device, p_client_at: op.at,
    });
    case "void_walkin": return memberRpc("door_void_walkin", { p_slug: slug, p_id: op.walk, p_device: device });
    case "guest": return memberRpc("door_guest_set", { p_slug: slug, p_id: op.guest, p_count: op.count, p_device: device, p_client_at: op.at });
  }
}

/** Ask the server about a code this phone doesn't know (a ticket bought after the list loaded, or another night). */
export async function serverCheck(slug: string, code: string, device: string): Promise<ScanResult | null> {
  const r = await memberRpc<CheckinResult>("door_checkin", { p_slug: slug, p_code: code, p_device: device, p_client_at: new Date().toISOString() });
  if (!r.ok || !r.data) return null;
  const x = r.data;
  const name = x.name || "Guest";
  switch (x.result) {
    case "admit": return { kind: "admit", name, tier: x.tier ?? null, code };
    case "back": return { kind: "back", name, tier: x.tier ?? null, code };
    case "already": return { kind: "already", name, tier: x.tier ?? null, at: x.at ?? new Date().toISOString(), code };
    case "void": return { kind: "void", name, code };
    case "wrong_night": return { kind: "wrong_night", name, event: x.event ?? "another night", code };
    default: return { kind: "not_found", code };
  }
}

export type Counts = { inside: number; expected: number; ticketsIn: number; tickets: number; listIn: number; list: number; walkins: number; takings: Record<string, number>; out: number; outside: number; outsideIn: number };
export function counts(d: DoorData): Counts {
  const live = d.tickets.filter((t) => !t.void);
  const ticketsIn = live.filter((t) => t.in_at).length;
  const out = live.filter((t) => t.in_at && t.out_at).length;
  const list = d.rsvps.reduce((s, r) => s + r.party, 0);
  const listIn = d.rsvps.reduce((s, r) => s + r.in_count, 0);
  const walkins = d.walkins.reduce((s, w) => s + w.party, 0);
  const outside = (d.guests ?? []).reduce((s, g) => s + g.party, 0);
  const outsideIn = (d.guests ?? []).reduce((s, g) => s + g.in_count, 0);
  const takings: Record<string, number> = {};
  for (const w of d.walkins) if (w.amount > 0) takings[w.method] = (takings[w.method] ?? 0) + w.amount;
  return { inside: ticketsIn - out + listIn + walkins + outsideIn, expected: live.length + list + outside, ticketsIn, tickets: live.length, listIn, list, walkins, takings, out, outside, outsideIn };
}

/** Arrivals per 15 minutes, for the Count tab. */
export function arrivals(d: DoorData): { t: number; n: number }[] {
  const times: number[] = [];
  for (const t of d.tickets) if (t.in_at && !t.void) times.push(Date.parse(t.in_at));
  for (const r of d.rsvps) if (r.in_at) for (let i = 0; i < r.in_count; i++) times.push(Date.parse(r.in_at));
  for (const w of d.walkins) for (let i = 0; i < w.party; i++) times.push(Date.parse(w.at));
  for (const g of d.guests ?? []) if (g.in_at) for (let i = 0; i < g.in_count; i++) times.push(Date.parse(g.in_at));
  if (!times.length) return [];
  const slot = 15 * 60 * 1000;
  const start = Math.floor(Math.min(...times) / slot) * slot;
  const end = Math.floor(Math.max(Date.now(), ...times) / slot) * slot;
  const out: { t: number; n: number }[] = [];
  for (let s = start; s <= end && out.length < 48; s += slot) out.push({ t: s, n: 0 });
  for (const x of times) { const i = Math.floor((x - start) / slot); if (out[i]) out[i].n++; }
  return out;
}

export const timeIST = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
export const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** upi:// link for a door payment. Any UPI app on the guest's phone opens it from the QR. */
export function upiLink(vpa: string, name: string | null, amount: number, note: string) {
  const p = new URLSearchParams({ pa: vpa, pn: name || "Gate", am: String(amount), cu: "INR", tn: note.slice(0, 40) });
  return `upi://pay?${p.toString()}`;
}

export type Setup = { settings: { age_check: boolean; note: string | null; upi_vpa: string | null; upi_name: string | null; live_key: string | null }; team: { email: string; role: "door" | "lead"; name: string | null; joined: boolean }[] };
export async function fetchSetup(slug: string) {
  const r = await memberRpc<Setup>("door_setup", { p_slug: slug });
  return r.ok && r.data ? { ok: true as const, data: r.data } : { ok: false as const, error: r.error ?? "Could not load." };
}
export const saveSettings = (slug: string, s: { age_check: boolean; note: string; upi_vpa: string; upi_name: string }) =>
  memberRpc("door_save_settings", { p_slug: slug, p_age_check: s.age_check, p_note: s.note, p_upi_vpa: s.upi_vpa, p_upi_name: s.upi_name });
export const setTeam = (slug: string, email: string, role: "door" | "lead", name: string, remove = false) =>
  memberRpc("door_team_set", { p_slug: slug, p_email: email, p_role: role, p_name: name || null, p_remove: remove });
export const liveLink = (slug: string, reset = false) => memberRpc<{ key: string }>("door_live_link", { p_slug: slug, p_reset: reset });

export type Report = {
  night: { title: string; date: string | null; venue: string | null; capacity: number | null };
  tiers: { tier: string; sold: number; in: number }[];
  list: { people: number; in: number };
  outside?: { source: string; people: number; in: number; uploaded: number }[];
  walkins: { people: number; takings: Record<string, number> };
  arrivals: { t: string; n: number }[];
  repeat: number; first_timers: number; passouts: number;
  devices: { device: string; actions: number }[];
};
export const fetchReport = (slug: string) => memberRpc<Report>("door_report", { p_slug: slug });

/** Outside guest lists (migration 060): import from a platform's attendee export, list imports, undo one. */
export type ImportRow = { code?: string; name?: string; email?: string; party?: number };
export type ImportBatch = { batch: string; source: string; rows: number; at: string };
export const importGuests = (slug: string, source: string, rows: ImportRow[]) =>
  memberRpc<{ batch: string; added: number; updated: number; skipped: number; cap: number; plan: string }>("door_import_guests", { p_slug: slug, p_source: source, p_rows: rows });
export const fetchGuests = (slug: string) => memberRpc<{ guests: DGuest[]; limits: GateLimits; imports: ImportBatch[] }>("door_guests_list", { p_slug: slug });
export const voidImport = (slug: string, batch: string) => memberRpc<{ removed: number }>("door_void_import", { p_slug: slug, p_batch: batch });
