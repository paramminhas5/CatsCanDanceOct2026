// Artist page v2 (board I): server data loading and the timeline model.
// Facts come from the database (each with a source) and from Deezer at request time
// (top tracks, related artists, covers and 30s previews). Nothing here is generated.
import { select, rpc } from "@/lib/ccd-db";

/** The 14 pilot artists from the artist depth pilot (Nov 2026). Since 3 Nov every approved artist gets the page; kept for scripts. */
export const PILOT_SLUGS = [
  "sandunes", "kohra", "monophonik", "prabh-deep", "sickflip", "spryk", "shantam",
  "kiss-nuka", "nate08", "okedo", "sijya", "komorebi", "chrms", "karan-kanchan",
] as const;

export const isPilot = (slug: string) => (PILOT_SLUGS as readonly string[]).includes(slug);

/** Flag on in production, or any non-production deploy (Vercel previews, local). */
export async function artistPageV2On(): Promise<boolean> {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return true;
  if (!process.env.VERCEL_ENV && process.env.NODE_ENV !== "production") return true;
  const rows = await select<{ enabled: boolean }>("feature_flags?key=eq.artist_page_v2&select=enabled", 60);
  return !!rows[0]?.enabled;
}

export type Kind = "rel" | "show" | "mile";
export type Moment = {
  id: string;
  y: number;            // fractional year, for placing on the timeline
  kind: Kind;
  t: string;            // title
  sub: string;          // one line under the title
  date: string;         // label, e.g. "Nov 2023" or "2013"
  src: string | null;   // source link
  albumId: string | null;
  trackId: string | null;
  track: string | null;
  fill: string;         // colour used when there is no cover
  ink: string;
};
/** A Bandcamp item that plays in Bandcamp's own player (for releases that are not on Deezer). */
export type Bandcamp = { type: "album" | "track"; id: number; url: string | null };
export type Release = Moment & { type: string; label: string | null; undated: boolean; onTimeline: boolean; bandcamp: Bandcamp | null };
export type Era = { from: number; to: number | null; sound: string | null; tags: string[]; src: string | null; srcName: string | null; palette: PaletteKey };
export type Row = { a: string; b: string; u: string | null };
export type Tile = { id: string; label: string; head: string; rows: Row[] };
export type PopularTrack = { id: string; t: string; album: string; albumId: string | null };
export type AlsoLike = { n: string; why: string; u: string; internal: boolean; img: string | null };
export type Upcoming = { id: string; title: string; city: string | null; venue: string | null; event_date: string; ticket_url: string | null };
export type Mix = { title: string; url: string; date: string | null; tracks: { artist: string; title: string }[] };
export type Video = { title: string; url: string; kind: string | null; note: string | null };
export type Photo = { url: string; caption: string | null; credit: string | null; src: string | null };
export type CcdNight = { slug: string; title: string; date: string | null; upcoming: boolean; url: string };
export type TourDate = { city: string; from: string; to: string; note: string | null };

export type ArtistV2 = {
  slug: string;
  name: string;
  line: string;                 // "MUMBAI · PIANIST AND PRODUCER" style line, from city and kind
  photo: string | null;
  deezerId: string | null;
  spotify: string | null;
  soundcloud: string | null;
  links: { label: string; url: string }[];
  claimed: boolean;
  bio: string | null;           // the artist's bio as stored (written by the artist or CCD)
  bookable: boolean;            // open_to_bookings
  members: string | null;
  ids: { scheme: string; value: string; url: string | null }[];  // MusicBrainz, Discogs, RA, Bandcamp and other ids
  city: string | null;
  genres: string[];
  playedCcd: boolean;
  photos: Photo[];              // artist_media photos
  ccdNights: CcdNight[];        // Cats Can Dance nights with this artist on the lineup
  touring: TourDate[];          // dates posted on /tour (touring_now)
  y0: number;
  y1: number;
  eras: Era[];
  moments: Moment[];            // timeline, oldest first
  releases: Release[];          // all releases, newest first
  popular: PopularTrack[];
  videos: Video[];
  mixes: Mix[];
  tiles: Tile[];
  alsoLike: AlsoLike[];
  upcoming: Upcoming[];
};

