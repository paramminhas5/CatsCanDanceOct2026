import list from "./image-hosts.json";

/**
 * True when next/image may optimize this src: a local path, or a host in image-hosts.json.
 * Pass `unoptimized={!canOptimize(src)}` on <Image> for data that comes from the database, so a poster on
 * some other host still shows (straight from its host) instead of throwing.
 */
export function canOptimize(src: unknown): boolean {
  if (typeof src !== "string") return true; // static import
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  let host = "";
  try { host = new URL(src).hostname; } catch { return false; }
  return list.hosts.some((h) => (h.startsWith("*.") ? host.endsWith(h.slice(1)) : host === h));
}
