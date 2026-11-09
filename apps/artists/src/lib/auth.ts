/**
 * Server-side auth helpers. The session cookie is shared across *.catscandance.com
 * (sharedCookieOptions in @ccd/auth), set by /auth/callback and refreshed by proxy.ts.
 */
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@ccd/db";
import { sharedCookieOptions } from "@ccd/auth";

export type Member = {
  id: string;
  email: string;
  display_name: string | null;
  city: string | null;
  role: "member" | "host" | "staff" | "owner";
};

/** Supabase client bound to this request's cookies. Read-only in Server Components (the proxy refreshes). */
export async function supabaseForRequest() {
  const store = await cookies();
  const host = (await headers()).get("host") ?? undefined;
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookieOptions: sharedCookieOptions(host),
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try { for (const c of list) store.set(c.name, c.value, c.options); } catch { /* Server Components cannot write cookies */ }
      },
    },
  });
}

/** The signed-in Supabase user, or null. Cheap: reads the cookie session. */
export const getUser = cache(async () => {
  try {
    const sb = await supabaseForRequest();
    const { data } = await sb.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
});

/**
 * The signed-in member row (email, display_name, role) or null. A user who signed in but has no
 * members row yet gets a minimal row with role "member" so the banner and the desk still work.
 */
export const getMember = cache(async (): Promise<Member | null> => {
  const user = await getUser();
  if (!user) return null;
  try {
    const sb = await supabaseForRequest();
    const { data } = await sb.from("members").select("id,email,display_name,city,role").eq("id", user.id).maybeSingle();
    if (data) return data as Member;
  } catch { /* no members row yet */ }
  return { id: user.id, email: user.email ?? "", display_name: (user.user_metadata?.name as string | undefined) ?? null, city: null, role: "member" };
});

export const isStaff = (m: Member | null) => !!m && (m.role === "staff" || m.role === "owner");

/** First name for the banner. */
export const firstName = (m: Member | null) => (m?.display_name?.trim().split(/\s+/)[0] || m?.email?.split("@")[0] || null);