export type PaletteKey = "night" | "blush" | "ink" | "cream";
export type Palette = { bg: string; ink: string; mute: string; rule: string; chip: string; surface: string; link: string; show: string; dark: boolean; wave: string; fill: string };

// CCD colours per era. Acid only on dark backgrounds, red on the blush era.
export const PALETTES: Record<PaletteKey, Palette> = {
  night: { bg: "#0e1a3f", ink: "#f4efe4", mute: "rgba(244,239,228,0.62)", rule: "rgba(244,239,228,0.12)", chip: "rgba(244,239,228,0.1)", surface: "#16244f", link: "#b6ef36", show: "#b6ef36", dark: true, wave: "#5b8cff", fill: "#2563eb" },
  blush: { bg: "#f7e9ec", ink: "#1d1416", mute: "rgba(29,20,22,0.6)", rule: "rgba(29,20,22,0.1)", chip: "rgba(220,38,38,0.09)", surface: "#f0d9de", link: "#b91c1c", show: "#dc2626", dark: false, wave: "#ff6b7f", fill: "#dc2626" },
  ink: { bg: "#141414", ink: "#f4efe4", mute: "rgba(244,239,228,0.6)", rule: "rgba(244,239,228,0.12)", chip: "rgba(244,239,228,0.09)", surface: "#1f1f1f", link: "#b6ef36", show: "#b6ef36", dark: true, wave: "#b6ef36", fill: "#3a201a" },
  cream: { bg: "#f4efe4", ink: "#111111", mute: "rgba(17,17,17,0.58)", rule: "rgba(17,17,17,0.1)", chip: "rgba(17,17,17,0.07)", surface: "#ebe4d4", link: "#2563eb", show: "#111111", dark: false, wave: "#2563eb", fill: "#2563eb" },
};
const ORDER: PaletteKey[] = ["night", "blush", "ink"];

const FILLS: [string, string][] = [
  ["#2563eb", "#ffffff"], ["#dc2626", "#ffffff"], ["#b6ef36", "#111111"], ["#f4efe4", "#111111"],
  ["#5b8cff", "#111111"], ["#3a201a", "#f4efe4"], ["#1d1a23", "#f4efe4"], ["#8a7a4c", "#f4efe4"],
];

