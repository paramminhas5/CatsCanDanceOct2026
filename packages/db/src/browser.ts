"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** One browser client per tab. Cookies carry the session so the server sees it too. */
export function supabaseBrowser() {
  if (client) return client;
  const { url, key } = supabaseEnv();
  // Same cookie options as the server (packages/auth sharedCookieOptions), so a session made in the
  // browser (the 6-digit code) is shared across *.catscandance.com like one made by /auth/callback.
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const prod = /(^|\.)catscandance\.com$/.test(host);
  client = createBrowserClient(url, key, {
    cookieOptions: { domain: prod ? ".catscandance.com" : undefined, path: "/", sameSite: "lax", secure: prod },
  });
  return client;
}
