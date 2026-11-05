import { SB, SK } from "@/lib/api-helpers";

/** Call a Supabase RPC with the anon key. Returns { ok, data, error }. */
export async function rpc(fn: string, args: Record<string, unknown>) {
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const body = await r.json().catch(() => null);
    if (!r.ok) return { ok: false as const, data: null, error: (body && (body.message as string)) || "Request failed" };
    return { ok: true as const, data: body, error: null };
  } catch {
    return { ok: false as const, data: null, error: "Network error" };
  }
}

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
