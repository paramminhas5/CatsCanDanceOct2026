import { NextResponse, type NextRequest } from "next/server";

// /ops is behind basic auth. Any username, password = OPS_PASSWORD.
export function middleware(req: NextRequest) {
  const pass = process.env.OPS_PASSWORD;
  if (!pass) return new NextResponse("OPS_PASSWORD not set", { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = atob(encoded);
    if (decoded.slice(decoded.indexOf(":") + 1) === pass) return NextResponse.next();
  }
  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="CCD ops"' },
  });
}

export const config = { matcher: ["/ops/:path*"] };
