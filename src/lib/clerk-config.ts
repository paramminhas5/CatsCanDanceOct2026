/**
 * Decides once, in the browser, whether Clerk sign-in can run on this host.
 *
 * A production Clerk key (pk_live_…) only works on the domain it was issued
 * for (e.g. catscandance.com). On any other host (Netlify deploy previews,
 * the *.netlify.app address, localhost) Clerk JS fails to load and every
 * component that uses Clerk crashes the page. So on those hosts we turn auth
 * off and the rest of the site keeps working. Test keys (pk_test_…) work
 * everywhere.
 *
 * The answer is a module-level constant, so hooks can branch on it safely.
 */
const KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

function frontendApiFromKey(key: string): string {
  try {
    const encoded = key.split("_").slice(2).join("_");
    const decoded = typeof atob === "function" ? atob(encoded) : Buffer.from(encoded, "base64").toString("utf8");
    return decoded.replace(/\$$/, "");
  } catch {
    return "";
  }
}

function computeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (!KEY) return false;
  if (KEY.startsWith("pk_test_")) return true;
  const api = frontendApiFromKey(KEY); // e.g. "clerk.catscandance.com"
  if (!api) return false;
  const base = api.replace(/^clerk\./, "");
  const host = window.location.hostname;
  return host === base || host.endsWith("." + base);
}

export const CLERK_KEY = KEY;
export const CLERK_ENABLED: boolean = computeEnabled();
