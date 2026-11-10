"use client";

/**
 * Who is signed in, on the client. Ported from apps/ccd/src/lib/member.ts.
 * Every RPC that needs the person goes through memberRpc, which unwraps the { ok, error } convention
 * the SECURITY DEFINER functions return.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";

export type Member = {
  id: string;
  email: string;
  display_name: string | null;
  city: string | null;
  genres: string[];
  role: "member" | "host" | "staff" | "owner";
};

export function useMember() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);

  const load = useCallback(async () => {
    try {
      const sb = supabase();
      const { data } = await sb.auth.getSession();
      setSignedIn(!!data.session);
      setEmail(data.session?.user.email ?? null);
      if (data.session) {
        const { data: m } = await sb.from("members").select("id,email,display_name,city,genres,role").eq("id", data.session.user.id).maybeSingle();
        setMember((m as Member | null) ?? null);
      } else setMember(null);
    } catch {
      setSignedIn(false);
      setMember(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the session once on mount
    load();
    const { data: sub } = supabase().auth.onAuthStateChange((ev: string) => {
      if (ev === "SIGNED_IN" || ev === "SIGNED_OUT" || ev === "TOKEN_REFRESHED" || ev === "USER_UPDATED") load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return { loading, signedIn, email, member, reload: load };
}

export type RpcResult<T> = { ok: boolean; error?: string; data?: T };

/** Call a member RPC and unwrap the { ok, error } convention. Network trouble comes back as ok: false with the message. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function memberRpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<RpcResult<T>> {
  try {
    const { data, error } = await supabase().rpc(fn, args);
    if (error) return { ok: false, error: error.message };
    if (data && typeof data === "object" && !Array.isArray(data) && "ok" in (data as Record<string, unknown>)) {
      const d = data as Record<string, unknown>;
      return { ok: !!d.ok, error: typeof d.error === "string" ? d.error : undefined, data: data as T };
    }
    return { ok: true, data: data as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

/** Email sign-in link that brings the person back to `next` on this product. */
export async function sendSignInLink(email: string, next: string): Promise<{ ok: boolean; error?: string }> {
  const origin = window.location.origin;
  const { error } = await supabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next || "/")}` },
  });
  return error ? { ok: false, error: "Could not send the code. Try again in a minute." } : { ok: true };
}

/** Sign in with the 6-digit code from the email (Param, 10 Nov 2026: no link every time). */
export async function verifySignInCode(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const token = code.replace(/\D/g, "");
  if (token.length < 6) return { ok: false, error: "The code is 6 digits." };
  const { error } = await supabase().auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
  if (error) return { ok: false, error: /expired/i.test(error.message) ? "That code has expired. Send a new one." : "That code did not work. Check it and try again." };
  return { ok: true };
}

export async function signOut() {
  await supabase().auth.signOut();
}
