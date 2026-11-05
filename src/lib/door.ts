/**
 * Door: data, local checks and the offline queue for /door/<night>.
 *
 * The phone keeps the night's list (tickets, free list, walk-ins) and checks every scan against it first,
 * so the answer is instant and works with no signal. Each action is queued and sent to the server
 * (migration 054: door_checkin, door_rsvp, door_walkin, door_undo_ticket, door_void_walkin).
 * The server decides: first check-in wins, so two phones on one door can't let the same ticket in twice.
 */
import { memberRpc } from "@/lib/member";

export type DTicket = { code: string; name: string | null; tier: string | null; in_at: string | null; out_at?: string | null; void: boolean; order: string };
export type DRsvp = { id: string; name: string; party: number; in_count: number; in_at: string | null };
export type DWalk = { id: string; name: string; party: number; amount: number; method: string; at: string };
export type DNight = { slug: string; title: string; event_date: string | null; date: string | null; start_time: string | null; venue: string | null; city: string | null; capacity: number | null };
export type DSettings = { age_check: boolean; note: string | null; upi_vpa: string | null; upi_name: string | null; lead: boolean };
export type DoorData = { night: DNight; settings: DSettings; tickets: DTicket[]; rsvps: DRsvp[]; walkins: DWalk[]; server_time: string };
export type NightRow = DNight & { expected: number; inside: number; lead?: boolean };

export type Op =
  | { id: string; kind: "ticket"; at: string; code: string }
  | { id: string; kind: "undo_ticket"; at: string; code: string }
  | { id: string; kind: "passout"; at: string; code: string }
  | { id: string; kind: "rsvp"; at: string; rsvp: string; count: number }
  | { id: string; kind: "walkin"; at: string; walk: DWalk & { phone?: string } }
  | { id: string; kind: "void_walkin"; at: string; walk: string };

export type ScanResult =
  | { kind: "admit"; name: string; tier: string | null; code: string }
  | { kind: "already"; name: string; tier: string | null; at: string; code: string }
  | { kind: "back"; name: string; tier: string | null; code: string }
  | { kind: "out"; name: string; code: string }
  | { kind: "already_out"; name: string; code: string }
  | { kind: "not_in"; name: string; code: string }
  | { kind: "void"; name: string; code: string }
  | { kind: "wrong_night"; name: string; event: string; code: string }
  | { kind: "not_found"; code: string }
  | { kind: "check_name"; code: string };

