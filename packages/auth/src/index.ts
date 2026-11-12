/**
 * One login across the suite.
 *
 * CCD, Artists and Gate share one Supabase Auth (project jybloszaucgqlbkzquqw). The
 * session cookie is set for `.catscandance.com` so signing in on any of the three
 * signs you in on all three. School keeps its own database and trusts a short-lived
 * token signed here (plan: ccd/sso-and-accounts.md).
 *
 * Everything here runs on Web Crypto so it works in Node, Edge and the browser.
 */

/** Cookie options every product passes to @supabase/ssr so the session is shared. */
export function sharedCookieOptions(host?: string) {
  const prod = !!host && /(^|\.)catscandance\.com$/.test(host);
  return {
    domain: prod ? ".catscandance.com" : undefined,
    path: "/",
    sameSite: "lax" as const,
    secure: prod,
  };
}

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export type HandoffClaims = {
  /** Supabase user id. */
  sub: string;
  email: string;
  name?: string | null;
  /** Which product is being handed to. */
  aud: "school" | "artists" | "gate" | "ccd";
  /** Unix seconds. */
  exp: number;
  iat: number;
  nonce: string;
};

/** Sign a 60-second hand-off token (HS256 JWT) with SSO_SHARED_SECRET. */
export async function signHandoff(
  claims: Omit<HandoffClaims, "exp" | "iat" | "nonce">,
  secret: string,
  ttlSeconds = 60,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: HandoffClaims = { ...claims, iat: now, exp: now + ttlSeconds, nonce: b64url(crypto.getRandomValues(new Uint8Array(16))) };
  const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(enc.encode(JSON.stringify(full)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

/**
 * Verify a hand-off token: signature, expiry and audience. The caller checks the
 * nonce against its own two-minute store so a token cannot be replayed.
 */
export async function verifyHandoff(token: string, secret: string, aud: HandoffClaims["aud"]): Promise<HandoffClaims> {
  const [h, b, s] = token.split(".");
  if (!h || !b || !s) throw new Error("malformed token");
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(s), enc.encode(`${h}.${b}`));
  if (!ok) throw new Error("bad signature");
  const claims = JSON.parse(new TextDecoder().decode(fromB64url(b))) as HandoffClaims;
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now) throw new Error("expired");
  if (claims.aud !== aud) throw new Error("wrong audience");
  if (!claims.sub || !claims.email) throw new Error("missing subject");
  return claims;
}
export * from "./signin";
