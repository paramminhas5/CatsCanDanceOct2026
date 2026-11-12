import "server-only";
import { cookies, headers } from "next/headers";
import { sharedCookieOptions } from "@ccd/auth";
import { supabaseEnv } from "@ccd/db";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase bound to this request's cookies, for Server Components, Route Handlers and
 * Server Actions. One sign-in covers every *.catscandance.com product because the cookie
 * domain comes from @ccd/auth. The proxy refreshes the session; Server Components only read.
 */
export async function supabaseServer() {
  const [store, h] = await Promise.all([cookies(), headers()]);
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookieOptions: sharedCookieOptions(h.get("host") ?? undefined),
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const c of list) store.set(c.name, c.value, c.options);
        } catch {
          // Server Components cannot write cookies. proxy.ts handles the refresh.
        }
      },
    },
  });
}

export type Member = {
  id: string;
  email: string;
  display_name: string | null;
  role: "member" | "host" | "staff" | "owner";
};

/** The signed-in person and their members row, or nulls. */
export async function getMember(): Promise<{ user: { id: string; email: string | null } | null; member: Member | null }> {
  try {
    const sb = await supabaseServer();
    const { data } = await sb.auth.getUser();
    const user = data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
    if (!user) return { user: null, member: null };
    const { data: m } = await sb.from("members").select("id,email,display_name,role").eq("id", user.id).maybeSingle();
    return { user, member: (m as Member | null) ?? null };
  } catch {
    return { user: null, member: null };
  }
}

export const isStaff = (m: Member | null) => !!m && (m.role === "staff" || m.role === "owner");
