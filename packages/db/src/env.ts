/** Public Supabase settings. The anon key is public by design; RLS does the guarding. */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
  }
  return { url, key };
}

export const SUPABASE_PROJECT_REF = "jybloszaucgqlbkzquqw";
