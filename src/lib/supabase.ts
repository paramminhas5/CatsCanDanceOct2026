/**
 * Supabase browser client — uses the public anon key.
 *
 * This single client handles EVERYTHING:
 * - Public reads (events, videos) via RLS SELECT policies
 * - Public inserts (RSVPs, contact, signups) via RLS INSERT policies
 * - Admin operations when signed in (RLS checks JWT role)
 * - Realtime subscriptions (theme settings, etc.)
 *
 * The anon key is SAFE to expose — RLS protects all data.
 * Admin access requires signing in via Supabase Auth with role = "admin".
 *
 * No proxy, no shim, no middleman — direct Supabase client.
 * When env vars are missing (local dev without .env.local, or preview deploys
 * without secrets), we create the client with a placeholder URL. The Supabase
 * SDK handles failed requests gracefully — hooks fall back to static content.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Always create a real Supabase client. If env vars are missing, use a
// placeholder that will fail network requests gracefully (hooks handle errors
// and fall back to static content). This avoids the no-op client entirely.
let supabaseInstance: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // SSG build without env vars — use a placeholder URL that won't crash
  // createClient() but will fail all network requests. Hooks handle this
  // by falling back to static content in src/content/events.ts.
  if (typeof window !== "undefined") {
    console.warn(
      "[CCD] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set. " +
      "Supabase features will not work. Check your .env.local or Netlify env vars."
    );
  }
  // Use RFC 2606 reserved .invalid TLD — guaranteed to never resolve DNS.
  // This prevents requests from accidentally reaching Supabase's servers
  // (*.supabase.co resolves and returns "No API key found" errors).
  supabaseInstance = createClient(
    "https://not-configured.invalid",
    "placeholder-key-not-configured"
  );
}

export const supabase: SupabaseClient = supabaseInstance;

/** True when both env vars are present and a real client was created.
 *  Use this to guard realtime subscriptions and other features that
 *  would spam WebSocket errors when Supabase is not configured. */
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