const store = {
  get<T>(k: string): T | null { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked: the door still works from memory */ } },
};

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`);

/** A short name for this phone, shown in the header so a team can tell doors apart. */
export function deviceName(): string {
  let d = store.get<string>("ccd-door-device");
  if (!d) { d = `Door ${Math.random().toString(36).slice(2, 5).toUpperCase()}`; store.set("ccd-door-device", d); }
  return d;
}
export function setDeviceName(n: string) { store.set("ccd-door-device", n.slice(0, 24)); }

export const cleanCode = (raw: string) => {
  // Our QR holds the bare code. If someone shows a link instead, take the part after the last / = or :.
  const s = raw.trim().replace(/[/?#=:]+$/, "");
  const last = s.split(/[/=:]/).pop() ?? s;
  return last.toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const cacheKey = (slug: string) => `ccd-door-list:${slug}`;
const queueKey = (slug: string) => `ccd-door-queue:${slug}`;
export const loadCache = (slug: string) => store.get<DoorData>(cacheKey(slug));
export const saveCache = (slug: string, d: DoorData) => store.set(cacheKey(slug), d);
export const loadQueue = (slug: string) => store.get<Op[]>(queueKey(slug)) ?? [];
export const saveQueue = (slug: string, q: Op[]) => store.set(queueKey(slug), q);

export async function fetchNights(): Promise<{ ok: boolean; error?: string; nights?: NightRow[] }> {
  const r = await memberRpc<{ nights: NightRow[] }>("door_nights");
  return r.ok ? { ok: true, nights: (r.data as any).nights ?? [] } : { ok: false, error: r.error };
}

export async function fetchList(slug: string): Promise<{ ok: boolean; error?: string; data?: DoorData }> {
  const r = await memberRpc<DoorData>("door_list", { p_slug: slug });
  if (!r.ok) return { ok: false, error: r.error };
  const d = r.data as any;
  const settings: DSettings = { age_check: false, note: null, upi_vpa: null, upi_name: null, lead: false, ...(d.settings ?? {}) };
  return { ok: true, data: { night: d.night, settings, tickets: d.tickets ?? [], rsvps: d.rsvps ?? [], walkins: d.walkins ?? [], server_time: d.server_time } };
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

/** Scanning people out for a pass-out. */
export function localCheckOut(d: DoorData, code: string): ScanResult {
  const t = d.tickets.find((x) => x.code === code);
  if (!t || t.void) return { kind: "check_name", code };
  const name = t.name || "Guest";
  if (!t.in_at) return { kind: "not_in", name, code };
  if (t.out_at) return { kind: "already_out", name, code };
  return { kind: "out", name, code };
}

/** Send one queued action. Returns the server's answer for a ticket, so the screen can correct itself. */
export async function sendOp(slug: string, op: Op, device: string): Promise<{ ok: boolean; error?: string; result?: any }> {
  switch (op.kind) {
    case "ticket": {
      const r = await memberRpc("door_checkin", { p_slug: slug, p_code: op.code, p_device: device, p_client_at: op.at });
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
  }
}

/** Ask the server about a code this phone doesn't know (a ticket bought after the list loaded, or another night). */
export async function serverCheck(slug: string, code: string, device: string): Promise<ScanResult | null> {
  const r = await memberRpc<any>("door_checkin", { p_slug: slug, p_code: code, p_device: device, p_client_at: new Date().toISOString() });
  if (!r.ok) return null;
  const x = r.data as any;
  const name = x.name || "Guest";
  switch (x.result) {
    case "admit": return { kind: "admit", name, tier: x.tier ?? null, code };
    case "back": return { kind: "back", name, tier: x.tier ?? null, code };
    case "already": return { kind: "already", name, tier: x.tier ?? null, at: x.at, code };
    case "void": return { kind: "void", name, code };
    case "wrong_night": return { kind: "wrong_night", name, event: x.event, code };
    default: return { kind: "not_found", code };
  }
}

export type Counts = { inside: number; expected: number; ticketsIn: number; tickets: number; listIn: number; list: number; walkins: number; takings: Record<string, number>; out: number };
export function counts(d: DoorData): Counts {
  const live = d.tickets.filter((t) => !t.void);
  const ticketsIn = live.filter((t) => t.in_at).length;
  const out = live.filter((t) => t.in_at && t.out_at).length;
  const list = d.rsvps.reduce((s, r) => s + r.party, 0);
  const listIn = d.rsvps.reduce((s, r) => s + r.in_count, 0);
  const walkins = d.walkins.reduce((s, w) => s + w.party, 0);
  const takings: Record<string, number> = {};
  for (const w of d.walkins) if (w.amount > 0) takings[w.method] = (takings[w.method] ?? 0) + w.amount;
  return { inside: ticketsIn - out + listIn + walkins, expected: live.length + list, ticketsIn, tickets: live.length, listIn, list, walkins, takings, out };
}

/** Arrivals per 15 minutes, for the Count tab. */
export function arrivals(d: DoorData): { t: number; n: number }[] {
  const times: number[] = [];
  for (const t of d.tickets) if (t.in_at && !t.void) times.push(Date.parse(t.in_at));
  for (const r of d.rsvps) if (r.in_at) for (let i = 0; i < r.in_count; i++) times.push(Date.parse(r.in_at));
  for (const w of d.walkins) for (let i = 0; i < w.party; i++) times.push(Date.parse(w.at));
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

/** upi:// link for a door payment. Any UPI app on the guest's phone opens it from the QR. */
export function upiLink(vpa: string, name: string | null, amount: number, note: string) {
  const p = new URLSearchParams({ pa: vpa, pn: name || "Cats Can Dance", am: String(amount), cu: "INR", tn: note.slice(0, 40) });
  return `upi://pay?${p.toString()}`;
}

export type Setup = { settings: { age_check: boolean; note: string | null; upi_vpa: string | null; upi_name: string | null; live_key: string | null }; team: { email: string; role: "door" | "lead"; name: string | null; joined: boolean }[] };
export async function fetchSetup(slug: string) {
  const r = await memberRpc<Setup>("door_setup", { p_slug: slug });
  return r.ok ? { ok: true as const, data: r.data as Setup } : { ok: false as const, error: r.error };
}
export const saveSettings = (slug: string, s: { age_check: boolean; note: string; upi_vpa: string; upi_name: string }) =>
  memberRpc("door_save_settings", { p_slug: slug, p_age_check: s.age_check, p_note: s.note, p_upi_vpa: s.upi_vpa, p_upi_name: s.upi_name });
export const setTeam = (slug: string, email: string, role: "door" | "lead", name: string, remove = false) =>
  memberRpc("door_team_set", { p_slug: slug, p_email: email, p_role: role, p_name: name || null, p_remove: remove });
export const liveLink = (slug: string, reset = false) => memberRpc<{ key: string }>("door_live_link", { p_slug: slug, p_reset: reset });
export const fetchReport = (slug: string) => memberRpc<any>("door_report", { p_slug: slug });
