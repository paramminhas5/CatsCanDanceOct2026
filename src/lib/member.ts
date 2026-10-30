import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Member = { id: string; email: string; display_name: string | null; city: string | null; genres: string[]; role: "member" | "host" | "staff" | "owner"; quiz: Record<string, unknown> | null };

/** Signed in state plus the member row (null until they finish joining). */
export function useMember() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [member, setMember] = useState<Member | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSignedIn(!!data.session);
    if (data.session) {
      const { data: m } = await supabase.from("members").select("id,email,display_name,city,genres,role,quiz").eq("id", data.session.user.id).maybeSingle();
      setMember((m as Member) ?? null);
    } else setMember(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return { loading, signedIn, member, reload: load };
}

/** Call a member RPC and unwrap the { ok, error } convention. */
export async function memberRpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<{ ok: boolean; error?: string; data?: T }> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === "object" && !Array.isArray(data) && "ok" in (data as any)) return { ...(data as any), data: data as T };
  return { ok: true, data: data as T };
}
