"use client";

import { createBrowserClient } from "@supabase/ssr";
import { sharedCookieOptions } from "@ccd/auth";
import type { Database } from "@ccd/db";

type Client = ReturnType<typeof createBrowserClient<Database>>;
let client: Client | null = null;

/**
 * One browser client per tab. The session lives in cookies on `.catscandance.com` so the
 * server (and the other products) see the same sign-in. Falls back to a placeholder URL when
 * env is missing so a static build never crashes; every request then fails quietly.
 */
export function supabase(): Client {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://not-configured.invalid";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
  client = createBrowserClient<Database>(url, key, {
    cookieOptions: sharedCookieOptions(typeof window === "undefined" ? undefined : window.location.hostname),
  });
  return client;
}

export const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
