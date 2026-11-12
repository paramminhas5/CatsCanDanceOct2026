/**
 * Refreshes the Supabase session on every request (the @supabase/ssr pattern) so Server Components
 * see a live session, and writes the cookie for `.catscandance.com` so one sign-in covers every product.
 * Next 16: proxy.ts replaces middleware.ts.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sharedCookieOptions } from "@ccd/auth";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  // Only pages that can show a session need the refresh; static assets and images skip it.
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return response;

  const supabase = createServerClient(url, key, {
    cookieOptions: sharedCookieOptions(request.headers.get("host") ?? undefined),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const c of list) request.cookies.set(c.name, c.value);
        response = NextResponse.next({ request });
        for (const c of list) response.cookies.set(c.name, c.value, c.options);
      },
    },
  });
  // getUser() validates the token and refreshes it when needed. Do not add logic between the client and this call.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon|favicon.ico|robots.txt|sitemap.xml|llms.txt|api/card|api/deezer|api/data|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)"],
};
