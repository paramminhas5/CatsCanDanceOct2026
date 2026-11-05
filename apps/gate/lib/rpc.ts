import "server-only";
import { supabaseEnv } from "@ccd/db";

/**
 * Server-side PostgREST calls with the anon key, for public reads (promoter pages) and the
 * token-guarded staff RPCs (the caller adds p_token from OPS_TOKEN). Ported from apps/ccd/src/lib/ccd-db.ts
 * and api-rpc.ts. Never a service key: the database functions decide what the anon role may do.
 */
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}, revalidate: number | false = false): Promise<T | null> {
  let env: { url: string; key: string };
  try { env = supabaseEnv(); } catch { return null; }
  const res = await fetch(`${env.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: env.key, Authorization: `Bearer ${env.key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate } }),
  });
  if (!res.ok) throw new Error(`${fn} failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

/** Same, but never throws: ok/data/error. */
export async function rpcSafe<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<{ ok: boolean; data: T | null; error: string | null }> {
  try {
    const data = await rpc<T>(fn, args);
    return { ok: true, data, error: null };
  } catch (e) {
    return { ok: false, data: null, error: e instanceof Error ? e.message : "Request failed" };
  }
}

export async function select<T>(path: string, revalidate: number | false = 300): Promise<T[]> {
  let env: { url: string; key: string };
  try { env = supabaseEnv(); } catch { return []; }
  try {
    const res = await fetch(`${env.url}/rest/v1/${path}`, {
      headers: { apikey: env.key, Authorization: `Bearer ${env.key}` },
      ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate } }),
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}
