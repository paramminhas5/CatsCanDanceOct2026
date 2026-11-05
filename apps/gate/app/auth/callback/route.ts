import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Where the magic link lands. Supabase sends either a PKCE `code` or a `token_hash` with `type`,
 * depending on the project's email template. Both are handled; the cookie is set for
 * `.catscandance.com` so the other products are signed in too. Then on to `next`.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"));

  const sb = await supabaseServer();
  let error: string | null = null;
  if (code) {
    const r = await sb.auth.exchangeCodeForSession(code);
    error = r.error?.message ?? null;
  } else if (tokenHash && type) {
    const r = await sb.auth.verifyOtp({ token_hash: tokenHash, type: type as "email" | "magiclink" | "signup" | "recovery" | "invite" | "email_change" });
    error = r.error?.message ?? null;
  } else {
    // Some templates put the tokens in the URL fragment, which only the browser can read.
    return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(next)}&fragment=1`, url.origin));
  }
  if (error) return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(next)}&error=${encodeURIComponent(error)}`, url.origin));
  return NextResponse.redirect(new URL(next, url.origin));
}

/** Only same-origin paths. Never an absolute URL from the query string. */
function safeNext(n: string | null) {
  if (!n || !n.startsWith("/") || n.startsWith("//")) return "/";
  return n;
}
