/**
 * Artist page (design v10/v11, Nov 2026). Dark page, the artist's eras in a rail on the left,
 * one focus panel that whatever you click opens in, and a preview player at the bottom.
 * Every list is filtered by the era you pick and reorders around what is in focus.
 * Data comes from getArtistV2 (database rows with sources, plus Deezer at request time).
 */
import { track as trackEvent } from "@/lib/track";
import { shareCard } from "@/lib/share";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useMember, memberRpc } from "@/lib/member";
import { supabase } from "@/lib/supabase";
import { productLink } from "@ccd/brand";
import {
  type ArtistV2, type Moment, type Era, type Release, type Video, type Mix, type PressItem, type LinkOut,
  coverUrl, sourceName, displayName, embedFor, bandcampEmbed } from "@/lib/artist-v2";

/** Booking lives in the Artists app now (offer, thread, contract). The button hands over to it. */
function BookButton({ artist, label, className, style }: { artist: { slug: string; [k: string]: unknown }; label: string; className?: string; style?: CSSProperties; fromQuery?: boolean }) {
  return <a href={productLink("artists", `/${artist.slug}/book`)} className={className} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", ...style }}>{label}</a>;
}

const BG = "#0c0c0c", CREAM = "#f4efe4", INK = "#111111", ACID = "#b6ef36";
const MUTE = "rgba(244,239,228,.58)", RULE = "rgba(244,239,228,.12)";
const SITE = "https://catscandance.com";
const LS_FOLLOW = "ccd_followed_artists";
const LS_WAS = "ccd_i_was_there";
const LS_RAIL = "ccd_artist_rail";

type FocusKind = "rel" | "show" | "mile";
type Focus = { kind: FocusKind; id: string } | null;
type Track = { trackId: string; t: string; sub: string; cover: string | null; y: number | null };
type AlbumTrack = { id: string; t: string; d: number | null };

const ytId = (u: string | null | undefined) => (u ? /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(u)?.[1] ?? null : null);
const thumb = (u: string) => { const id = ytId(u); return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null; };
const short = (e: Era) => (e.to == null ? `${e.from} on` : e.from === e.to ? String(e.from) : `${e.from}–${String(e.to).slice(2)}`);
const yearsLong = (e: Era) => (e.to == null ? `${e.from} on` : e.from === e.to ? String(e.from) : `${e.from} to ${e.to}`);
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const mmss = (s: number | null) => (s == null ? "" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
const TYPE: Record<string, string> = { album: "Album", ep: "EP", single: "Single", remix: "Remix", compilation: "Compilation" };
const STOP = new Set(["festival", "presents", "present", "feat", "featuring", "with", "live", "the", "and", "night", "party", "tour", "event", "edition", "special", "music", "debut", "india", "from", "this", "that", "review", "album", "new"]);
const toks = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w) && !/^(19|20)\d{2}$/.test(w));

