import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { supabaseEnv } from "./env";

type CookieStore = {
  getAll(): { name: string; value: string }[];
  set?(name: string, value: string, options?: CookieOptions): void;
};

/**
 * Server client bound to the request's cookies (Server Components, Route Handlers,
 * Server Actions). Pass `await cookies()` from next/headers.
 *
 * In a Server Component the cookie store is read-only; setAll is swallowed there and
 * the proxy (middleware) refreshes sessions instead.
 */
export function supabaseServer(cookieStore: CookieStore) {
  const { url, key } = supabaseEnv();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookies) {
        try {
          for (const c of cookies) cookieStore.set?.(c.name, c.value, c.options);
        } catch {
          // Server Components cannot write cookies. The proxy handles refresh.
        }
      },
    },
  });
}

/**
 * Anonymous client with no session, for public reads at build time and in cached
 * functions (`unstable_cache`, `"use cache"`). Never use it for anything personal.
 */
export function supabaseAnon() {
  const { url, key } = supabaseEnv();
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * PostgREST fetch for the hot paths that do not need the client library (the old
 * site's `ccd-db.ts` pattern). Returns parsed JSON or throws with the status.
 */
export async function rest<T = unknown>(
  path: string,
  init: RequestInit & { revalidate?: number | false; tags?: string[] } = {},
): Promise<T> {
  const { url, key } = supabaseEnv();
  const { revalidate, tags, ...rest } = init;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...rest,
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json", ...(rest.headers || {}) },
    // Next.js extends fetch with revalidate and tags; plain Node ignores them.
    ...(revalidate !== undefined || tags ? ({ next: { revalidate, tags } } as object) : {}),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} on ${path}: ${await res.text()}`);
  return (await res.json()) as T;
}
