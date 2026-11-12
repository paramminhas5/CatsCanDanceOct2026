/**
 * Data for the public artist page (boards W40-Artist and A40-Artist on the final preview canvas).
 * Builds on getArtistV2 and adds what the new page shows: the counts in the readout, the fee range,
 * past shows, the cities they played (for the passport) and the labels they released on.
 * Everything here is real data. Nothing is invented; a block with no data is left out.
 */
import { getArtistV2, displayName, type ArtistV2, type Release } from "@/lib/artist-v2";
import { select, REVALIDATE } from "@/lib/db";

export type Show = { day: string; title: string; venue: string | null; city: string | null };
export type CityStamp = { city: string; count: number; first: number | null };

export type ArtistPage = {
  a: ArtistV2;
  name: string;
  kind: string | null;
  fee: { min: number; max: number } | null;
  counts: { records: number; shows: number; cities: number; labels: number; albums: number; eps: number; singles: number };
  latest: Release | null;
  alsoOut: Release | null;
  releases: Release[];
  labels: string[];
  past: Show[];
  stamps: CityStamp[];
  nextNear: { city: string } | null;
};

/** Spellings in gig sources that mean the same city. */
const CITY: Record<string, string> = { bangalore: "Bengaluru", bengaluru: "Bengaluru", bombay: "Mumbai", mumbai: "Mumbai", "new delhi": "Delhi", delhi: "Delhi", gurgaon: "Delhi NCR", gurugram: "Delhi NCR", noida: "Delhi NCR" };
const city = (c: string | null) => {
  if (!c) return null;
  const t = c.trim();
  return CITY[t.toLowerCase()] ?? t;
};

type DbRow = { kind: string | null; fee_min_inr: number | string | null; fee_max_inr: number | string | null };
type DbGig = { event_name: string; venue: string | null; city: string | null; event_date: string | null };

export async function getArtistPage(slug: string): Promise<ArtistPage | null> {
  const a = await getArtistV2(slug);
  if (!a) return null;
  const s = encodeURIComponent(slug);
  const tags = ["artists", `artist:${slug}`];
  const [rows, gigs] = await Promise.all([
    select<DbRow>(`artists?slug=eq.${s}&status=eq.approved&select=kind,fee_min_inr,fee_max_inr&limit=1`, REVALIDATE, tags),
    select<DbGig>(`artist_gigs?artist_slug=eq.${s}&verified=is.true&select=event_name,venue,city,event_date&order=event_date.desc.nullslast&limit=200`, REVALIDATE, tags),
  ]);
  const row = rows[0];
  const lo = Number(row?.fee_min_inr ?? 0);
  const hi = Number(row?.fee_max_inr ?? 0);
  const fee = a.bookable && lo > 0 && hi >= lo ? { min: lo, max: hi } : null;

  const releases = a.releases;
  const type = (r: Release) => r.type;
  const labelCounts = new Map<string, number>();
  for (const r of releases) if (r.label) labelCounts.set(r.label, (labelCounts.get(r.label) ?? 0) + 1);
  const labels = [...labelCounts.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([l]) => l);

  const past: Show[] = gigs
    .filter((g): g is DbGig & { event_date: string } => !!g.event_date)
    .map((g) => ({ day: g.event_date, title: g.event_name, venue: g.venue, city: city(g.city) }));
  const byCity = new Map<string, CityStamp>();
  for (const g of past) {
    if (!g.city) continue;
    const y = Number(g.day.slice(0, 4)) || null;
    const cur = byCity.get(g.city) ?? { city: g.city, count: 0, first: y };
    cur.count += 1;
    if (y && (!cur.first || y < cur.first)) cur.first = y;
    byCity.set(g.city, cur);
  }
  const stamps = [...byCity.values()].sort((x, y) => y.count - x.count || x.city.localeCompare(y.city));

  const dated = releases.filter((r) => !r.undated);
  const latest = dated[0] ?? releases[0] ?? null;
  const sameDay = latest ? dated.find((r) => r !== latest && r.date === latest.date) ?? null : null;

  return {
    a,
    name: displayName(a.name),
    kind: row?.kind ?? null,
    fee,
    counts: {
      records: releases.length,
      shows: past.length,
      cities: stamps.length,
      labels: labels.length,
      albums: releases.filter((r) => type(r) === "album").length,
      eps: releases.filter((r) => type(r) === "ep").length,
      singles: releases.filter((r) => type(r) === "single").length,
    },
    latest,
    alsoOut: sameDay,
    releases,
    labels,
    past,
    stamps,
    nextNear: a.upcoming.length ? null : a.city ? { city: city(a.city.split(",")[0]) ?? a.city } : null,
  };
}

/** "₹20k" from 20000. Rates are stored in rupees. */
export const inrShort = (n: number) => (n >= 100000 ? `₹${+(n / 100000).toFixed(1)}L` : `₹${Math.round(n / 1000)}k`);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "31 Oct" and "2026" from an ISO day, without time zone surprises. */
export function dayParts(iso: string): { day: string; year: string } {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return { day: `${Number(d)} ${MONTHS[Number(m) - 1] ?? ""}`.trim(), year: y };
}