export default function ArtistPage({ a }: { a: ArtistV2 }) {
  const name = displayName(a.name);
  const eras = a.eraReal && a.eras.length >= 2 ? a.eras : [];
  const hasEras = eras.length >= 2;
  const nowY = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  const [eraId, setEraId] = useState<string>("all");
  const [focus, setFocus] = useState<Focus>(null);
  const [type, setType] = useState("all");
  const [tab, setTab] = useState<string>("");
  const [rail, setRail] = useState(true);
  const [bioOpen, setBioOpen] = useState(false);
  const [media, setMedia] = useState<string | null>(null);
  const [mixOpen, setMixOpen] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Record<string, AlbumTrack[] | "loading" | "none">>({});
  const [cur, setCur] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const [audioErr, setAudioErr] = useState<string | null>(null);
  const [queue, setQueue] = useState<{ list: Track[]; i: number } | null>(null);
  const [following, setFollowing] = useState(false);
  const [alertNote, setAlertNote] = useState(false);
  const [was, setWas] = useState<Record<string, boolean>>({});
  const [wasCounts, setWasCounts] = useState<Record<string, number> | null>(null);
  const [copied, setCopied] = useState(false);
  const [allShows, setAllShows] = useState(false);
  const [allRels, setAllRels] = useState(false);
  const [navH, setNavH] = useState(76);

  const audio = useRef<HTMLAudioElement | null>(null);
  const loaded = useRef<string | null>(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const topRef = useRef<HTMLDivElement | null>(null);
  const { member } = useMember();

  // ── Eras ─────────────────────────────────────────────────────────────────
  const eraOfY = useCallback((y: number | null | undefined): Era | null => {
    if (!hasEras || y == null) return null;
    const yy = Math.floor(y);
    const hit = eras.find((e) => yy >= e.from && yy <= (e.to ?? 9999));
    if (hit) return hit;
    return yy < eras[0].from ? eras[0] : eras[eras.length - 1];
  }, [eras, hasEras]);
  const era = hasEras ? eras.find((e) => e.id === eraId) ?? null : null;
  const inEra = (y: number | null | undefined) => !era || (y != null && Math.floor(y) >= era.from && Math.floor(y) <= (era.to ?? 9999));
  const dot = (y: number | null | undefined): CSSProperties => {
    const e = eraOfY(y);
    return e ? { display: "inline-block", width: 7, height: 7, borderRadius: "50%", flex: "0 0 7px", background: e.accent } : { display: "none" };
  };

  // ── What can play ────────────────────────────────────────────────────────
  const relTrack = (r: Release): Track | null => r.trackId ? { trackId: r.trackId, t: r.track ?? r.t, sub: `${r.t} · ${r.date}`, cover: coverUrl(r.albumId, "medium"), y: r.undated ? null : r.y } : null;
  const playableRels = useMemo(() => a.releases.filter((r) => r.trackId && !r.undated).sort((x, y) => y.y - x.y), [a.releases]);
  const firstTrack: Track | null = useMemo(() => {
    const p = a.popular[0];
    if (p) return { trackId: p.id, t: p.t, sub: `${p.album}${p.y ? ` · ${Math.floor(p.y)}` : ""}`, cover: coverUrl(p.albumId, "medium"), y: p.y };
    return playableRels[0] ? relTrack(playableRels[0]) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.popular, playableRels]);
  const track = cur ?? firstTrack;
  const theme: Era | null = era ?? eraOfY(track?.y) ?? (hasEras ? eras[eras.length - 1] : null);
  const accent = theme?.accent ?? ACID;
  const tint = theme?.bg ?? "#18200a";

  // Start here: one track per era, oldest first.
  const tour: Track[] = useMemo(() => {
    if (!hasEras) return [];
    const out: Track[] = [];
    for (const e of eras) {
      const inside = (y: number | null) => y != null && Math.floor(y) >= e.from && Math.floor(y) <= (e.to ?? 9999);
      const p = a.popular.find((x) => inside(x.y));
      if (p) { out.push({ trackId: p.id, t: p.t, sub: `${e.label} · ${p.album}`, cover: coverUrl(p.albumId, "medium"), y: p.y }); continue; }
      const r = a.releases.filter((x) => x.trackId && !x.undated && inside(x.y)).sort((x, y) => (x.type === "album" ? -1 : 0) - (y.type === "album" ? -1 : 0) || y.y - x.y)[0];
      const t = r ? relTrack(r) : null;
      if (t) out.push({ ...t, sub: `${e.label} · ${r!.t}` });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.popular, a.releases, eras, hasEras]);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const measure = () => { const h = document.querySelector("header.k-nav, header.fixed")?.getBoundingClientRect().height; if (h) setNavH(Math.round(h)); };
    measure();
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 300);
    return () => { window.removeEventListener("resize", measure); clearTimeout(t); };
  }, []);
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const at = q.get("at");
      if (at) {
        const r = a.releases.find((x) => x.id === at);
        const m = a.moments.find((x) => x.id === at);
        if (r) openItem("rel", r.id, r.undated ? null : r.y, false);
        else if (m) openItem(m.kind === "show" ? "show" : m.kind === "rel" ? "rel" : "mile", m.id, m.y, false);
      }
      const e = q.get("era");
      if (e && eras.some((x) => x.id === e)) setEraId(e);
      setFollowing((JSON.parse(localStorage.getItem(LS_FOLLOW) ?? "[]") as string[]).includes(a.slug));
      const local = (JSON.parse(localStorage.getItem(LS_WAS) ?? "{}") as Record<string, string[]>)[a.slug] ?? [];
      if (local.length) setWas(Object.fromEntries(local.map((id) => [id, true])));
      if (localStorage.getItem(LS_RAIL) === "closed") setRail(false);
    } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.slug]);
  useEffect(() => {
    let live = true;
    supabase.rpc("i_was_there_counts", { p_slug: a.slug }).then(({ data, error }) => {
      if (!live || error || !Array.isArray(data)) return;
      setWasCounts(Object.fromEntries((data as { moment_id: string; count: number }[]).map((r) => [r.moment_id, Number(r.count)])));
    }, () => { /* offline */ });
    return () => { live = false; };
  }, [a.slug]);
  useEffect(() => {
    if (!member) return;
    let live = true;
    supabase.rpc("my_i_was_there", { p_slug: a.slug }).then(({ data, error }) => {
      if (!live || error || !Array.isArray(data)) return;
      const ids = (data as unknown[]).map((x) => (typeof x === "string" ? x : (x as { my_i_was_there?: string }).my_i_was_there ?? "")).filter(Boolean);
      setWas((w) => ({ ...w, ...Object.fromEntries(ids.map((id) => [id, true])) }));
    }, () => { /* offline */ });
    return () => { live = false; };
  }, [member, a.slug]);

  // ── Audio ────────────────────────────────────────────────────────────────
  const play = useCallback(async (t: Track, keepQueue = false) => {
    const el = audio.current;
    if (!el) return;
    if (!keepQueue) setQueue(null);
    setMedia(null);
    setAudioErr(null);
    setCur(t);
    try {
      if (loaded.current !== t.trackId) {
        const r = await fetch(`/api/deezer/track/${t.trackId}`);
        if (!r.ok) throw new Error("no preview");
        const j = await r.json();
        el.src = j.preview;
        loaded.current = t.trackId;
        setProg(0);
      } else if (el.ended) el.currentTime = 0;
      await el.play();
      trackEvent("play_preview", { where: "artist" });
      setPlaying(true);
    } catch {
      setPlaying(false);
      setAudioErr("Preview not available");
    }
  }, []);
  const pause = () => { audio.current?.pause(); setPlaying(false); };
  const toggle = (t: Track | null) => {
    if (!t) return;
    if (playing && track?.trackId === t.trackId) return pause();
    void play(t);
  };
  const next = () => {
    const q = queueRef.current;
    if (!q) return pause();
    const i = q.i + 1;
    if (i >= q.list.length) { setQueue(null); return pause(); }
    setQueue({ list: q.list, i });
    const t = q.list[i];
    const e = eraOfY(t.y);
    if (e) setEraId(e.id);
    void play(t, true);
  };
  const startHere = () => {
    if (!tour.length) return;
    setQueue({ list: tour, i: 0 });
    setFocus(null);
    const e = eraOfY(tour[0].y);
    if (e) setEraId(e.id);
    void play(tour[0], true);
  };
  useEffect(() => { if (media) pause(); }, [media]);

  // ── Focus ────────────────────────────────────────────────────────────────
  function openItem(kind: FocusKind, id: string, y: number | null, scroll = true) {
    setFocus({ kind, id });
    const e = eraOfY(y);
    if (e) setEraId(e.id);
    setMixOpen(null);
    if (scroll) requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelector(`[data-rail="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
  const pickEra = (id: string) => { setEraId(id); setFocus(null); setType("all"); };
  const isFoc = (kind: FocusKind, id: string) => !!focus && focus.kind === kind && focus.id === id;
  const first = <T,>(xs: T[], hit: (x: T) => boolean) => [...xs.filter(hit), ...xs.filter((x) => !hit(x))];

  const fRel = focus?.kind === "rel" ? a.releases.find((r) => r.id === focus.id) ?? null : null;
  const fMom = focus && focus.kind !== "rel" ? a.moments.find((m) => m.id === focus.id) ?? null : null;
  // Album tracklists load when an album or EP is in focus.
  useEffect(() => {
    const id = fRel?.albumId;
    if (!id || !fRel || !["album", "ep", "compilation"].includes(fRel.type) || albums[id]) return;
    setAlbums((m) => ({ ...m, [id]: "loading" }));
    fetch(`/api/deezer/album/${id}`).then((r) => (r.ok ? r.json() : null)).then((j) => {
      setAlbums((m) => ({ ...m, [id]: j?.tracks?.length ? (j.tracks as AlbumTrack[]) : "none" }));
    }).catch(() => setAlbums((m) => ({ ...m, [id]: "none" })));
  }, [fRel, albums]);

  // Related items for a release or a moment, matched on its distinctive words.
  const related = useCallback((title: string, venue: string | null) => {
    const me = new Set(toks(a.name));
    const keys = toks(title).filter((w) => !me.has(w));
    const need = keys.length <= 2 ? keys.length : Math.max(2, Math.ceil(keys.length * 0.5));
    const v = (venue ?? "").trim().toLowerCase();
    const hit = (text: string | null | undefined) => {
      if (!text) return false;
      const t = text.toLowerCase();
      if (v.length >= 5 && t.includes(v)) return true;
      if (!need) return false;
      const tt = new Set(toks(t));
      return keys.filter((k) => tt.has(k)).length >= need;
    };
    return {
      videos: a.videos.filter((x) => hit(`${x.title} ${x.note ?? ""}`)).slice(0, 3),
      press: a.press.filter((x) => hit(`${x.title} ${x.excerpt ?? ""}`)).slice(0, 3),
      mixes: a.mixes.filter((x) => hit(x.title)).slice(0, 2),
    };
  }, [a]);

  // ── Follow, remind, I was there, share ───────────────────────────────────
  const setFollow = async (nextOn: boolean) => {
    setFollowing(nextOn);
    try {
      const local: string[] = JSON.parse(localStorage.getItem(LS_FOLLOW) ?? "[]");
      localStorage.setItem(LS_FOLLOW, JSON.stringify(nextOn ? Array.from(new Set([...local, a.slug])) : local.filter((x) => x !== a.slug)));
    } catch { /* storage blocked */ }
    if (member) {
      const r = await memberRpc("follow_artist", { p_slug: a.slug, p_follow: nextOn });
      if (!r.ok) setFollowing(!nextOn);
    }
  };
  const remind = () => {
    if (!member) setAlertNote(true);
    void setFollow(!following || !member ? true : false);
  };
  const toggleWas = async (id: string) => {
    const on = !was[id];
    setWas((w) => ({ ...w, [id]: on }));
    setWasCounts((c) => (c ? { ...c, [id]: Math.max(0, (c[id] ?? 0) + (on ? 1 : -1)) } : c));
    try {
      const all = JSON.parse(localStorage.getItem(LS_WAS) ?? "{}") as Record<string, string[]>;
      const mine = new Set(all[a.slug] ?? []);
      if (on) mine.add(id); else mine.delete(id);
      all[a.slug] = [...mine];
      localStorage.setItem(LS_WAS, JSON.stringify(all));
    } catch { /* storage blocked */ }
    if (member) await memberRpc("set_i_was_there", { p_slug: a.slug, p_moment: id, p_on: on });
  };
  // Shares the artist card (with their next gig when there is one) and a tracked link back here.
  const share = async () => {
    const path = `/artists/${a.slug}${focus ? `?at=${encodeURIComponent(focus.id)}` : era ? `?era=${era.id}` : ""}`;
    const next = a.upcoming[0];
    const text = next ? `${name} plays next: ${next.title}${next.city ? `, ${next.city}` : ""}.` : `${name} on Cats Can Dance.`;
    const r = await shareCard({ kind: "artist", target: a.slug, path, text });
    if (r === "copied") { setCopied(true); setTimeout(() => setCopied(false), 1600); }
  };
  const toggleRail = () => {
    setRail((v) => { try { localStorage.setItem(LS_RAIL, v ? "closed" : "open"); } catch { /* blocked */ } return !v; });
  };

  // ── Lists, filtered by era, focused item first ───────────────────────────
  const isPast = (m: Moment) => (m.day ? m.day <= today : Math.floor(m.y) < nowY);
  const showsAll = a.moments.filter((m) => m.kind === "show" && isPast(m)).slice().reverse();
  const shows = first(showsAll.filter((m) => inEra(m.y)), (m) => isFoc("show", m.id));
  const relEra = a.releases.filter((r) => (r.undated ? !era : inEra(r.y)));
  const types = ["album", "ep", "single", "remix"].filter((t) => relEra.some((r) => (t === "single" ? !["album", "ep", "remix"].includes(r.type) : r.type === t)));
  const ofType = (r: Release, t: string) => t === "all" || (t === "single" ? !["album", "ep", "remix"].includes(r.type) : r.type === t);
  const releases = first(relEra.filter((r) => ofType(r, type)), (r) => isFoc("rel", r.id));
  const popular = a.popular.filter((p) => inEra(p.y)).slice(0, 5);
  // Research notes sometimes ride along in a title, e.g. "(set79 tracklist, no date on page)". Show the title without them.
  const noteless = (t: string) => t.replace(/\s*\((?=[^)]*\b(?:tracklist|no date|on page|unverified|unconfirmed|source)\b)[^)]*\)/gi, "").trim() || t;
  type Watch = { key: string; title: string; url: string; kind: string; meta: string; y: number | null; img: string | null; mix?: Mix };
  const watchAll: Watch[] = [
    ...a.videos.map((v: Video) => ({ key: v.url, title: noteless(v.title), url: v.url, kind: v.kind ? v.kind.replace(/_/g, " ") : "Video", meta: sourceName(v.url) ?? "", y: v.y, img: thumb(v.url) })),
    ...a.mixes.map((m: Mix) => ({ key: m.url, title: noteless(m.title), url: m.url, kind: "Mix", meta: [sourceName(m.url), m.date, m.tracks.length ? `${m.tracks.length} tracks` : null].filter(Boolean).join(" · "), y: m.y, img: thumb(m.url), mix: m })),
  ];
  const watch = watchAll.filter((w) => (w.y == null ? !era : inEra(w.y)));
  const feature = watch.find((w) => w.img) ?? null;
  const watchRow = watch.filter((w) => w !== feature);
  const press = a.press.filter((x: PressItem) => (x.y == null ? !era : inEra(x.y)));
  const showUpcoming = [
    ...a.upcoming.map((u) => ({ key: u.id, t: u.title, sub: [u.venue, u.city].filter(Boolean).join(", "), date: u.event_date, url: u.ticket_url })),
    ...a.ccdNights.filter((n) => n.upcoming).map((n) => ({ key: n.slug, t: n.title, sub: "Cats Can Dance", date: n.date ?? "", url: n.url })),
  ];

  // Connections tabs, empty ones hidden.
  const tabs = [
    { id: "labels", label: "Labels", n: a.groups.filter((g) => g.kind === "label").length },
    { id: "crews", label: "Crews and bands", n: a.groups.filter((g) => g.kind === "collective").length },
    { id: "worked", label: "Worked with", n: a.worked.length },
    { id: "fests", label: "Festivals", n: a.festivals.length },
    { id: "played", label: "Played with", n: a.playedWith.length },
  ].filter((t) => t.n > 0);
  const tabId = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id ?? "";

  // Rail: each era's moments, and covers for its card.
  const railMoments = (e: Era) => a.moments.filter((m) => Math.floor(m.y) >= e.from && Math.floor(m.y) <= (e.to ?? 9999));
  const eraCovers = (e: Era) => {
    const rs = a.releases.filter((r) => r.albumId && !r.undated && Math.floor(r.y) >= e.from && Math.floor(r.y) <= (e.to ?? 9999));
    return [...rs.filter((r) => r.type === "album" || r.type === "ep"), ...rs.filter((r) => !(r.type === "album" || r.type === "ep"))].slice(0, 4).map((r) => coverUrl(r.albumId, "medium")!);
  };

  // Hero photo per era: photos in their saved order, oldest first.
  const photos = a.photos.length ? a.photos.map((p) => p.url) : a.photo ? [a.photo] : [];
  const eraIdx = era ? eras.indexOf(era) : -1;
  const heroImg = photos.length ? photos[eraIdx < 0 ? 0 : Math.min(eraIdx, photos.length - 1)] : null;

  // ── Focus panel content ──────────────────────────────────────────────────
  let F: ReactNode = null;
  if (fRel) {
    const t = relTrack(fRel);
    const rel = related(fRel.t, null);
    const list = fRel.albumId ? albums[fRel.albumId] : undefined;
    F = (
      <FocusBox accent={accent} tint={tint} onClose={() => setFocus(null)}
        img={coverUrl(fRel.albumId, "xl")} ph={fRel.undated ? "" : String(Math.floor(fRel.y))}
        kicker={`Release · ${TYPE[fRel.type] ?? "Release"} · ${fRel.date}`} title={fRel.t} sub={[fRel.label, fRel.track && t ? `lead track ${fRel.track}` : null].filter(Boolean).join(" · ")}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {t && <button className="a2-btn" onClick={() => toggle(t)} style={btn(accent, INK, accent)}>{playing && track?.trackId === t.trackId ? "❚❚ Pause" : `▶ Play ${t.t}`}</button>}
          <LinkBtns links={fRel.links} />
          <button className="a2-btn" onClick={() => void share()} style={btn("transparent", CREAM, "rgba(244,239,228,.4)")}>{copied ? "Link copied" : "Share"}</button>
        </div>
        {Array.isArray(list) && (
          <ol style={{ listStyle: "none", margin: "6px 0 0", padding: "10px 0 0", borderTop: `1px solid ${RULE}`, display: "flex", flexDirection: "column" }}>
            {list.map((x, i) => {
              const on = track?.trackId === x.id;
              return (
                <li key={x.id}>
                  <button className="a2-hl" onClick={() => toggle({ trackId: x.id, t: x.t, sub: `${fRel.t} · ${fRel.date}`, cover: coverUrl(fRel.albumId, "medium"), y: fRel.y })}
                    style={{ width: "100%", display: "flex", gap: 12, alignItems: "center", padding: "6px 4px", border: 0, background: "transparent", cursor: "pointer", textAlign: "left", color: on ? accent : CREAM }}>
                    <span style={{ width: 20, textAlign: "right", color: on ? accent : MUTE, fontSize: 13 }}>{on && playing ? <Eq /> : i + 1}</span>
                    <span style={{ flex: "1 1 auto", fontWeight: 700, fontSize: 14 }}>{x.t}</span>
                    <span style={{ color: MUTE, fontSize: 12 }}>{mmss(x.d)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {list === "loading" && <span style={{ color: MUTE, fontSize: 13 }}>Loading the tracklist…</span>}
        {!fRel.trackId && bandcampEmbed(fRel.bandcamp) && (
          <iframe title={`${fRel.t} on Bandcamp`} src={bandcampEmbed(fRel.bandcamp)!.src} loading="lazy" style={{ border: 0, width: "100%", maxWidth: 560, height: bandcampEmbed(fRel.bandcamp)!.h, marginTop: 6 }} />
        )}
        <Also rel={rel} accent={accent} onMedia={setMedia} />
      </FocusBox>
    );
  } else if (fMom) {
    const isShow = fMom.kind === "show";
    const rel = related(fMom.t, fMom.venue);
    const vid = rel.videos.find((v) => thumb(v.url));
    const n = wasCounts?.[fMom.id] ?? 0;
    F = (
      <FocusBox accent={accent} tint={tint} onClose={() => setFocus(null)}
        img={vid ? thumb(vid.url) : null} wide={!!vid} ph={String(Math.floor(fMom.y))}
        kicker={`${isShow ? "Show" : "Moment"} · ${fMom.day ? fmtDay(fMom.day) : fMom.date}`} title={fMom.t} sub={fMom.sub}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {vid && <button className="a2-btn" onClick={() => setMedia(vid.url)} style={btn(accent, INK, accent)}>▶ Watch</button>}
          {isShow && (
            <button className="a2-btn" aria-pressed={!!was[fMom.id]} onClick={() => void toggleWas(fMom.id)} style={btn(was[fMom.id] ? accent : "transparent", was[fMom.id] ? INK : accent, accent)}>
              {was[fMom.id] ? "I was there ✓" : "I was there"}{n > 0 ? ` · ${n}` : ""}
            </button>
          )}
          {fMom.src && <a className="a2-btn" href={fMom.src} target="_blank" rel="noreferrer" style={btn("transparent", CREAM, "rgba(244,239,228,.4)")}>Source: {sourceName(fMom.src)} ↗</a>}
          <button className="a2-btn" onClick={() => void share()} style={btn("transparent", CREAM, "rgba(244,239,228,.4)")}>{copied ? "Link copied" : "Share"}</button>
        </div>
        {isShow && was[fMom.id] && !member && <span style={{ fontSize: 13, color: MUTE }}>Saved on this device. <a href="/join" style={{ color: CREAM, fontWeight: 700, textDecoration: "underline" }}>Join free</a> to keep it on your profile.</span>}
        <Also rel={rel} accent={accent} onMedia={setMedia} onMix={(u) => setMixOpen(u)} mixOpen={mixOpen} />
      </FocusBox>
    );
  }

  // ── Scope line ───────────────────────────────────────────────────────────
  const focusTitle = fRel?.t ?? fMom?.t ?? null;
  const scope = focusTitle
    ? { k: era ? `${yearsLong(era)} · ${era.label}` : "In focus", t: `${era ? era.label : "Every era"}, ${focusTitle} first`, s: "Click anything to bring it here. The lists below put it first." }
    : era ? { k: `${yearsLong(era)} · ${era.label}`, t: era.sound ?? era.label, s: "Every list below is from these years." }
      : { k: `Every era · ${eras[0]?.from ?? ""} to now`, t: `${eras.length} eras`, s: "The dot on each item shows its era." };

  const css = `
html,body{overflow-x:visible!important}
@supports (overflow:clip){html,body{overflow-x:clip!important}}
.ap{font-family:var(--k-ui),system-ui,sans-serif;font-size:15px;line-height:1.5;background:${BG};color:${CREAM}}
.ap a{color:inherit;text-decoration:none}
.ap button{font:inherit;color:inherit}
.ap .a2-disp{font-family:var(--k-display),system-ui,sans-serif;font-weight:800;letter-spacing:-.02em}
.ap .a2-lab{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.ap .a2-fade{transition:background-color .5s ease,color .5s ease,border-color .5s ease,opacity .3s ease,box-shadow .2s ease,transform .2s ease}
.ap .a2-hl:hover{background:rgba(244,239,228,.06)!important}
.ap .a2-btn{transition:transform .12s ease}.ap .a2-btn:active{transform:translate(2px,2px)}
.ap .a2-row{scrollbar-width:none}.ap .a2-row::-webkit-scrollbar{display:none}
.ap button:focus-visible,.ap a:focus-visible{outline:3px solid #2563eb;outline-offset:3px}
.ap .a2-ico{width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;color:rgba(244,239,228,.78);border:1px solid rgba(244,239,228,.25)}
.ap .a2-ico:hover{color:#fff;border-color:#fff}
.ap .a2-h2{margin:0;font-size:22px;line-height:1.05;text-transform:uppercase}
.ap .a2-eq{display:inline-flex;gap:2px;align-items:flex-end;height:12px}.ap .a2-eq span{width:3px;height:12px;background:currentColor;transform-origin:bottom;animation:apeq .8s ease-in-out infinite}
.ap .a2-eq span:nth-child(2){animation-delay:.2s}.ap .a2-eq span:nth-child(3){animation-delay:.4s}
@keyframes apeq{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
.ap .a2-railtog{transition:transform .15s ease,box-shadow .15s ease}.ap .a2-railtog:hover{transform:translate(-2px,-2px);box-shadow:5px 5px 0 #f4efe4!important}.ap .a2-railtog:active{transform:translate(2px,2px);box-shadow:0 0 0 #f4efe4!important}
.ap .a2-railtog:hover .a2-chev{animation:ccdnudge .5s ease infinite alternate}@keyframes ccdnudge{from{transform:translateX(0)}to{transform:translateX(-4px)}}.ap .a2-railtog[aria-expanded=false]:hover .a2-chev{animation-name:ccdnudger}@keyframes ccdnudger{from{transform:translateX(0)}to{transform:translateX(4px)}}
.ap .a2-rt{transition:transform .15s ease,box-shadow .15s ease,opacity .2s ease}.ap .a2-rt:hover{transform:translate(-2px,-2px)!important;box-shadow:4px 4px 0 #f4efe4!important;opacity:1!important}
.ap .a2-rail{display:none}.ap .a2-erasm{display:flex}.ap .a2-dk{display:none}.ap .a2-ph{display:inline-flex;align-items:center;justify-content:center}.ap .a2-idlebar{display:none}
.ap .a2-hero{height:300px}.ap .a2-heroimg{left:0;width:100%}.ap .a2-heroname{font-size:clamp(44px,13vw,64px)}
.ap .a2-pad{padding-left:16px;padding-right:16px}
@media (min-width:1024px){
 .ap .a2-rail{display:flex}.ap .a2-erasm{display:none}.ap .a2-dk{display:inline-flex}.ap .a2-ph{display:none}.ap .a2-idlebar{display:flex}
 .ap .a2-hero{height:320px}.ap .a2-heroimg{left:40%;width:60%}.ap .a2-heroname{font-size:${a.name.length > 12 ? 64 : 88}px}
 .ap .a2-pad{padding-left:44px;padding-right:44px}
}
@media (prefers-reduced-motion:reduce){.ap *{transition:none!important;animation:none!important}}

/* Suite pass (13 Nov 2026): same structure as the live page, in the suite's materials */
.ap .a2-btn,.ap .a2-railtog,.ap .a2-rt{border-radius:999px!important;box-shadow:none!important}
.ap .a2-btn:hover{transform:translateY(-1px)}
.ap .a2-ico{border-radius:999px}
.ap .a2-railtog:hover,.ap .a2-rt:hover{transform:translateY(-1px)!important;box-shadow:none!important}
.ap aside.a2-rail button{border-radius:14px}
.ap #book{border-radius:20px}
.ap .a2-h2{font-size:20px;text-transform:none;letter-spacing:-.01em}
`;

  const Section = ({ title, note, children, right }: { title: string; note?: string; children: ReactNode; right?: ReactNode }) => (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 className="a2-disp a2-h2">{title}</h2>
        {right ?? (note && <span className="a2-lab" style={{ color: MUTE }}>{note}</span>)}
      </div>
      {children}
    </section>
  );
  const chipStyle = (on: boolean): CSSProperties => ({ height: 36, padding: "0 12px", border: "1px solid rgba(244,239,228,.3)", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", background: on ? CREAM : "transparent", color: on ? INK : "rgba(244,239,228,.82)" });
  const Seg = () => hasEras ? (
    <div role="tablist" aria-label="Eras" style={{ display: "flex", border: "1px solid rgba(244,239,228,.25)", flexWrap: "wrap" }}>
      {[{ id: "all", s: "All", c: CREAM }, ...eras.map((e) => ({ id: e.id, s: short(e), c: e.accent }))].map((x) => {
        const on = x.id === "all" ? !era : era?.id === x.id;
        return (
          <button key={x.id} role="tab" aria-selected={on} onClick={() => (x.id === "all" ? pickEra("all") : pickEra(x.id))} className="a2-fade"
            style={{ height: 34, padding: "0 12px", fontSize: 12, border: 0, borderRight: "1px solid rgba(244,239,228,.25)", cursor: "pointer", fontWeight: 700, background: on ? x.c : "transparent", color: on ? INK : x.c }}>{x.s}</button>
        );
      })}
    </div>
  ) : null;

  const playIcon = (on: boolean, size = 18) => on
    ? <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" /></svg>
    : <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor" /></svg>;

  return (
    <>
      <div className="ap" style={{ minHeight: "100vh" }}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <audio ref={audio} preload="none"
          onTimeUpdate={(e) => { const el = e.currentTarget; if (el.duration) setProg(el.currentTime / el.duration); }}
          onEnded={() => { setPlaying(false); next(); }} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />

        <div style={{ display: "flex", alignItems: "stretch" }}>
          {/* ── Era rail (desktop) ── */}
          {hasEras && (
            <aside className="a2-rail a2-fade" data-lenis-prevent aria-label={`${name}'s eras`}
              style={{ flex: `0 0 ${rail ? 290 : 76}px`, alignSelf: "flex-start", position: "sticky", top: navH, maxHeight: `calc(100vh - ${navH}px)`, overflowY: "auto", boxSizing: "border-box", padding: `16px ${rail ? 16 : 12}px 90px`, flexDirection: "column", gap: 12, borderRight: `1px solid ${era ? era.accent : RULE}`, background: era ? `linear-gradient(180deg, ${era.bg} 0%, ${BG} 70%)` : BG }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                {rail && <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}><span className="a2-disp" style={{ fontSize: 15 }}>ERAS</span><span className="a2-lab" style={{ color: accent }}>{era ? `Now: ${era.label}` : "Now: every era"}</span></span>}
                <button onClick={toggleRail} aria-expanded={rail} aria-label={rail ? "Close the eras" : "Open the eras"} title={rail ? "Tuck the eras away" : "Open the eras"} className="a2-railtog"
                  style={{ width: rail ? 84 : 44, height: 44, flex: "0 0 auto", border: `2px solid ${CREAM}`, background: accent, color: INK, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `3px 3px 0 ${CREAM}` }}>
                  <span className="a2-chev" aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>{rail ? "«" : "»"}</span>
                  {rail && <span style={{ fontSize: 12, letterSpacing: ".06em" }}>HIDE</span>}
                </button>
              </div>
              {!rail ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button aria-pressed={!era} onClick={() => pickEra("all")} aria-label="All eras" className="a2-fade a2-rt"
                    style={{ width: 44, height: 44, padding: 0, border: `2px solid ${CREAM}`, cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", background: !era ? CREAM : "transparent", color: !era ? INK : CREAM, boxShadow: "none" }}>ALL</button>
                  {eras.map((e) => {
                    const on = era?.id === e.id, dim = !!era && !on;
                    return (
                      <button key={e.id} aria-pressed={on} onClick={() => pickEra(e.id)} aria-label={`${e.label}, ${yearsLong(e)}`} className="a2-fade a2-rt"
                        style={{ width: 44, minHeight: 120, padding: "12px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${on ? CREAM : e.accent}`, background: e.accent, color: INK, opacity: dim ? 0.4 : 1, boxShadow: on ? `4px 4px 0 ${CREAM}` : "none", transform: on ? "translate(-2px,-2px)" : "none" }}>
                        <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
                          <span className="a2-disp" style={{ fontSize: e.label.length > 16 ? 12 : 14 }}>{e.label.toUpperCase()}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em" }}>{short(e)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <button onClick={() => pickEra("all")} className="a2-fade" style={{ width: "100%", textAlign: "left", cursor: "pointer", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2, border: `2px solid ${CREAM}`, background: !era ? CREAM : "transparent", color: !era ? INK : CREAM }}>
                    <span className="a2-lab">Every era · {eras[0].from} to now</span>
                    <span style={{ fontWeight: 700 }}>{eras.length} eras, one page</span>
                  </button>
                  {eras.map((e) => {
                    const on = era?.id === e.id, dim = !!era && !on, big = !era || on;
                    const ms = railMoments(e);
                    const covers = eraCovers(e);
                    let lastY = -1;
                    return (
                      <div key={e.id} style={{ display: "flex", flexDirection: "column" }}>
                        <button aria-pressed={on} onClick={() => pickEra(e.id)} className="a2-fade"
                          style={{ width: "100%", textAlign: "left", cursor: "pointer", padding: dim ? "8px 10px" : 10, display: "flex", flexDirection: "column", gap: dim ? 2 : 6, border: `2px solid ${e.accent}`, background: on ? e.bg : "#121212", color: on ? e.accent : CREAM, opacity: dim ? 0.55 : 1, boxShadow: on ? `5px 5px 0 ${e.accent}` : "none" }}>
                          {big && covers.length > 0 && (
                            <span style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 3 }}>
                              {covers.map((c) => <img key={c} src={c} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />)}
                            </span>
                          )}
                          <span style={{ display: "flex", justifyContent: "space-between", gap: 6 }}><span className="a2-lab">{yearsLong(e)}</span><span className="a2-lab" style={{ opacity: 0.8 }}>{ms.length} moments</span></span>
                          <span className="a2-disp" style={{ fontSize: 18, lineHeight: 1.05 }}>{e.label}</span>
                          {big && e.sound && <span style={{ fontSize: 12, lineHeight: 1.35, opacity: 0.85 }}>{e.sound}</span>}
                        </button>
                        {big && ms.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", borderLeft: `2px solid ${e.accent}`, margin: "6px 0 4px 10px", padding: "2px 0" }}>
                            {ms.map((m) => {
                              const y = Math.floor(m.y);
                              const showY = y !== lastY; lastY = y;
                              const fk: FocusKind = m.kind === "rel" ? "rel" : m.kind === "show" ? "show" : "mile";
                              const fo = isFoc(fk, m.id);
                              const mark: CSSProperties = m.kind === "rel" ? { width: 6, height: 6, borderRadius: "50%", flex: "0 0 6px", background: CREAM } : m.kind === "show" ? { width: 2, height: 11, flex: "0 0 2px", background: e.accent } : { width: 5, height: 5, flex: "0 0 5px", border: `1.5px solid ${CREAM}`, transform: "rotate(45deg)" };
                              return (
                                <button key={m.id} data-rail={m.id} onClick={() => openItem(fk, m.id, m.y)} className="a2-hl"
                                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "4px 6px", border: 0, cursor: "pointer", textAlign: "left", background: fo ? "rgba(244,239,228,.12)" : "transparent", boxShadow: fo ? `inset 2px 0 0 ${e.accent}` : "none", fontWeight: fo ? 700 : 500 }}>
                                  <span style={{ width: 32, flex: "0 0 32px", fontSize: 11, fontWeight: 700, opacity: showY ? 1 : 0 }}>{y}</span>
                                  <span style={mark} />
                                  <span style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.t}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: MUTE, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: CREAM }} />release</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 2, height: 10, background: CREAM }} />show</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 5, height: 5, border: `1.5px solid ${CREAM}`, transform: "rotate(45deg)" }} />moment</span>
                  </div>
                </>
              )}
            </aside>
          )}

          {/* ── Main ── */}
          <main style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
            <section className="a2-hero" style={{ position: "relative", overflow: "hidden", background: "#111111" }}>
              {heroImg && <img className="a2-heroimg" src={heroImg} alt={name} style={{ position: "absolute", top: 0, height: "100%", objectFit: "cover", objectPosition: "center 22%" }} />}
              <div className="a2-fade" style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${tint} 0%, ${tint} 38%, rgba(12,12,12,0) 80%), linear-gradient(0deg, rgba(12,12,12,.9) 0%, rgba(12,12,12,0) 58%)` }} />
              <div className="a2-pad" style={{ position: "absolute", left: 0, right: 0, bottom: 26, display: "flex", flexDirection: "column", gap: 8 }}>
                {a.line && <span className="a2-lab" style={{ color: accent }}>{a.line}</span>}
                <h1 className="a2-disp a2-heroname" style={{ margin: 0, lineHeight: 0.84 }}>{a.name.toUpperCase()}</h1>
              </div>
            </section>

            <section className="a2-pad" style={{ paddingTop: 22, paddingBottom: 24, borderBottom: `1px solid ${RULE}`, display: "flex", flexWrap: "wrap", gap: "20px 40px", alignItems: "center" }}>
              {a.bio && (
                <div style={{ flex: "1 1 460px", maxWidth: "64ch", display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "rgba(244,239,228,.86)", whiteSpace: "pre-line", ...(bioOpen ? {} : { display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }) }}>{a.bio}</p>
                  {a.bio.length > 420 && <button onClick={() => setBioOpen((v) => !v)} style={{ alignSelf: "flex-start", border: 0, background: "none", padding: "8px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>{bioOpen ? "Less" : "More"}</button>}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {track && (
                    <button aria-label={playing ? "Pause" : `Play ${track.t}`} onClick={() => toggle(track)} className="a2-fade a2-btn"
                      style={{ width: 52, height: 52, borderRadius: "50%", border: 0, background: accent, color: INK, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{playIcon(playing)}</button>
                  )}
                  {tour.length >= 2 && (
                    <button onClick={startHere} className="a2-btn" style={btn("transparent", accent, accent, 44)}>Start here · {tour.length} eras</button>
                  )}
                  <button aria-pressed={following} onClick={() => void setFollow(!following)} className="a2-btn" style={btn(following ? CREAM : "transparent", following ? INK : CREAM, following ? CREAM : "rgba(244,239,228,.5)", 44)}>{following ? "Following ✓" : "Follow"}</button>
                  <button aria-pressed={following} onClick={remind} className="a2-btn a2-ph" style={btn("transparent", accent, accent, 44)}>{following ? "We'll tell you ✓" : "Remind me"}</button>
                  {a.bookable && (
                    <BookButton artist={{ slug: a.slug, name, photo_url: a.photo, city: a.city, sound: a.genres.slice(0, 2).join(", ") || undefined }}
                      label={`Book ${name}`} className="a2-btn"
                      style={{ height: 44, padding: "0 18px", background: accent, color: INK, border: `2px solid ${accent}`, fontWeight: 700, cursor: "pointer", fontSize: 14 }} />
                  )}
                </div>
                {a.links.length > 0 && (
                  <nav aria-label={`${name} elsewhere`} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {a.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="a2-ico" aria-label={l.label} title={l.label}><Icon label={l.label} /></a>)}
                  </nav>
                )}
              </div>
            </section>

            {/* Era cards (phone) */}
            {hasEras && (
              <div className="a2-erasm" style={{ flexDirection: "column", gap: 10, paddingTop: 18 }}>
                <span className="a2-disp a2-pad" style={{ fontSize: 15 }}>ERAS</span>
                <div className="a2-row a2-pad" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                  <button onClick={() => pickEra("all")} style={{ flex: "0 0 112px", textAlign: "left", padding: 10, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2, border: `2px solid ${CREAM}`, background: !era ? CREAM : "transparent", color: !era ? INK : CREAM }}>
                    <span className="a2-lab">{eras[0].from} to now</span><span className="a2-disp" style={{ fontSize: 16, lineHeight: 1.05 }}>Every era</span>
                  </button>
                  {eras.map((e) => {
                    const on = era?.id === e.id;
                    const covers = eraCovers(e);
                    return (
                      <button key={e.id} onClick={() => pickEra(e.id)} className="a2-fade" style={{ flex: "0 0 168px", textAlign: "left", padding: 8, display: "flex", flexDirection: "column", gap: 4, border: `2px solid ${e.accent}`, background: on ? e.bg : "#121212", color: on ? e.accent : CREAM, boxShadow: on ? `4px 4px 0 ${e.accent}` : "none" }}>
                        {covers.length > 0 && <span style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 2 }}>{covers.map((c) => <img key={c} src={c} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />)}</span>}
                        <span className="a2-lab">{yearsLong(e)}</span><span className="a2-disp" style={{ fontSize: 16, lineHeight: 1.05 }}>{e.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="a2-pad" style={{ paddingBottom: 120, display: "flex", flexWrap: "wrap", gap: 44, alignItems: "flex-start" }}>
              <div style={{ flex: "999 1 560px", minWidth: 0, display: "flex", flexDirection: "column", gap: 48 }}>
                {/* Scope bar, sticks under the nav */}
                <div ref={topRef} className="a2-fade" style={{ marginTop: 26, scrollMarginTop: navH + 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "12px 16px", borderLeft: `3px solid ${accent}`, background: `linear-gradient(90deg, ${tint} 0%, rgba(12,12,12,.97) 85%)`, backdropFilter: "blur(6px)" }}>
                  <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.35, flex: "1 1 240px", minWidth: 0 }}>
                    <span className="a2-lab" style={{ color: accent }}>{scope.k}</span>
                    <span style={{ fontSize: 17, fontWeight: 700 }}>{scope.t}</span>
                    <span style={{ color: MUTE, fontSize: 13 }}>
                      {scope.s}
                      {era?.src && <> Sound from <a href={era.src} target="_blank" rel="noreferrer" style={{ color: CREAM, textDecoration: "underline" }}>{era.srcName ?? sourceName(era.src)}</a>.</>}
                    </span>
                  </span>
                  <Seg />
                </div>

                {F && <div style={{ marginTop: -24 }}>{F}</div>}

                {media && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ position: "relative", width: "100%", aspectRatio: ytId(media) ? "16 / 9" : undefined, height: ytId(media) ? undefined : embedFor(media)?.h ?? 152, background: "#000" }}>
                      <iframe src={`${ytId(media) ? `https://www.youtube-nocookie.com/embed/${ytId(media)}?autoplay=1` : embedFor(media)?.src ?? ""}`} title="Player" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
                    </div>
                    <button onClick={() => setMedia(null)} style={{ alignSelf: "flex-start", border: 0, background: "none", color: MUTE, fontWeight: 700, cursor: "pointer", padding: 0 }}>Close the player</button>
                  </div>
                )}

                {popular.length > 0 && (
                  <Section title="Popular" note={`Most played${era ? ` · ${short(era)}` : ""} · tap to play`}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {popular.map((p, i) => {
                        const t: Track = { trackId: p.id, t: p.t, sub: `${p.album}${p.y ? ` · ${Math.floor(p.y)}` : ""}`, cover: coverUrl(p.albumId, "medium"), y: p.y };
                        const on = track?.trackId === p.id;
                        return (
                          <button key={p.id} onClick={() => { toggle(t); const r = a.releases.find((x) => x.albumId && x.albumId === p.albumId); if (r && !on) openItem("rel", r.id, r.y, false); }} className="a2-hl"
                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 6px", margin: "0 -6px", border: 0, cursor: "pointer", textAlign: "left", background: on ? "rgba(244,239,228,.06)" : "transparent" }}>
                            <span style={{ width: 18, fontWeight: 700, textAlign: "right", color: on ? accent : MUTE }}>{on && playing ? <Eq /> : i + 1}</span>
                            {p.albumId ? <img src={coverUrl(p.albumId, "small")!} alt="" loading="lazy" style={{ width: 40, height: 40, objectFit: "cover" }} /> : <span style={{ width: 40, height: 40, background: "#1a1a1a" }} />}
                            <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.3 }}><span style={{ fontWeight: 700, color: on ? accent : CREAM }}>{p.t}</span><span style={{ color: MUTE, fontSize: 13 }}>{p.album}</span></span>
                            {p.y && <span className="a2-lab" style={{ display: "flex", alignItems: "center", gap: 6, color: MUTE }}><span style={dot(p.y)} />{Math.floor(p.y)}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {relEra.length > 0 && (
                  <Section title="Releases" right={types.length > 1 ? (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {["all", ...types].map((t) => {
                        const n = relEra.filter((r) => ofType(r, t)).length;
                        const lab = t === "all" ? "All" : t === "ep" ? "EPs" : `${TYPE[t]}s`;
                        return <button key={t} aria-pressed={type === t} onClick={() => setType(t)} style={chipStyle(type === t)}>{lab} {n}</button>;
                      })}
                    </div>
                  ) : undefined}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "24px 18px" }}>
                      {(allRels ? releases : releases.slice(0, 12)).map((r) => {
                        const e = eraOfY(r.undated ? null : r.y);
                        const on = isFoc("rel", r.id);
                        const live = playing && !!r.trackId && track?.trackId === r.trackId;
                        const cv = coverUrl(r.albumId, "big");
                        return (
                          <button key={r.id} onClick={() => { openItem("rel", r.id, r.undated ? null : r.y); const t = relTrack(r); if (t) void play(t); }}
                            style={{ border: 0, padding: 0, background: "transparent", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}>
                            <span style={{ position: "relative", display: "block" }}>
                              {cv ? <img src={cv} alt={`${r.t} cover`} loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "1", objectFit: "cover", outline: on || live ? `2px solid ${CREAM}` : "none", boxShadow: on || live ? `6px 6px 0 ${e?.accent ?? accent}` : "none" }} />
                                : <span style={{ display: "flex", alignItems: "flex-end", width: "100%", aspectRatio: "1", boxSizing: "border-box", padding: 10, background: e?.bg ?? "#1a1a1a", color: e?.accent ?? CREAM, outline: on ? `2px solid ${CREAM}` : "none" }}><span className="a2-disp" style={{ fontSize: 16, lineHeight: 1 }}>{r.t}</span></span>}
                              {live && <span className="a2-lab" style={{ position: "absolute", left: 8, top: 8, background: accent, color: INK, padding: "2px 6px", display: "flex", gap: 6, alignItems: "center" }}><Eq />Playing</span>}
                            </span>
                            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 700 }}>{r.t}</span>
                              <span style={{ color: MUTE, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><span style={dot(r.undated ? null : r.y)} />{r.date} · {TYPE[r.type] ?? "Release"}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {releases.length > 12 && <button onClick={() => setAllRels((v) => !v)} style={{ ...chipStyle(false), alignSelf: "flex-start", height: 36 }}>{allRels ? "Fewer" : `All ${releases.length} releases`}</button>}
                    {releases.length === 0 && <p style={{ margin: 0, color: MUTE }}>No {type === "ep" ? "EPs" : `${TYPE[type] ?? ""}s`.toLowerCase()} from these years.</p>}
                  </Section>
                )}

                {watch.length > 0 && (
                  <Section title="Watch and listen" note={`${watch.length} videos and mixes${era ? ` · ${short(era)}` : ""}`}>
                    {feature && (
                      <button onClick={() => (feature.mix && !feature.img ? setMixOpen(feature.url) : setMedia(feature.url))} style={{ border: 0, padding: 0, background: "transparent", cursor: "pointer", textAlign: "left", display: "flex", flexWrap: "wrap", gap: "16px 24px", alignItems: "flex-end" }}>
                        <span style={{ position: "relative", display: "block", flex: "2 1 380px" }}>
                          <img src={feature.img!} alt="" loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }} />
                          <span className="a2-fade" style={{ position: "absolute", left: 16, bottom: 16, width: 56, height: 56, borderRadius: "50%", background: accent, color: INK, display: "flex", alignItems: "center", justifyContent: "center" }}>{playIcon(false, 20)}</span>
                        </span>
                        <span style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 4, paddingBottom: 6 }}>
                          <span className="a2-lab" style={{ color: accent }}>{feature.kind}</span>
                          <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25 }}>{feature.title}</span>
                          <span style={{ color: MUTE, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><span style={dot(feature.y)} />{feature.meta}</span>
                        </span>
                      </button>
                    )}
                    {watchRow.length > 0 && (
                      <div className="a2-row" style={{ display: "flex", gap: 16, overflowX: "auto" }}>
                        {watchRow.map((w) => (
                          <button key={w.key} onClick={() => (w.mix && (w.mix.tracks.length || !embedFor(w.url)) ? setMixOpen(mixOpen === w.url ? null : w.url) : embedFor(w.url) || ytId(w.url) ? setMedia(w.url) : window.open(w.url, "_blank", "noopener"))}
                            style={{ border: 0, padding: 0, background: "transparent", textAlign: "left", cursor: "pointer", flex: "0 0 210px", display: "flex", flexDirection: "column", gap: 6 }}>
                            {w.img ? <img src={w.img} alt="" loading="lazy" style={{ display: "block", width: 210, aspectRatio: "16 / 9", objectFit: "cover" }} />
                              : <span className="a2-disp" style={{ display: "flex", alignItems: "flex-end", width: 210, aspectRatio: "16 / 9", boxSizing: "border-box", padding: 10, background: eraOfY(w.y)?.bg ?? "#1a1a1a", color: eraOfY(w.y)?.accent ?? CREAM, fontSize: 16, lineHeight: 1.05 }}>{w.kind.toUpperCase()}</span>}
                            <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{w.title}</span>
                            <span style={{ color: MUTE, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><span style={dot(w.y)} />{w.kind} · {w.meta}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {mixOpen && (() => {
                      const m = a.mixes.find((x) => x.url === mixOpen);
                      return m ? <MixList m={m} onPlay={embedFor(m.url) ? () => setMedia(m.url) : undefined} /> : null;
                    })()}
                  </Section>
                )}

                {shows.length > 0 && (
                  <Section title="Shows" note={`${shows.length} past shows${era ? ` · ${short(era)}` : ""}`}>
                    <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${RULE}` }}>
                      {(allShows ? shows : shows.slice(0, 8)).map((s) => {
                        const e = eraOfY(s.y) ;
                        const fo = isFoc("show", s.id);
                        const w = !!was[s.id];
                        const n = wasCounts?.[s.id] ?? 0;
                        const ac = e?.accent ?? accent;
                        return (
                          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 8px", margin: "0 -8px", borderBottom: `1px solid ${RULE}`, background: fo ? "rgba(244,239,228,.06)" : "transparent", boxShadow: fo ? `inset 3px 0 0 ${ac}` : "none" }}>
                            <span style={{ width: 58, flex: "0 0 58px", display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                              <span className="a2-lab" style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={dot(s.y)} />{Math.floor(s.y)}</span>
                              <span style={{ color: MUTE, fontSize: 12 }}>{s.day ? new Date(`${s.day}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</span>
                            </span>
                            <button onClick={() => openItem("show", s.id, s.y)} style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.35, border: 0, background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}>
                              <span style={{ fontWeight: 700 }}>{s.t}</span><span style={{ color: MUTE, fontSize: 13 }}>{s.sub}</span>
                            </button>
                            <button aria-pressed={w} aria-label="I was there" onClick={() => void toggleWas(s.id)} className="a2-ph" style={{ width: 40, height: 40, flex: "0 0 40px", border: `1px solid ${w ? ac : "rgba(244,239,228,.4)"}`, fontWeight: 700, fontSize: 16, cursor: "pointer", background: w ? ac : "transparent", color: w ? INK : CREAM }}>{w ? "✓" : "+"}</button>
                            <button aria-pressed={w} onClick={() => void toggleWas(s.id)} className="a2-dk" style={{ height: 34, padding: "0 12px", border: `1px solid ${w ? ac : "rgba(244,239,228,.4)"}`, fontWeight: 700, fontSize: 13, cursor: "pointer", background: w ? ac : "transparent", color: w ? INK : CREAM }}>
                              {w ? "I was there ✓" : "I was there"}{n > 0 ? ` · ${n}` : ""}
                            </button>
                            <button onClick={() => openItem("show", s.id, s.y)} className="a2-dk" style={{ height: 34, padding: "0 6px", border: 0, background: "transparent", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "rgba(244,239,228,.75)" }}>More ›</button>
                          </div>
                        );
                      })}
                    </div>
                    {shows.length > 8 && <button onClick={() => setAllShows((v) => !v)} style={{ ...chipStyle(false), alignSelf: "flex-start", height: 36 }}>{allShows ? "Fewer" : `All ${shows.length} shows`}</button>}
                  </Section>
                )}

                {press.length > 0 && (
                  <Section title="Press" note={`${press.length} stories${era ? ` · ${short(era)}` : ""}`}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", columnGap: 32 }}>
                      {press.slice(0, 12).map((x) => (
                        <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="a2-hl" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "14px 0", borderTop: `1px solid ${RULE}` }}>
                          <span className="a2-lab" style={{ color: MUTE, display: "flex", alignItems: "center", gap: 6 }}><span style={dot(x.y)} />{x.publication}{x.date ? ` · ${x.date}` : ""}</span>
                          <span style={{ fontWeight: 700, lineHeight: 1.35 }}>{x.title} ↗</span>
                        </a>
                      ))}
                    </div>
                  </Section>
                )}

                {tabs.length > 0 && (
                  <Section title="Connections" right={
                    <div role="tablist" aria-label="Connections" className="a2-row" style={{ display: "flex", gap: 4, overflowX: "auto", maxWidth: "100%" }}>
                      {tabs.map((t) => <button key={t.id} role="tab" aria-selected={tabId === t.id} onClick={() => setTab(t.id)} style={chipStyle(tabId === t.id)}>{t.label} {t.n}</button>)}
                    </div>
                  }>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                      {(tabId === "labels" || tabId === "crews") && a.groups.filter((g) => g.kind === (tabId === "labels" ? "label" : "collective")).map((g) => (
                        <ConnCard key={g.name} name={g.name} what={g.kind === "label" ? (g.releases ? `Label · ${g.releases} release${g.releases === 1 ? "" : "s"}` : "Label") : "Crew or band"} years={g.years} url={g.url} accent={accent}
                          peers={g.peers} />
                      ))}
                      {tabId === "worked" && a.worked.map((w) => <ConnCard key={w.name} name={w.name} what={w.note} url={w.slug ? `/artists/${w.slug}` : w.url} img={w.img} accent={accent} internal={!!w.slug} />)}
                      {tabId === "fests" && a.festivals.map((f) => <ConnCard key={f.name} name={f.name} what="Festival" years={f.years} url={f.url} accent={accent} />)}
                      {tabId === "played" && a.playedWith.map((c) => <ConnCard key={c.slug} name={displayName(c.name)} what={c.why} url={`/artists/${c.slug}`} img={c.img} accent={accent} internal />)}
                    </div>
                  </Section>
                )}

                {a.alsoLike.length > 0 && (
                  <Section title="Fans also like" note="On CCD · shared label, bill or scene">
                    <div className="a2-row" style={{ display: "flex", gap: 22, overflowX: "auto", paddingBottom: 6 }}>
                      {a.alsoLike.filter((x) => x.img).map((x) => (
                        <a key={x.n} href={x.u ?? "#"} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 132, flex: "0 0 132px", textAlign: "center" }}>
                          <img src={x.img!} alt={displayName(x.n)} loading="lazy" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", display: "block", border: `2px solid ${CREAM}`, boxShadow: `4px 4px 0 ${accent}` }} />
                          <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{displayName(x.n)}</span>
                          <span style={{ color: MUTE, fontSize: 12, lineHeight: 1.3 }}>{x.why}</span>
                        </a>
                      ))}
                    </div>
                  </Section>
                )}
              </div>

              {/* ── Side column ── */}
              <aside style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 28, paddingTop: 26 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, border: "1px solid rgba(244,239,228,.2)" }}>
                  <span className="a2-disp" style={{ fontSize: 18 }}>UPCOMING</span>
                  {showUpcoming.length > 0 ? showUpcoming.map((u) => (
                    <a key={u.key} href={u.url ?? "#"} target={u.url?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" style={{ display: "flex", gap: 12, alignItems: "center", padding: "6px 0", borderTop: `1px solid ${RULE}` }}>
                      <span className="a2-lab" style={{ color: accent, width: 56, flex: "0 0 56px" }}>{u.date ? new Date(`${u.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</span>
                      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}><span style={{ fontWeight: 700 }}>{u.t}</span><span style={{ color: MUTE, fontSize: 12 }}>{u.sub}</span></span>
                    </a>
                  )) : <span style={{ color: MUTE, fontSize: 14 }}>No dates announced. We list {name}&apos;s shows here as soon as they are confirmed.</span>}
                  {a.touring.map((t, i) => <span key={`t${i}`} style={{ fontSize: 13 }}><strong>Touring {t.city}</strong> <span style={{ color: MUTE }}>{fmtDay(t.from)}{t.to !== t.from ? ` to ${fmtDay(t.to)}` : ""}</span></span>)}
                  <button aria-pressed={following} onClick={remind} className="a2-btn" style={{ ...btn(following ? accent : "transparent", following ? INK : accent, accent, 42), height: "auto", minHeight: 42, padding: "8px 14px", whiteSpace: "normal", textAlign: "left", fontSize: 14 }}>
                    {following ? "We'll tell you ✓" : `Remind me when ${name} plays`}
                  </button>
                  {alertNote && !member ? (
                    <span style={{ fontSize: 12, color: MUTE }}>Saved on this device. <a href="/join" style={{ color: CREAM, fontWeight: 700, textDecoration: "underline" }}>Join free</a> to get the message.</span>
                  ) : <span style={{ color: MUTE, fontSize: 12 }}>One message when {name} announces a show. Nothing else.</span>}
                </div>
                {a.bookable && (
                  <div id="book" style={{ border: `2px solid ${CREAM}`, boxShadow: `0 0 0 1px ${accent}`, padding: 18, display: "flex", flexDirection: "column", gap: 10, background: "#141414" }}>
                    <span className="a2-disp" style={{ fontSize: 19 }}>BOOK {name.toUpperCase()}</span>
                    <span style={{ color: MUTE, fontSize: 14 }}>Live set or DJ set. Send the date, city and room. CCD replies with availability and a quote.</span>
                    {/* The booking desk drawer. Opens itself on ?book=1&date=&city= links from On tour. */}
                    <BookButton fromQuery artist={{ slug: a.slug, name, photo_url: a.photo, city: a.city, sound: a.genres.slice(0, 2).join(", ") || undefined }}
                      label="Ask for a date" className="a2-btn"
                      style={{ height: 44, background: accent, color: INK, border: `2px solid ${accent}`, fontWeight: 700, cursor: "pointer", fontSize: 14 }} />
                    <a href={productLink("artists", `/${a.slug}`)} style={{ fontSize: 13, fontWeight: 700, display: "inline-block", lineHeight: "24px" }}>Press kit ↗</a>
                  </div>
                )}
                {a.ccdNights.some((n) => !n.upcoming) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="a2-lab" style={{ color: MUTE }}>Played Cats Can Dance</span>
                    {a.ccdNights.filter((n) => !n.upcoming).map((n) => <a key={n.slug} href={n.url} style={{ fontWeight: 700, fontSize: 14 }}>{n.title}{n.date ? ` · ${n.date.slice(0, 4)}` : ""} ›</a>)}
                  </div>
                )}
                {photos.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span className="a2-lab" style={{ color: MUTE }}>Photos</span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                      {photos.slice(0, 6).map((u, i) => { const ph = a.photos.find((x) => x.url === u); return <img key={u} src={u} alt={ph?.caption ?? `${name} ${i + 1}`} loading="lazy" title={ph?.credit ? `Photo: ${ph.credit}` : undefined} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />; })}
                    </div>
                  </div>
                )}
              </aside>
            </div>

            <footer className="a2-pad" style={{ paddingTop: 18, paddingBottom: 110, fontSize: 13, color: MUTE, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderTop: `1px solid ${RULE}` }}>
              <span>Compiled by Cats Can Dance from press, labels and listings. Every line links to its source. Previews from Deezer.</span>
              <span style={{ display: "flex", gap: 16, flexWrap: "wrap", fontWeight: 700, lineHeight: "24px" }}>
                <a href="/artists">All artists</a>
                {!a.claimed && <a href={`/for-artists?claim=${encodeURIComponent(a.slug)}#claim`} style={{ color: CREAM }}>Are you {name}? Claim this page</a>}
              </span>
            </footer>
          </main>
        </div>

        {/* ── Player bar ── */}
        {/* On phones the bar waits until something plays, so it does not cover Start here and Follow on first view. */}
        {track && (
          <div className={`a2-fade a2-pad${cur ? "" : " a2-idlebar"}`} style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, display: cur ? "flex" : undefined, alignItems: "center", gap: 14, paddingTop: 10, paddingBottom: 10, background: "rgba(12,12,12,.97)", borderTop: "1px solid rgba(244,239,228,.2)", boxShadow: `0 -1px 0 ${accent}` }}>
            {track.cover ? <img src={track.cover} alt="" style={{ width: 44, height: 44, objectFit: "cover", flex: "0 0 44px" }} /> : <span style={{ width: 44, height: 44, flex: "0 0 44px", background: tint }} />}
            <span style={{ flex: "1 1 160px", maxWidth: 300, minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
              <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.t}</span>
              <span style={{ color: MUTE, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{audioErr ?? track.sub}</span>
            </span>
            <button aria-label={playing ? "Pause" : `Play ${track.t}`} onClick={() => toggle(track)} style={{ width: 42, height: 42, flex: "0 0 42px", borderRadius: "50%", border: 0, background: accent, color: INK, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{playIcon(playing, 16)}</button>
            {queue && (
              <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                <span className="a2-lab" style={{ color: accent, whiteSpace: "nowrap" }}><span className="a2-dk">Start here&nbsp;</span>{queue.i + 1} of {queue.list.length}</span>
                {queue.i + 1 < queue.list.length && <button onClick={next} style={{ height: 32, padding: "0 10px", border: `1px solid ${accent}`, background: "transparent", color: accent, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Next ›</button>}
              </span>
            )}
            <span className="a2-ph" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3, background: "rgba(244,239,228,.15)" }}>
              <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round(prog * 100)}%`, background: accent }} />
            </span>
            <span className="a2-dk" style={{ flex: "1 1 120px", height: 4, background: "rgba(244,239,228,.15)", position: "relative", minWidth: 60 }}>
              <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round(prog * 100)}%`, background: accent }} />
            </span>
            <span className="a2-lab a2-dk" style={{ color: MUTE, whiteSpace: "nowrap" }}>30s preview</span>
            {eraOfY(track.y) && <span className="a2-lab a2-dk" style={{ alignItems: "center", gap: 6, color: accent, whiteSpace: "nowrap" }}><span style={dot(track.y)} />{eraOfY(track.y)!.label}</span>}
          </div>
        )}
      </div>
    </>
  );
}

// ── Small pieces ───────────────────────────────────────────────────────────
function btn(bg: string, fg: string, bd: string, h = 40): CSSProperties {
  return { height: h, padding: "0 14px", border: `1px solid ${bd}`, background: bg, color: fg, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", boxSizing: "border-box" };
}
const Eq = () => <span className="a2-eq" aria-hidden="true"><span /><span /><span /></span>;

function FocusBox({ accent, tint, onClose, img, wide, ph, kicker, title, sub, children }: {
  accent: string; tint: string; onClose: () => void; img: string | null; wide?: boolean; ph: string; kicker: string; title: string; sub: string; children: ReactNode;
}) {
  return (
    <section aria-live="polite" className="a2-fade" style={{ padding: 22, border: `2px solid ${CREAM}`, boxShadow: `8px 8px 0 ${accent}`, background: `linear-gradient(135deg, ${tint} 0%, #141414 70%)` }}>
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-start" }}>
        {img ? <img src={img} alt="" style={{ width: wide ? 300 : 200, maxWidth: "100%", aspectRatio: wide ? "16 / 9" : "1", objectFit: "cover", flex: "0 0 auto" }} />
          : <span className="a2-disp" style={{ width: 160, height: 160, flex: "0 0 160px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, background: tint, color: accent, border: `1px solid ${accent}` }}>{ph}</span>}
        <div style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="a2-lab" style={{ color: accent }}>{kicker}</span>
          <span className="a2-disp" style={{ fontSize: 30, lineHeight: 1.02 }}>{title}</span>
          {sub && <span style={{ color: MUTE, fontSize: 14 }}>{sub}</span>}
          {children}
        </div>
        <button onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, border: "1px solid rgba(244,239,228,.3)", background: "transparent", cursor: "pointer" }}>✕</button>
      </div>
    </section>
  );
}

function LinkBtns({ links }: { links: LinkOut[] }) {
  return <>{links.slice(0, 4).map((l) => <a key={l.url} className="a2-btn" href={l.url} target="_blank" rel="noreferrer" style={btn("transparent", CREAM, "rgba(244,239,228,.4)")}>{l.label} ↗</a>)}</>;
}

function Also({ rel, accent, onMedia, onMix, mixOpen }: {
  rel: { videos: Video[]; press: PressItem[]; mixes: Mix[] }; accent: string; onMedia: (u: string) => void; onMix?: (u: string | null) => void; mixOpen?: string | null;
}) {
  if (!rel.videos.length && !rel.press.length && !rel.mixes.length) return null;
  const open = rel.mixes.find((m) => m.url === mixOpen);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, paddingTop: 12, borderTop: `1px solid ${RULE}` }}>
      <span className="a2-lab" style={{ color: MUTE }}>Also from this</span>
      {rel.videos.map((v) => (
        <button key={v.url} onClick={() => onMedia(v.url)} style={{ display: "flex", gap: 8, border: 0, background: "none", padding: 0, cursor: "pointer", textAlign: "left", fontSize: 14 }}>
          <span className="a2-lab" style={{ color: accent, paddingTop: 2 }}>Video</span><span style={{ fontWeight: 700 }}>{v.title}</span>
        </button>
      ))}
      {rel.mixes.map((m) => (
        <button key={m.url} onClick={() => (m.tracks.length && onMix ? onMix(mixOpen === m.url ? null : m.url) : window.open(m.url, "_blank", "noopener"))} style={{ display: "flex", gap: 8, border: 0, background: "none", padding: 0, cursor: "pointer", textAlign: "left", fontSize: 14 }}>
          <span className="a2-lab" style={{ color: accent, paddingTop: 2 }}>Mix</span><span style={{ fontWeight: 700 }}>{m.title}{m.tracks.length ? ` · ${m.tracks.length} tracks` : " ↗"}</span>
        </button>
      ))}
      {open && <MixList m={open} />}
      {rel.press.map((x) => (
        <a key={x.url} href={x.url} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 8, fontSize: 14 }}>
          <span className="a2-lab" style={{ color: accent, paddingTop: 2 }}>Press</span><span style={{ fontWeight: 700 }}>{x.publication}: {x.title} ↗</span>
        </a>
      ))}
    </div>
  );
}

function MixList({ m, onPlay }: { m: Mix; onPlay?: () => void }) {
  return (
    <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <span className="a2-lab" style={{ color: MUTE }}>{m.title} · tracklist</span>
        {onPlay && <button onClick={onPlay} style={{ border: 0, background: "none", padding: 0, fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Play the mix</button>}
        <a href={m.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 13 }}>{sourceName(m.url) ?? "Source"} ↗</a>
      </span>
      {m.tracks.map((t, i) => (
        <span key={`${i}${t.title}`} style={{ fontSize: 14, display: "flex", gap: 10, padding: "3px 0" }}>
          <span style={{ color: MUTE, width: 20, textAlign: "right", flex: "0 0 20px" }}>{i + 1}</span>
          <span><span style={{ fontWeight: 700 }}>{t.title}</span> <span style={{ color: MUTE }}>{t.artist}</span></span>
        </span>
      ))}
    </div>
  );
}

function ConnCard({ name, what, years, url, img, accent, peers, internal }: {
  name: string; what: string; years?: string | null; url: string | null; img?: string | null; accent: string; peers?: { slug: string; name: string; img: string | null }[]; internal?: boolean;
}) {
  const ini = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  const inner = (
    <>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {img ? <img src={img} alt="" loading="lazy" style={{ width: 40, height: 40, flex: "0 0 40px", objectFit: "cover", borderRadius: "50%" }} />
          : <span className="a2-disp" style={{ width: 40, height: 40, flex: "0 0 40px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "#1c1c1c", color: accent, border: `1px solid ${accent}` }}>{ini}</span>}
        <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
          <span style={{ fontWeight: 700 }}>{name}{url && !internal ? " ↗" : ""}</span>
          <span style={{ color: MUTE, fontSize: 12 }}>{what}</span>
        </span>
        {years && <span className="a2-lab" style={{ color: MUTE }}>{years}</span>}
      </span>
      {peers && peers.length > 0 && (
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
          <span style={{ color: MUTE }}>Also on CCD</span>
          {peers.map((p) => <a key={p.slug} href={`/artists/${p.slug}`} style={{ fontWeight: 700, padding: "4px 8px", minHeight: 24, display: "inline-flex", alignItems: "center", border: "1px solid rgba(244,239,228,.4)" }}>{displayName(p.name)}</a>)}
        </span>
      )}
    </>
  );
  const style: CSSProperties = { display: "flex", flexDirection: "column", gap: 10, padding: 12, border: "1px solid rgba(244,239,228,.14)" };
  // A card with peers holds links of its own, so it is not itself a link.
  if (!url || (peers && peers.length)) return <div className="a2-hl" style={style}>{inner}{url && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: MUTE, minHeight: 24, display: "inline-flex", alignItems: "center", alignSelf: "flex-start" }}>Source ↗</a>}</div>;
  return <a href={url} target={internal ? undefined : "_blank"} rel="noreferrer" className="a2-hl" style={style}>{inner}</a>;
}

function Icon({ label }: { label: string }) {
  const s = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true } as const;
  switch (label) {
    case "Instagram": return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>;
    case "Spotify": return <svg {...s} strokeLinecap="round"><circle cx="12" cy="12" r="9.5" /><path d="M7 9.5c3.5-1 7-.6 10 1" /><path d="M7.6 12.6c3-.8 5.8-.4 8.4.9" /><path d="M8.2 15.5c2.4-.6 4.6-.3 6.6.7" /></svg>;
    case "SoundCloud": return <svg {...s} strokeLinejoin="round"><path d="M10 17h8.5a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9-1.5z" /><path d="M3 17v-4M6 17v-6M8 17V9" strokeLinecap="round" /></svg>;
    case "Bandcamp": return <svg width={17} height={17} viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h14l-6 12H2z" fill="currentColor" /></svg>;
    case "YouTube": return <svg {...s}><rect x="2.5" y="5.5" width="19" height="13" rx="3.5" /><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" /></svg>;
    case "Mixcloud": return <svg {...s} strokeLinejoin="round"><path d="M6 17h11a3.5 3.5 0 0 0 .5-7A5.5 5.5 0 0 0 7 10.5 3.3 3.3 0 0 0 6 17z" /></svg>;
    case "RA": return <span style={{ fontWeight: 700, fontSize: 12 }}>RA</span>;
    case "Website": return <svg {...s}><circle cx="12" cy="12" r="9.5" /><path d="M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19" /></svg>;
    default: return <span style={{ fontWeight: 700, fontSize: 11 }}>{label.slice(0, 2).toUpperCase()}</span>;
  }
}
