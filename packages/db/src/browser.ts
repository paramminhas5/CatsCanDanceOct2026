"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { supabaseEnv } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** One browser client per tab. Cookies carry the session so the server sees it too. */
export function supabaseBrowser() {
  if (client) return client;
  const { url, key } = supabaseEnv();
  client = createBrowserClient<Database>(url, key);
  return client;
}
