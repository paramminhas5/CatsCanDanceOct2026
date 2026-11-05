import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sharedCookieOptions } from "@ccd/auth";

/**
 * Next 16 proxy (the old middleware). Refreshes the Supabase session cookie on every request so
 * Server Components always see a live session, and sends people without one to /sign-in for the
 * pages that need it. The door itself is a client tree and asks for sign-in on its own screen,
 * so it keeps working as an installed app with no redirect loop.
 */
const NEEDS_SESSION = [/^\/admin(\/|$)/];

export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let res = NextResponse.next({ request: req });
  if (!url || !key) return res;

  const host = req.headers.get("host") ?? undefined;
  const supabase = createServerClient(url, key, {
    cookieOptions: sharedCookieOptions(host),
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list, headers) {
        for (const c of list) req.cookies.set(c.name, c.value);
        res = NextResponse.next({ request: req });
        for (const c of list) res.cookies.set(c.name, c.value, c.options);
        for (const [k, v] of Object.entries(headers ?? {})) res.headers.set(k, v);
      },
    },
  });

  // Reading the claims is what refreshes an expired token. Do it before anything else.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;

  const path = req.nextUrl.pathname;
  if (!signedIn && NEEDS_SESSION.some((re) => re.test(path))) {
    const to = req.nextUrl.clone();
    to.pathname = "/sign-in";
    to.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  // Everything except static files, images and the service worker.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|icons/|.*\\.(?:png|svg|jpg|jpeg|webp|ico|txt|xml|woff2?)$).*)"],
};
