/**
 * Supabase server client — uses the service role key.
 * ONLY import in:
 * - pages/api/* (API routes)
 * - getStaticProps / getServerSideProps
 * 
 * This bypasses RLS — use for admin operations and SSG data fetching.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? "";

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
