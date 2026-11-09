/**
 * Kept for old imports. The app never uses the service role key (CLAUDE.md: "Never put the service key
 * in the app"), so this always returns null and callers fall back to the anon client with RLS.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdmin(): SupabaseClient | null {
  return null;
}
