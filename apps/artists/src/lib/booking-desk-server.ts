/**
 * Server-side data for the artists index and the booking panels. Runs with the anon key.
 * Reads only public data: approved artists (the public fee floor, never contact columns), approved tour windows,
 * verified gigs, published scene events, and the 041 public RPCs when they exist.
 * Ported from apps/ccd/src/lib/booking-desk-server.ts.
 */
import { select, safeRpc, getSceneEvents, matchArtists, todayIST, REVALIDATE } from "@/lib/db";
import { addDays, inferActs, normCity, type ActType, type DeskArtist, type PublicSettings } from "@/lib/desk";

type Row = {
  slug: string; name: string; based_city: string | null; from_city: string | null; bio: string | null; genres: string[] | null;
  photo_url: string | null; open_to_bookings: boolean | null; played_ccd: boolean | null; owner_member: string | null; claimed_at: string | null;
  mix_url: string | null; members: string | null; rank: number | null; lane: string | null; instagram: string | null; soundcloud: string | null;
  spotify: string | null; website: string | null; updated_at: string | null; fee_min_inr: number | string | null;
};

export type DeskData = { artists: DeskArtist[]; live: boolean; updated: string };

export async function getDeskArtists(): Promise<DeskData> {
  const today = todayIST();
  const until = addDays(today, 365);
  const [rows, windows, gigs, scene, settings, avail, stats] = await Promise.all([
    select<Row>("artists?status=eq.approved&select=slug,name,based_city,from_city,bio,genres,photo_url,open_to_bookings,played_ccd,owner_member,claimed_at,mix_url,members,rank,lane,instagram,soundcloud,spotify,website,updated_at,fee_min_inr&order=rank.asc.nullslast,name.asc", REVALIDATE, ["artists"]),
    select<{ artist_slug: string; city: string; from_date: string; to_date: string }>(`artist_dates?status=eq.approved&to_date=gte.${today}&select=artist_slug,city,from_date,to_date`, REVALIDATE, ["tour"]),
    select<{ artist_slug: string; event_date: string; city: string | null; event_name: string | null }>(`artist_gigs?verified=is.true&event_date=gte.${today}&select=artist_slug,event_date,city,event_name`, REVALIDATE, ["artists"]),
    getSceneEvents(),
    safeRpc<(PublicSettings & { artist_slug: string })[]>("booking_settings_public", {}, REVALIDATE),
    safeRpc<{ artist_slug: string; day: string; state: string; city: string | null }[]>("artist_availability_public", { p_from: today, p_to: until }, REVALIDATE),
    safeRpc<{ artist_slug: string; median_reply_hours: number | null }[]>("artist_booking_stats", {}, REVALIDATE),
  ]);

  const busy = new Map<string, { day: string; what: string }[]>();
  const addBusy = (slug: string, day: string | null, what: string) => {
    if (!day || day < today) return;
    const l = busy.get(slug) ?? [];
    if (!l.some((x) => x.day === day)) l.push({ day, what });
    busy.set(slug, l);
  };
  for (const g of gigs) addBusy(g.artist_slug, String(g.event_date).slice(0, 10), "Has a gig");
  const named = rows.map((r) => ({ name: r.name, slug: r.slug }));
  for (const e of scene) for (const a of matchArtists(e, named)) addBusy(a.slug, e.event_date, "Playing a listed night");

  const open = new Map<string, string[]>();
  for (const d of avail ?? []) {
    const day = String(d.day).slice(0, 10);
    if (d.state === "open") open.set(d.artist_slug, [...(open.get(d.artist_slug) ?? []), day]);
    else addBusy(d.artist_slug, day, d.state === "playing" ? "Playing" : "Booked");
  }
  const set = new Map((settings ?? []).map((s) => [s.artist_slug, s]));
  const reply = new Map((stats ?? []).map((s) => [s.artist_slug, s.median_reply_hours == null ? null : Number(s.median_reply_hours)]));

  const artists: DeskArtist[] = rows
    .map((r) => {
      const genres = (r.genres ?? []).filter(Boolean);
      const s = set.get(r.slug) ?? null;
      const ownActs = (s?.act_types ?? []).filter(Boolean) as ActType[];
      const city = normCity(r.based_city) ?? normCity(r.from_city);
      const from = normCity(r.from_city);
      const busyList = (busy.get(r.slug) ?? []).sort((a, b) => a.day.localeCompare(b.day));
      const wins = windows.filter((w) => w.artist_slug === r.slug).map((w) => ({ city: w.city, from: w.from_date, to: w.to_date }));
      // The next date on the card: the first known gig, else the first tour window.
      const gig = busyList.find((b) => b.what === "Has a gig" || b.what === "Playing a listed night" || b.what === "Playing");
      const win = wins.slice().sort((a, b) => a.from.localeCompare(b.from))[0];
      const nextDate = gig?.day ?? win?.from ?? null;
      const nextLabel = gig ? (gigs.find((g) => g.artist_slug === r.slug && String(g.event_date).slice(0, 10) === gig.day)?.city ?? null) : win ? win.city : null;
      return {
        slug: r.slug,
        name: r.name,
        city,
        from: from && from !== city ? from : null,
        genres,
        photo_url: r.photo_url,
        bio: r.bio ? r.bio.slice(0, 180) : null,
        members: r.members,
        played_ccd: !!r.played_ccd,
        verified: !!(r.owner_member || r.claimed_at),
        acts: ownActs.length ? ownActs : inferActs(genres, r.bio, r.members),
        acts_set: ownActs.length > 0,
        settings: s ? { act_types: ownActs, formats: Array.isArray(s.formats) ? s.formats : [], min_notice_days: s.min_notice_days, travel_cities: s.travel_cities ?? [], travels_anywhere: !!s.travels_anywhere, travel_terms: s.travel_terms, rider: s.rider, tech: s.tech, included: s.included, cancellation_terms: s.cancellation_terms } : null,
        open_days: (open.get(r.slug) ?? []).sort(),
        busy: busyList.slice(0, 60),
        windows: wins,
        reply_hours: reply.get(r.slug) ?? null,
        mix_url: r.mix_url,
        rank: r.rank,
        next_date: nextDate,
        next_label: nextLabel ? normCity(nextLabel) ?? nextLabel : null,
        fee_min: r.open_to_bookings && Number(r.fee_min_inr) > 0 ? Number(r.fee_min_inr) : null,
      };
    });
  return { artists, live: settings !== null, updated: today };
}

/** The artists with something to show: a photo, a bio or a link. The index hides bare records. */
export function listable(a: Pick<Row, "bio" | "photo_url" | "instagram" | "soundcloud" | "spotify" | "website" | "mix_url">): boolean {
  const has = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  return has(a.bio) || has(a.photo_url) || has(a.instagram) || has(a.soundcloud) || has(a.spotify) || has(a.website) || has(a.mix_url);
}
