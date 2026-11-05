/**
 * Poster URL resolution — local-first.
 *
 * All event posters are served directly from /public/posters/.
 * No Supabase Storage lookups are performed.
 *
 * Rules:
 *   1. null / empty string → null (caller shows placeholder)
 *   2. Starts with "/" → already a root-relative path, use as-is
 *      e.g.  /posters/ccdxsocial-blr.jpg
 *   3. Starts with "http://" or "https://" → external URL, pass through
 *      (keeps external images working without breaking anything)
 *   4. Bare filename or relative path → serve from /posters/
 *      e.g.  ccdxsocial-blr.jpg → /posters/ccdxsocial-blr.jpg
 */
export function resolvePoster(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;

  // Already root-relative (covers /posters/… paths stored in the static catalogue)
  if (v.startsWith("/")) return v;

  // Full external URL — pass through unchanged
  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  // Bare filename or sub-path → serve from the public/posters/ folder
  return `/posters/${v}`;
}