/** "SANDUNES" -> "Sandunes", "PRABH DEEP" -> "Prabh Deep"; mixed-case names are left alone. */
export const displayName = (n: string) =>
  n === n.toUpperCase() ? n.toLowerCase().replace(/(^|[\s\-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()) : n;

export const coverUrl = (albumId: string | null, size: "small" | "medium" | "big" | "xl" = "big") =>
  albumId ? `https://api.deezer.com/album/${albumId}/image?size=${size}` : null;

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function frac(dateStr: string | null, year: number | null): { y: number; label: string } | null {
  if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [Y, M, D] = dateStr.slice(0, 10).split("-").map(Number);
    // A 1 January date with nothing else usually means "year only".
    if (M === 1 && D === 1) return { y: Y + 0.5, label: String(Y) };
    return { y: Y + ((M - 1) * 30.4 + D) / 366, label: `${MON[M - 1]} ${Y}` };
  }
  if (year) return { y: year + 0.5, label: String(year) };
  return null;
}

const TYPE_LABEL: Record<string, string> = { album: "Album", ep: "EP", single: "Single", compilation: "Compilation", remix: "Remix" };
const SHOWISH = /boiler room|festival|tour|opened for|opens for|support(ed)? for|played|set at|live at|residency|showcase|headlin/i;

function titleCaseCity(s: string | null) {
  if (!s) return null;
  const c = s.split(",")[0].trim();
  if (!c || /^india$/i.test(c)) return null;
  return c;
}

async function deezer<T>(path: string): Promise<T | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 2500);
  try {
    const res = await fetch(`https://api.deezer.com/${path}`, { signal: ctl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    return j && !j.error ? (j as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type DbArtist = {
  slug: string; name: string; kind: string | null; based_city: string | null; from_city: string | null;
  photo_url: string | null; spotify: string | null; soundcloud: string | null; website: string | null;
  instagram: string | null; claimed_at: string | null; genres: string[] | null; links: Record<string, string> | null;
  bio: string | null; mix_url: string | null; open_to_bookings: boolean | null;
  festivals: string[] | null; labels: string | null; members: string | null; played_ccd: boolean | null; mbid: string | null;
};
type DbRelease = {
  id: string; title: string; release_type: string | null; release_date: string | null; year: number | null; label: string | null;
  source_url: string | null; deezer_album_id: string | null; deezer_track_id: string | null; deezer_track_title: string | null;
  spotify_url: string | null; soundcloud_url: string | null; bandcamp_url: string | null;
};
type DbMilestone = { id: string; type: string | null; title: string; date: string | null; year: number | null; created_at: string | null; city: string | null; venue: string | null; source_url: string | null; related_artist_name: string | null };
type DbGig = { id: string; event_name: string; venue: string | null; city: string | null; event_date: string | null; source: string | null };

const enc = encodeURIComponent;

export async function getArtistV2(slug: string): Promise<ArtistV2 | null> {
  const s = enc(slug);
  const artistRows = await select<DbArtist>(
    `artists?slug=eq.${s}&status=eq.approved&select=slug,name,kind,based_city,from_city,photo_url,spotify,soundcloud,website,instagram,claimed_at,genres,links,bio,mix_url,open_to_bookings,festivals,labels,members,played_ccd,mbid&limit=1`, 120);
  const a = artistRows[0];
  if (!a) return null;

  const [disc, miles, affs, infl, vids, mixes, press, eras, tags, ext, gigs, upcomingRaw] = await Promise.all([
    select<DbRelease>(`artist_discography?artist_slug=eq.${s}&select=id,title,release_type,release_date,year,label,source_url,deezer_album_id,deezer_track_id,deezer_track_title,spotify_url,soundcloud_url,bandcamp_url`, 120),
    select<DbMilestone>(`artist_milestones?artist_slug=eq.${s}&select=id,type,title,date,year,city,venue,source_url,related_artist_name,created_at`, 120),
    select<{ name: string; kind: string; source_url: string | null }>(`artist_affiliations?artist_slug=eq.${s}&select=name,kind,source_url`, 300),
    select<{ statement: string; speaker: string | null; source_url: string | null }>(`artist_influences?artist_slug=eq.${s}&select=statement,speaker,source_url`, 300),
    select<{ title: string; url: string; kind: string | null; note: string | null }>(`artist_videos?artist_slug=eq.${s}&select=title,url,kind,note`, 300),
    select<{ mix_title: string; url: string; tracks: { artist?: string; title?: string }[] | null }>(`artist_tracklists?artist_slug=eq.${s}&select=mix_title,url,tracks`, 300),
    select<{ title: string; publication: string | null; url: string; date_published: string | null }>(`artist_press?artist_slug=eq.${s}&select=title,publication,url,date_published&order=date_published.desc.nullslast`, 300),
    select<{ from_year: number; to_year: number | null; sound: string | null; tags: string[]; source_url: string | null; source_name: string | null; palette: PaletteKey }>(`artist_eras?artist_slug=eq.${s}&select=from_year,to_year,sound,tags,source_url,source_name,palette&order=from_year.asc`, 120),
    select<{ tag: string; source_url: string | null }>(`artist_sound_tags?artist_slug=eq.${s}&select=tag,source_url`, 300),
    select<{ scheme: string; value: string; url: string | null }>(`artist_external_ids?artist_slug=eq.${s}&select=scheme,value,url`, 300),
    select<DbGig>(`artist_gigs?artist_slug=eq.${s}&verified=is.true&select=id,event_name,venue,city,event_date,source`, 300),
    rpc<Upcoming[]>("artist_upcoming", { p_slug: slug }).catch(() => [] as Upcoming[]),
  ]);
  const [media, tour, nights, bcRows] = await Promise.all([
    select<{ url: string; caption: string | null; author: string | null; source_url: string | null }>(`artist_media?artist_slug=eq.${s}&kind=eq.photo&select=url,caption,author,source_url&order=sort.asc.nullslast`, 300).catch(() => []),
    select<{ city: string; from_date: string; to_date: string; note: string | null }>(`touring_now?artist_slug=eq.${s}&select=city,from_date,to_date,note&order=from_date.asc`, 120).catch(() => []),
    select<{ slug: string; title: string; event_date: string | null; lineup: string[] | null; status: string | null; episode_no: number | null }>(`events?published=is.true&select=slug,title,event_date,lineup,status,episode_no&order=event_date.desc.nullslast`, 300).catch(() => []),
    // Bandcamp embed ids (migration 040). Asked for separately so the page still works before 040 is applied.
    select<{ id: string; bandcamp_item_id: number | null; bandcamp_item_type: string | null }>(`artist_discography?artist_slug=eq.${s}&bandcamp_item_id=not.is.null&select=id,bandcamp_item_id,bandcamp_item_type`, 120).catch(() => []),
  ]);
  const bcById = new Map(bcRows.filter((b) => b.bandcamp_item_id && (b.bandcamp_item_type === "album" || b.bandcamp_item_type === "track")).map((b) => [b.id, b]));

  const deezerId = ext.find((x) => x.scheme === "deezer")?.value ?? null;

  // ── Releases ───────────────────────────────────────────────────────────────
  const releases: Release[] = disc.map((r, i) => {
    const f = frac(r.release_date, r.year);
    const [fill, ink] = FILLS[i % FILLS.length];
    const type = TYPE_LABEL[(r.release_type ?? "").toLowerCase()] ?? "Release";
    const streaming = !!r.deezer_track_id;
    // A compilation's album player starts on its first track, not this artist's, so only track ids count there.
    const bcRow = bcById.get(r.id);
    const bc = bcRow && !((r.release_type ?? "").toLowerCase() === "compilation" && bcRow.bandcamp_item_type === "album") ? bcRow : undefined;
    const bandcamp: Bandcamp | null = bc ? { type: bc.bandcamp_item_type as "album" | "track", id: Number(bc.bandcamp_item_id), url: r.bandcamp_url ?? (/bandcamp\.com/.test(r.source_url ?? "") ? r.source_url : null) } : null;
    const sub = [type, r.label].filter(Boolean).join(" · ") + (streaming ? "" : bandcamp ? " · on Bandcamp" : " · not on streaming");
    return {
      id: `r-${r.id}`, y: f?.y ?? 0, kind: "rel", t: r.title, sub, date: f?.label ?? "Undated",
      src: r.source_url, albumId: r.deezer_album_id, trackId: r.deezer_track_id, track: r.deezer_track_title,
      fill, ink, type: (r.release_type ?? "").toLowerCase(), label: r.label, undated: !f, onTimeline: false, bandcamp,
    };
  });
  // Keep the timeline readable: albums, EPs and releases from press always; singles only if the list is short.
  // Remixes stay in the Releases row only. The newest two releases always make the timeline.
  const dated = releases.filter((r) => !r.undated).sort((x, y) => y.y - x.y);
  const many = dated.length > 14;
  dated.forEach((r, i) => {
    const major = r.type === "album" || r.type === "ep";
    const remix = r.type === "remix" || /remix/i.test(r.t);
    const fromPress = !(r.src ?? "").includes("deezer.com");
    r.onTimeline = major || i < 2 || (!remix && (!many || fromPress));
  });
  releases.sort((x, y) => (y.undated ? -1 : y.y) - (x.undated ? -1 : x.y));

  // ── Moments (milestones and verified gigs) ────────────────────────────────
  const moments: Moment[] = [];
  for (const m of miles) {
    // Some rows carry the load date as their date. Trust the year column when they disagree,
    // and skip rows whose only date is the day they were loaded.
    const loadDay = m.created_at?.slice(0, 10);
    if (!m.year && m.date && m.date.slice(0, 10) === loadDay) continue;
    const dateOk = m.date && (!m.year || Number(m.date.slice(0, 4)) === m.year);
    const f = frac(dateOk ? m.date : null, m.year);
    if (!f) continue;
    const show = ["festival_debut", "residency", "tour", "festival", "show", "gig"].includes((m.type ?? "").toLowerCase()) || SHOWISH.test(m.title);
    const place = [m.venue, titleCaseCity(m.city)].filter(Boolean).join(", ");
    moments.push({
      id: `m-${m.id}`, y: f.y, kind: show ? "show" : "mile", t: m.title,
      sub: place || (m.related_artist_name ? `With ${m.related_artist_name}` : sourceName(m.source_url) ?? ""),
      date: f.label, src: m.source_url, albumId: null, trackId: null, track: null, fill: "", ink: "",
    });
  }
  for (const g of gigs) {
    const f = frac(g.event_date, null);
    if (!f) continue;
    moments.push({
      id: `g-${g.id}`, y: f.y, kind: "show", t: g.event_name, sub: [g.venue, titleCaseCity(g.city)].filter(Boolean).join(", "),
      date: f.label, src: g.source, albumId: null, trackId: null, track: null, fill: "", ink: "",
    });
  }
  const timeline = [...releases.filter((r) => r.onTimeline), ...moments].sort((x, y) => x.y - y.y);

  const nowY = new Date().getFullYear() + (new Date().getMonth() + 1) / 12;
  const y0 = timeline.length ? Math.floor(timeline[0].y) : new Date().getFullYear() - 3;
  const y1 = Math.max(nowY, timeline.length ? timeline[timeline.length - 1].y + 0.1 : nowY);

  // ── Eras ───────────────────────────────────────────────────────────────────
  let eraList: Era[] = eras.map((e) => ({ from: e.from_year, to: e.to_year, sound: e.sound, tags: e.tags ?? [], src: e.source_url, srcName: e.source_name, palette: e.palette }));
  if (eraList.length === 0) {
    const t0 = tags[0];
    const pal = ORDER[hash(slug) % ORDER.length];
    eraList = [{
      from: y0, to: null, sound: t0?.tag ?? null,
      tags: (a.genres ?? []).filter((g) => g && !/^electronic$/i.test(g)).slice(0, 5),
      src: t0?.source_url ?? null, srcName: sourceName(t0?.source_url ?? null), palette: pal,
    }];
  }

  // ── Deezer at request time: popular tracks and related artists ────────────
  const [top, related, ccdArtists] = await Promise.all([
    deezerId ? deezer<{ data: { id: number; title: string; album?: { id: number; title: string } }[] }>(`artist/${deezerId}/top?limit=5`) : null,
    deezerId ? deezer<{ data: { id: number; name: string; picture_medium?: string }[] }>(`artist/${deezerId}/related?limit=12`) : null,
    select<{ slug: string; name: string; photo_url: string | null }>("artists?status=eq.approved&select=slug,name,photo_url", 600),
  ]);
  const popular: PopularTrack[] = (top?.data ?? []).map((t) => ({ id: String(t.id), t: t.title, album: t.album?.title ?? "", albumId: t.album ? String(t.album.id) : null }));

  // Fans also like: CCD artists on the same label or collective first, then Deezer related artists.
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const byName = new Map(ccdArtists.map((c) => [norm(c.name), c]));
  const alsoLike: AlsoLike[] = [];
  const seen = new Set<string>([slug]);
  const groupNames = affs.filter((x) => x.kind === "label" || x.kind === "collective").map((x) => x.name);
  if (groupNames.length) {
    const inList = groupNames.map((n) => `"${n.replace(/"/g, "")}"`).join(",");
    const shared = await select<{ artist_slug: string; name: string }>(`artist_affiliations?name=in.(${enc(inList)})&artist_slug=neq.${s}&select=artist_slug,name`, 300);
    for (const sh of shared) {
      if (seen.has(sh.artist_slug)) continue;
      const c = ccdArtists.find((x) => x.slug === sh.artist_slug);
      if (!c) continue;
      seen.add(c.slug);
      alsoLike.push({ n: c.name, why: sh.name, u: `/artists/${c.slug}`, internal: true, img: c.photo_url });
    }
  }
  for (const r of related?.data ?? []) {
    const c = byName.get(norm(r.name));
    if (c && seen.has(c.slug)) continue;
    if (c) { seen.add(c.slug); alsoLike.push({ n: c.name, why: "on CCD", u: `/artists/${c.slug}`, internal: true, img: c.photo_url }); continue; }
    alsoLike.push({ n: r.name, why: "shared listeners", u: `https://www.deezer.com/artist/${r.id}`, internal: false, img: r.picture_medium ?? null });
  }

  // ── Tiles ──────────────────────────────────────────────────────────────────
  const tiles: Tile[] = [];
  const circle: Row[] = [];
  for (const x of affs.filter((x) => x.kind === "collaborator" || x.kind === "collective")) circle.push({ a: x.name, b: x.kind === "collective" ? "collective" : "worked together", u: x.source_url });
  for (const m of miles.filter((m) => m.related_artist_name)) circle.push({ a: m.related_artist_name!, b: m.title, u: m.source_url });
  const circleRows = dedupe(circle);
  if (circleRows.length) tiles.push({ id: "circle", label: "CIRCLE", head: headOf(circleRows.map((r) => r.a)), rows: circleRows });
  if (infl.length) tiles.push({ id: "into", label: "GREW UP ON", head: infl[0].statement.length > 60 ? `${infl.length} ${infl.length === 1 ? "note" : "notes"} from interviews` : infl[0].statement, rows: infl.map((i) => ({ a: i.statement, b: i.speaker ?? sourceName(i.source_url) ?? "", u: i.source_url })) });
  if (press.length) tiles.push({ id: "read", label: "READ", head: `${press.length} ${press.length === 1 ? "story" : "stories"}`, rows: press.map((p) => ({ a: p.title, b: p.publication ?? sourceName(p.url) ?? "", u: p.url })) });
  const labelRows = dedupe([
    ...affs.filter((x) => x.kind === "label").map((x) => ({ a: x.name, b: labelYears(x.name, releases), u: x.source_url })),
  ]);
  // Labels also listed on the artist record (comma separated), when not already sourced above.
  for (const l of (a.labels ?? "").split(/[,;]/).map((x) => x.trim()).filter(Boolean)) {
    if (!labelRows.some((r) => r.a.toLowerCase() === l.toLowerCase())) labelRows.push({ a: l, b: labelYears(l, releases), u: null });
  }
  if (labelRows.length) tiles.push({ id: "labels", label: "LABELS", head: headOf(labelRows.map((r) => r.a), 3), rows: labelRows });
  const fests = [...new Set((a.festivals ?? []).map((f) => f.trim()).filter(Boolean))];
  if (fests.length) tiles.push({ id: "fests", label: "FESTIVALS", head: headOf(fests, 2), rows: fests.map((f) => ({ a: f, b: "festival", u: null })) });

  // Cats Can Dance nights with this artist on the lineup (exact name match, test nights left out).
  const me = norm(a.name);
  const today = new Date().toISOString().slice(0, 10);
  const ccdNights: CcdNight[] = nights
    .filter((n) => !/^test-/.test(n.slug) && (n.lineup ?? []).some((x) => norm(x) === me))
    .map((n) => {
      const upcoming = !!n.event_date && n.event_date >= today && n.status !== "cancelled";
      return { slug: n.slug, title: n.title, date: n.event_date, upcoming, url: upcoming ? `/tickets/${n.slug}` : `/nights/${n.slug}` };
    });

  const links: { label: string; url: string }[] = [];
  if (a.spotify) links.push({ label: "Spotify", url: a.spotify });
  if (a.soundcloud) links.push({ label: "SoundCloud", url: a.soundcloud });
  if (deezerId) links.push({ label: "Deezer", url: `https://www.deezer.com/artist/${deezerId}` });
  const bandcamp = ext.find((x) => x.scheme === "bandcamp")?.url;
  if (bandcamp) links.push({ label: "Bandcamp", url: bandcamp });
  if (a.links?.youtube) links.push({ label: "YouTube", url: a.links.youtube });
  if (a.instagram) links.push({ label: "Instagram", url: `https://instagram.com/${a.instagram.replace(/^@/, "")}` });
  if (a.website) links.push({ label: "Website", url: a.website });

  const city = titleCaseCity(a.based_city) ?? titleCaseCity(a.from_city);
  const role = (a.kind ?? "").replace(/_/g, " ");
  const line = [city, role && !/^artist$/i.test(role) ? role : null].filter(Boolean).join(" · ").toUpperCase();

  return {
    slug: a.slug, name: a.name, line, photo: a.photo_url ?? media.find((m) => /^https?:/.test(m.url))?.url ?? null, deezerId,
    spotify: a.spotify, soundcloud: a.soundcloud, links, claimed: !!a.claimed_at,
    bio: a.bio && a.bio.trim().length > 20 ? a.bio.trim() : null,
    bookable: a.open_to_bookings !== false,
    // Members only for groups (two or more names); a solo artist's own name is not shown as a member.
    members: a.members && /,|&| and /i.test(a.members) ? a.members.trim() : null,
    ids: idList(ext, a.mbid),
    city,
    genres: (a.genres ?? []).filter((g) => g && !/^electronic$/i.test(g)).slice(0, 6),
    playedCcd: !!a.played_ccd || ccdNights.some((n) => !n.upcoming),
    photos: media.filter((m) => /^https?:/.test(m.url)).map((m) => ({ url: m.url, caption: m.caption, credit: m.author, src: m.source_url })),
    ccdNights,
    touring: tour.map((t) => ({ city: t.city, from: t.from_date, to: t.to_date, note: t.note })),
    y0, y1, eras: eraList, moments: timeline, releases, popular,
    videos: vids.map((v) => ({ title: v.title, url: v.url, kind: v.kind, note: v.note })),
    mixes: [
      ...mixes.map((m) => {
        const date = /\(published ([^)]+)\)/i.exec(m.mix_title)?.[1] ?? null;
        return {
          title: m.mix_title.replace(/\s*\(published [^)]+\)/i, ""), url: m.url, date,
          tracks: (m.tracks ?? []).map((t) => ({ artist: t.artist ?? "", title: t.title ?? "" })).filter((t) => t.title),
        };
      }),
      // The featured mix link on the artist record, when it is not already a tracklisted mix.
      ...(a.mix_url && /^https?:/.test(a.mix_url) && !mixes.some((m) => sameUrl(m.url, a.mix_url!))
        ? [{ title: "Featured mix", url: a.mix_url, date: null, tracks: [] }] : []),
    ],
    tiles, alsoLike: alsoLike.slice(0, 10),
    upcoming: Array.isArray(upcomingRaw) ? upcomingRaw : [],
  };
}

const ID_URL: Record<string, (v: string) => string> = {
  musicbrainz: (v) => `https://musicbrainz.org/artist/${v}`,
  mbid: (v) => `https://musicbrainz.org/artist/${v}`,
  deezer: (v) => `https://www.deezer.com/artist/${v}`,
  wikidata: (v) => `https://www.wikidata.org/wiki/${v}`,
  discogs: (v) => (/^https?:/.test(v) ? v : `https://www.discogs.com/artist/${v}`),
};
function idList(ext: { scheme: string; value: string; url: string | null }[], mbid: string | null) {
  const out = ext.map((x) => ({ scheme: x.scheme === "mbid" ? "musicbrainz" : x.scheme, value: x.value, url: x.url ?? ID_URL[x.scheme]?.(x.value) ?? (/^https?:/.test(x.value) ? x.value : null) }));
  if (mbid && !out.some((x) => x.scheme === "musicbrainz")) out.push({ scheme: "musicbrainz", value: mbid, url: ID_URL.musicbrainz(mbid) });
  return out;
}

function sameUrl(x: string, y: string) {
  const n = (u: string) => u.toLowerCase().replace(/^https?:\/\/(www\.|m\.)?/, "").replace(/[/?#]+$/, "");
  return n(x) === n(y);
}

/** Bandcamp's own small player for one album or track. */
export function bandcampEmbed(b: Bandcamp | null | undefined): { src: string; h: number } | null {
  if (!b || !b.id) return null;
  return { src: `https://bandcamp.com/EmbeddedPlayer/${b.type}=${b.id}/size=large/bgcol=141414/linkcol=b6ef36/tracklist=false/artwork=small/transparent=true/`, h: 120 };
}

/** Player URL for links that can play on the page (YouTube, SoundCloud, Mixcloud). Null for the rest. */
export function embedFor(url: string | null | undefined): { src: string; h: number } | null {
  if (!url) return null;
  const yt = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url);
  if (yt) return { src: `https://www.youtube-nocookie.com/embed/${yt[1]}`, h: 200 };
  if (/soundcloud\.com\//.test(url)) return { src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23b6ef36&visual=false`, h: 152 };
  const mc = /mixcloud\.com(\/[^?#]+)/.exec(url);
  if (mc) return { src: `https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=0&feed=${encodeURIComponent(mc[1])}`, h: 120 };
  return null;
}

function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function dedupe(rows: Row[]) {
  const seen = new Set<string>();
  return rows.filter((r) => { const k = r.a.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}
function headOf(names: string[], n = 2) {
  const first = names.slice(0, n).join(", ");
  return names.length > n ? `${first} and ${names.length - n} more` : first;
}
function labelYears(name: string, rels: Release[]) {
  const k = name.toLowerCase().replace(/ records?$/, "");
  const ys = rels.filter((r) => !r.undated && (r.label ?? "").toLowerCase().replace(/ records?$/, "") === k).map((r) => Math.floor(r.y));
  if (!ys.length) return "label";
  const lo = Math.min(...ys), hi = Math.max(...ys);
  return lo === hi ? String(lo) : `${lo} to ${hi}`;
}
export function sourceName(u: string | null): string | null {
  if (!u) return null;
  try {
    const h = new URL(u).hostname.replace(/^www\./, "");
    const known: Record<string, string> = {
      "rollingstoneindia.com": "Rolling Stone India", "thewildcity.com": "Wild City", "ra.co": "Resident Advisor", "ja.ra.co": "Resident Advisor",
      "mixmag.net": "Mixmag", "mixmag.asia": "Mixmag Asia", "djmag.com": "DJ Mag", "tru-thoughts.co.uk": "Tru Thoughts", "deezer.com": "Deezer",
      "en.wikipedia.org": "Wikipedia", "boilerroom.tv": "Boiler Room", "homegrown.co.in": "Homegrown", "bandcamp.com": "Bandcamp",
    };
    return known[h] ?? (h.endsWith(".ra.co") ? "Resident Advisor" : h.endsWith(".bandcamp.com") ? "Bandcamp" : h);
  } catch {
    return null;
  }
}
