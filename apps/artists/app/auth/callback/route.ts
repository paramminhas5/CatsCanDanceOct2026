/**
 * GET /auth/callback?code=...&next=/path
 * Exchanges the magic-link code for a session and sets the shared cookie, then sends the person on.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sharedCookieOptions } from "@ccd/auth";
import { supabaseEnv } from "@ccd/db";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/bookings";
  // Only same-site paths, so the link cannot bounce people elsewhere.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/bookings";
  if (!code) return NextResponse.redirect(`${origin}/sign-in?error=missing`);

  const response = NextResponse.redirect(`${origin}${next}`);
  const { url, key } = supabaseEnv();
  const supabase = createServerClient(url, key, {
    cookieOptions: sharedCookieOptions(request.headers.get("host") ?? undefined),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) { for (const c of list) response.cookies.set(c.name, c.value, c.options); },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/sign-in?error=link&next=${encodeURIComponent(next)}`);
  return response;
}
