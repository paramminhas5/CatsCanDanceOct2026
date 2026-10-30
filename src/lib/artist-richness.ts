/**
 * Helpers that decide which artists have enough data to be listed
 * and how to order them (richer profiles first).
 */

type Loose = {
  name?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  genres?: string[] | null;
  instagram?: string | null;
  soundcloud?: string | null;
  spotify?: string | null;
  website?: string | null;
  mix_url?: string | null;
  links?: unknown;
  fee_min_inr?: number | null;
  fee_max_inr?: number | null;
  featured?: boolean | null;
  is_resident?: boolean | null;
  played_ccd?: boolean | null;
  based_city?: string | null;
  from_city?: string | null;
};

const has = (v: unknown) => typeof v === "string" && v.trim().length > 0;

export function hasAnyLink(a: Loose): boolean {
  if (has(a.instagram) || has(a.soundcloud) || has(a.spotify) || has(a.website) || has(a.mix_url)) return true;
  const l = a.links;
  if (Array.isArray(l)) return l.length > 0;
  if (l && typeof l === "object") return Object.keys(l as object).length > 0;
  return false;
}

/** Score used for sorting: higher means a fuller profile. */
export function richness(a: Loose): number {
  let s = 0;
  if (has(a.photo_url)) s += 4;
  if (has(a.bio)) s += 4;
  if (hasAnyLink(a)) s += 2;
  if (has(a.soundcloud) || has(a.spotify) || has(a.mix_url)) s += 1;
  if ((a.genres ?? []).length > 0) s += 1;
  if (has(a.based_city) || has(a.from_city)) s += 1;
  if (a.fee_min_inr || a.fee_max_inr) s += 1;
  if (a.featured) s += 3;
  if (a.is_resident) s += 2;
  if (a.played_ccd) s += 1;
  return s;
}

/** An artist is worth listing if it has a bio, a photo or at least one link. */
export function isListable(a: Loose): boolean {
  return has(a.bio) || has(a.photo_url) || hasAnyLink(a);
}

/** Filter out bare records and sort richer ones first, then by name. */
export function listableSorted<T extends Loose>(rows: T[]): T[] {
  return rows
    .filter(isListable)
    .sort((x, y) => richness(y) - richness(x) || (x.name ?? "").localeCompare(y.name ?? ""));
}

/** One plain sentence used when an artist has no bio. */
export function fallbackSummary(a: Loose): string {
  const genres = (a.genres ?? []).filter(Boolean).slice(0, 3);
  const city = (a.based_city || a.from_city || "").trim();
  const kindWord = genres.length ? `${genres.join(", ").toLowerCase()} artist` : "artist";
  const kind = `${/^[aeiou]/.test(kindWord) ? "an" : "a"} ${kindWord}`;
  const name = a.name ?? "This artist";
  return city && city !== "India"
    ? `${name} is ${kind} from ${city}.`
    : `${name} is ${kind} on the Cats Can Dance roster.`;
}
