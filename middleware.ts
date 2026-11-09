import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/safe-equal";

// /ops is behind basic auth. Any username, password = OPS_PASSWORD.
export function middleware(req: NextRequest) {
  const pass = process.env.OPS_PASSWORD;
  if (!pass) return new NextResponse("OPS_PASSWORD not set", { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme === "Basic" && encoded) {
    let decoded = "";
    try { decoded = atob(encoded); } catch { /* malformed header */ }
    if (safeEqual(decoded.slice(decoded.indexOf(":") + 1), pass)) {
      const res = NextResponse.next();
      res.headers.set("Cache-Control", "no-store");
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
  }
  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="CCD ops"' },
  });
}

export const config = { matcher: ["/ops/:path*"] };
