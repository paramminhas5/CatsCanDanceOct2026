"use client";
/**
 * Artist page v2 (design board I), CCD skin. The timeline scrubber is the player: wherever you are in
 * the career, the dock plays the release from then (Deezer 30s preview) and the THEN block pulls that
 * era's releases, shows, videos, mixes and press to the top. Hold and drag to zoom into five years,
 * let go to snap to the nearest moment. Phone layout with a sticky dock; desktop layout with a dark
 * timeline rail on the left, under the site nav. Everything shown comes from a sourced row.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent, KeyboardEvent as RKeyboardEvent, CSSProperties, ReactNode } from "react";
import { useMember, memberRpc } from "@/lib/member";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic";
import {
  type ArtistV2, type Moment, type Era, type Palette, type Release, type Video, type Mix, type PressItem, type LinkOut,
  PALETTES, coverUrl, sourceName, displayName, embedFor,
} from "@/lib/artist-v2";

const BookButton = dynamic(() => import("@/components/booking/BookButton"), { ssr: false });

const KL: Record<Moment["kind"], string> = { rel: "RELEASE", mile: "MOMENT", show: "SHOW" };
const ENERGY: Record<string, number> = { night: 46, blush: 56, ink: 30, cream: 40 };
const SITE = "https://catscandance.com";
const LS_FOLLOW = "ccd_followed_artists";
const LS_WAS = "ccd_i_was_there";
const CREAM = "#f4efe4", INK = "#111111", RED = "#dc2626", ACID = "#b6ef36", BLUE = "#2563eb";
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

type Shape = { w: number; h: number; r: string; c: string; b: string; rot: number };
function shape(kind: Moment["kind"], dark: boolean, hot: boolean): Shape {
  const ink = dark ? CREAM : "#1d1416";
  const show = dark ? ACID : RED;
  if (kind === "rel") return { w: hot ? 9 : 6, h: hot ? 9 : 6, r: "50%", c: ink, b: "0", rot: 0 };
  if (kind === "show") return { w: 3, h: hot ? 13 : 9, r: "1px", c: show, b: "0", rot: 0 };
  return { w: hot ? 7 : 5, h: hot ? 7 : 5, r: "0", c: "transparent", b: `1.5px solid ${ink}`, rot: 45 };
}
const Mark = ({ s, style }: { s: Shape; style?: CSSProperties }) => (
  <span aria-hidden="true" style={{ display: "inline-block", flex: "0 0 auto", width: s.w, height: s.h, background: s.c, borderRadius: s.r, border: s.b, transform: `rotate(${s.rot}deg)`, ...style }} />
);

function eraAt(eras: Era[], y: number): { era: Era; i: number } {
  let i = 0;
  for (let k = 0; k < eras.length; k++) if (eras[k].from <= y) i = k;
  return { era: eras[i], i };
}

const Img = ({ src, size, alt = "", style }: { src: string | null; size: number | string; alt?: string; style?: CSSProperties }) =>
  src ? <img src={src} alt={alt} loading="lazy" style={{ width: size, height: size, objectFit: "cover", display: "block", ...style }} /> : null;

const ext = (u: string | null | undefined) => !!u && /^https?:/.test(u);
const ytId = (u: string | null | undefined) => (u ? /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(u)?.[1] ?? null : null);
const fmtN = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}k` : String(n));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Words that do not identify a show on their own.
const STOP = new Set(["festival", "presents", "present", "feat", "featuring", "with", "live", "the", "and", "night", "party", "tour", "event", "edition", "special", "guests", "plus", "music", "debut", "india", "from", "this", "that", "at"]);
const toks = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w) && !/^(19|20)\d{2}$/.test(w));

export default function ArtistPageV2({ a }: { a: ArtistV2 }) {
  const EV = a.moments;
  const Y0 = a.y0;
  const Y1 = a.y1;
  const SPAN = Math.max(1, Y1 - Y0);
  const ZW = Math.min(5, Math.max(2, SPAN * 0.6));

  const [yf, setYf] = useState(Y1);
  const [sel, setSel] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const [center, setCenter] = useState(Y1);
  const [share, setShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const [pop, setPop] = useState<number | null>(null);
  const [allReleases, setAllReleases] = useState(false);
  const [embed, setEmbed] = useState(false);
  const [following, setFollowing] = useState(false);
  const [alertNote, setAlertNote] = useState(false);
  const [audioErr, setAudioErr] = useState<string | null>(null);
  const [bioOpen, setBioOpen] = useState(false);
  const [storyAll, setStoryAll] = useState(false);
  const [showsAll, setShowsAll] = useState(false);
  const [watchAll, setWatchAll] = useState(false);
  const [pressAll, setPressAll] = useState(false);
  const [openShows, setOpenShows] = useState<Record<string, boolean>>({});
  const [playingMedia, setPlayingMedia] = useState<string | null>(null);
  const [openTracks, setOpenTracks] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [was, setWas] = useState<Record<string, boolean>>({});
  const [wasCounts, setWasCounts] = useState<Record<string, number> | null>(null);
  const [wasNote, setWasNote] = useState<string | null>(null);
  const [navH, setNavH] = useState(72);

  const audio = useRef<HTMLAudioElement | null>(null);
  const loadedTrack = useRef<string | null>(null);
  const drag = useRef<{ x0: number; y0: number; left: number; w: number; moved: boolean } | null>(null);
  const holdT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { member } = useMember();

  // The site nav is fixed; measure it so the hero and the desktop rail start below it.
  useEffect(() => {
    const measure = () => { const h = document.querySelector("header.fixed")?.getBoundingClientRect().height; if (h) setNavH(Math.round(h)); };
    measure();
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 300);
    return () => { window.removeEventListener("resize", measure); clearTimeout(t); };
  }, []);

  // Open at a shared moment: /artists/slug?at=<moment id>
  useEffect(() => {
    try {
      const at = new URLSearchParams(window.location.search).get("at");
      const m = at ? EV.find((e) => e.id === at) : null;
      if (m) { setSel(m.id); setYf(m.y); setCenter(m.y); }
      setFollowing((JSON.parse(localStorage.getItem(LS_FOLLOW) ?? "[]") as string[]).includes(a.slug));
      const local = (JSON.parse(localStorage.getItem(LS_WAS) ?? "{}") as Record<string, string[]>)[a.slug] ?? [];
      if (local.length) setWas(Object.fromEntries(local.map((id) => [id, true])));
    } catch { /* storage can be blocked */ }
  }, [EV, a.slug]);

  // I was there: public counts (hidden when the RPC is not there yet) and a member's own marks.
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

  // ── Derived state ─────────────────────────────────────────────────────────
  const year = Math.min(new Date().getFullYear(), Math.floor(yf));
  const { era, i: ei } = eraAt(a.eras, yf);
  const p: Palette = PALETTES[era.palette];
  const passed = EV.filter((e) => e.y <= yf + 0.005);
  const nearest = useCallback((y: number) => EV.reduce((acc, e) => (Math.abs(e.y - y) < Math.abs(acc.y - y) ? e : acc), EV[0]), [EV]);
  const pick: Moment | undefined = EV.find((e) => e.id === sel) ?? passed[passed.length - 1] ?? EV[0];
  const shown = zoom && EV.length ? nearest(yf) : pick;
  const rels = EV.filter((e) => e.kind === "rel");
  const relNow = passed.filter((e) => e.kind === "rel").pop() ?? rels[0];
  const playableAll = a.releases.filter((r) => r.trackId && !r.undated).sort((x, y) => x.y - y.y);
  const playable: Release | Moment | undefined =
    passed.filter((e) => e.kind === "rel" && e.trackId).pop() ??
    playableAll.filter((r) => r.y <= yf + 0.005).pop() ??
    playableAll[0];
  const popNow = pop != null ? a.popular[pop] : null;
  const nothingPlayable = !playable && a.popular.length === 0;
  const mixPlay = a.mixes.find((m) => embedFor(m.url)) ?? null;

  const dockTrackId = popNow ? popNow.id : playable?.trackId ?? null;
  const dock = popNow
    ? { t: popNow.t, sub: `${popNow.album} · 30s preview`, cover: coverUrl(popNow.albumId, "medium"), fill: "#333" }
    : playable
      ? {
          t: playable.track ?? playable.t,
          sub: `${playable.t} · ${playable.date}${relNow && relNow.id !== playable.id && !relNow.trackId ? ` · ${relNow.t} is not on streaming` : ""}`,
          cover: coverUrl(playable.albumId, "medium"), fill: playable.fill || "#333",
        }
      : a.spotify || a.soundcloud
        ? { t: "Listen", sub: a.spotify ? "Spotify" : "SoundCloud", cover: null, fill: "#333" }
        : mixPlay
          ? { t: mixPlay.title, sub: sourceName(mixPlay.url) ?? "Mix", cover: null, fill: "#333" }
          : { t: "Their story so far", sub: "Drag through the years", cover: null, fill: "#333" };

  const heroCover = relNow ? coverUrl(relNow.albumId, "xl") : null;
  const heroBig = heroCover ?? a.photo;
  const curCover = relNow ? coverUrl(relNow.albumId, "big") : null;

  // ── Audio ─────────────────────────────────────────────────────────────────
  const stop = useCallback(() => { audio.current?.pause(); setPlaying(false); }, []);
  const playTrack = useCallback(async (trackId: string, restart: boolean) => {
    const el = audio.current;
    if (!el) return;
    setAudioErr(null);
    try {
      if (loadedTrack.current !== trackId) {
        const r = await fetch(`/api/deezer/track/${trackId}`);
        if (!r.ok) throw new Error("no preview");
        const j = await r.json();
        el.src = j.preview;
        loadedTrack.current = trackId;
      } else if (restart || el.ended) el.currentTime = 0;
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setAudioErr("Preview not available");
    }
  }, []);
  const embedSrc = a.spotify && /open\.spotify\.com\/artist\/([A-Za-z0-9]+)/.test(a.spotify)
    ? `https://open.spotify.com/embed/artist/${/artist\/([A-Za-z0-9]+)/.exec(a.spotify)![1]}?utm_source=generator&theme=0`
    : a.soundcloud ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(a.soundcloud)}&color=%23b6ef36&visual=false` : null;
  const playEmbed: { src: string; h: number } | null = embedSrc ? { src: embedSrc, h: 152 } : embedFor(mixPlay?.url);
  const togglePlay = () => {
    if (playing) return stop();
    if (dockTrackId) return void playTrack(dockTrackId, false);
    if (playEmbed) setEmbed((v) => !v);
  };
  // Scrubbing to another release while playing switches the record.
  useEffect(() => {
    if (playing && dockTrackId && loadedTrack.current !== dockTrackId) void playTrack(dockTrackId, true);
  }, [dockTrackId, playing, playTrack]);
  // Starting a video or mix stops the preview.
  useEffect(() => { if (playingMedia) stop(); }, [playingMedia, stop]);

  // ── Selection and scrubbing ───────────────────────────────────────────────
  const buzz = () => { try { navigator.vibrate?.(8); } catch { /* not supported */ } };
  const select = (e: Moment, opts?: { buzz?: boolean }) => {
    setSel(e.id); setYf(e.y); setCenter(e.y); setPop(null);
    if (e.kind === "rel") setAllReleases((v) => v || !a.releases.find((r) => r.id === e.id)?.onTimeline);
    if (opts?.buzz) buzz();
  };
  const step = (dir: number) => {
    if (!EV.length) return;
    const i = pick ? EV.indexOf(pick) : EV.length - 1;
    select(EV[Math.min(EV.length - 1, Math.max(0, i + dir))], { buzz: true });
  };
  const jumpEra = (k: number) => {
    const e = a.eras[k];
    const hi = (e.to ?? 9999) + 1;
    const inside = EV.filter((m) => m.y >= e.from && m.y < hi);
    if (inside.length) select(inside[inside.length - 1]);
    else { const y = Math.min(Y1, Math.max(Y0, e.from + 0.5)); setYf(y); setSel(null); setCenter(y); }
  };

  const c = Math.min(Y1 - ZW / 2, Math.max(Y0 + ZW / 2, center));
  const w0 = zoom ? c - ZW / 2 : Y0;
  const w1 = zoom ? c + ZW / 2 : Y1;
  const X = (y: number) => ((y - w0) / (w1 - w0)) * 100;

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
    drag.current = { x0: e.clientX, y0: yf, left: r.left, w: r.width, moved: false };
    holdT.current = setTimeout(() => { if (drag.current) { setZoom(true); setCenter(drag.current.y0); } }, 160);
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    if (Math.abs(dx) > 4) d.moved = true;
    if (!d.moved) return;
    const span = zoom ? ZW : SPAN;
    const ny = Math.min(Y1, Math.max(Y0, d.y0 + (dx / d.w) * span));
    let cc = center;
    if (!zoom) { if (holdT.current) clearTimeout(holdT.current); setZoom(true); cc = d.y0; }
    const edge = Math.abs(ny - cc) > ZW / 2 - 0.4;
    if (edge) { d.x0 = e.clientX; d.y0 = ny; }
    setYf(ny); setSel(null); setCenter(edge ? ny : cc);
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (holdT.current) clearTimeout(holdT.current);
    if (!d) return;
    setZoom(false);
    if (!EV.length) return;
    if (!d.moved) {
      const ty = Y0 + ((e.clientX - d.left) / d.w) * SPAN;
      const n = nearest(ty);
      if (Math.abs(n.y - ty) < 0.8) select(n, { buzz: true }); else { setYf(ty); setSel(null); setCenter(ty); }
      return;
    }
    const n = nearest(yf);
    if (Math.abs(n.y - yf) < 0.6) select(n, { buzz: true }); else setCenter(yf);
  };
  const onKey = (e: RKeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); step(-1); }
    if (e.key === "Home" && EV.length) { e.preventDefault(); select(EV[0]); }
    if (e.key === "End" && EV.length) { e.preventDefault(); select(EV[EV.length - 1]); }
  };

  const marks = EV.filter((e) => e.y >= w0 - 0.01 && e.y <= w1 + 0.01).map((e) => {
    const hot = !!shown && e.id === shown.id;
    const sh = shape(e.kind, true, hot);
    if (!hot && e.y > yf + 0.01) {
      if (sh.c !== "transparent") sh.c = "rgba(244,239,228,0.35)";
      if (e.kind === "mile") sh.b = "1.5px solid rgba(244,239,228,0.35)";
    }
    return { id: e.id, left: Math.min(99, Math.max(1, X(e.y))), sh };
  });
  const bars = useMemo(() => {
    const out: { h: number; c: string }[] = [];
    for (let i = 0; i < 60; i++) {
      const by = w0 + (i / 59) * (w1 - w0);
      const er = eraAt(a.eras, by);
      const k = Math.abs(Math.sin(by * 7.3) * 0.55 + Math.sin(by * 1.9) * 0.45);
      const energy = ENERGY[er.era.palette] ?? 40;
      const h = Math.round((zoom ? 6 : 4) + energy * (0.18 + k * 0.3) * (zoom ? 1.35 : 1));
      out.push({ h, c: by <= yf + 0.005 ? PALETTES[er.era.palette].wave : "rgba(244,239,228,0.16)" });
    }
    return out;
  }, [w0, w1, yf, zoom, a.eras]);
  const ticks: { n: number; left: number }[] = [];
  if (zoom) for (let y = Math.ceil(w0); y <= Math.floor(w1); y++) ticks.push({ n: y, left: X(y) });
  else {
    const stepY = SPAN > 12 ? 4 : SPAN > 6 ? 2 : 1;
    for (let y = Math.ceil(Y0); y <= Math.floor(Y1); y += stepY) ticks.push({ n: y, left: Math.max(4, X(y)) });
  }
  const near = EV.length ? nearest(yf) : null;
  const bubble = near && Math.abs(near.y - yf) < 0.4 ? near.t : String(year);
  const headPct = Math.min(100, Math.max(0, X(yf)));

  // ── Follow and alerts ─────────────────────────────────────────────────────
  const setFollow = async (next: boolean) => {
    setFollowing(next);
    try {
      const local: string[] = JSON.parse(localStorage.getItem(LS_FOLLOW) ?? "[]");
      localStorage.setItem(LS_FOLLOW, JSON.stringify(next ? Array.from(new Set([...local, a.slug])) : local.filter((x) => x !== a.slug)));
    } catch { /* storage blocked */ }
    if (member) {
      const r = await memberRpc("follow_artist", { p_slug: a.slug, p_follow: next });
      if (!r.ok) setFollowing(!next);
    }
  };
  const onAlert = () => {
    if (!member) { setAlertNote((v) => !v); return; }
    void setFollow(!following);
  };

  // ── I was there ───────────────────────────────────────────────────────────
  const toggleWas = async (id: string) => {
    const next = !was[id];
    setWas((w) => ({ ...w, [id]: next }));
    setWasCounts((cnt) => (cnt ? { ...cnt, [id]: Math.max(0, (cnt[id] ?? 0) + (next ? 1 : -1)) } : cnt));
    try {
      const all = JSON.parse(localStorage.getItem(LS_WAS) ?? "{}") as Record<string, string[]>;
      const mine = new Set(all[a.slug] ?? []);
      if (next) mine.add(id); else mine.delete(id);
      all[a.slug] = [...mine];
      localStorage.setItem(LS_WAS, JSON.stringify(all));
    } catch { /* storage blocked */ }
    if (member) {
      const r = await memberRpc("set_i_was_there", { p_slug: a.slug, p_moment: id, p_on: next });
      // Before migration 043 is applied the RPC is missing: keep the mark on this device only.
      setWasNote(r.ok ? null : next ? "Saved on this device for now." : null);
    } else setWasNote(next ? id : null);
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const shareUrl = `${SITE}/artists/${a.slug}${pick ? `?at=${encodeURIComponent(pick.id)}` : ""}`;
  const shareStory = async () => {
    const text = `${a.name}, ${year}: ${shown?.t ?? ""}`;
    try {
      const blob = await storyImage({ name: a.name, year, title: shown?.t ?? "", palette: p });
      const file = blob ? new File([blob], `${a.slug}-${year}.png`, { type: "image/png" }) : null;
      if (file && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: a.name, text, url: shareUrl }); return; }
      if (navigator.share) { await navigator.share({ title: a.name, text, url: shareUrl }); return; }
      if (blob) {
        const u = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = u; link.download = `${a.slug}-${year}.png`; link.click();
        setTimeout(() => URL.revokeObjectURL(u), 2000);
      }
    } catch { /* share sheet closed */ }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };

  // ── The era window: what the THEN block pulls to the top ─────────────────
  const nowYear = new Date().getFullYear();
  const win = useMemo(() => {
    const datedYs = [
      ...a.releases.filter((r) => !r.undated).map((r) => r.y),
      ...EV.filter((m) => m.kind === "show").map((m) => m.y),
      ...a.videos.map((v) => v.y), ...a.mixes.map((m) => m.y), ...a.press.map((x) => x.y),
    ].filter((y): y is number => y != null);
    if (a.eraReal) return { lo: era.from, hi: (era.to ?? 9999) + 1, label: era.to == null || era.to >= nowYear ? `${era.from} TO NOW` : era.from === era.to ? String(era.from) : `${era.from} TO ${era.to}`, now: era.to == null || era.to >= nowYear };
    // No eras on record: use the year you are on, widened until something is dated there.
    for (const d of [0, 1, 2]) {
      const lo = year - d, hi = year + d + 1;
      if (datedYs.some((y) => y >= lo && y < hi) || d === 2) return { lo, hi, label: d === 0 ? String(year) : hi - 1 >= nowYear ? `${lo} TO NOW` : `${lo} TO ${hi - 1}`, now: hi > nowYear };
    }
    return { lo: year, hi: year + 1, label: String(year), now: year >= nowYear };
  }, [a, EV, era, year, nowYear]);
  const inWin = (y: number | null | undefined) => y != null && y >= win.lo && y < win.hi;

  const nowDay = new Date().toISOString().slice(0, 10);
  const isPast = (m: Moment) => (m.day ? m.day <= nowDay : m.y <= nowYear + (new Date().getMonth() + 1) / 12);
  const shows = EV.filter((e) => e.kind === "show");
  const pastShows = shows.filter(isPast).slice().reverse();
  const eraRels = a.releases.filter((r) => !r.undated && inWin(r.y));
  const eraShows = shows.filter((m) => inWin(m.y)).slice().reverse();
  const eraVideos = a.videos.filter((v) => inWin(v.y));
  const eraMixes = a.mixes.filter((m) => inWin(m.y));
  const eraPress = a.press.filter((x) => inWin(x.y));
  const eraCount = eraRels.length + eraShows.length + eraVideos.length + eraMixes.length + eraPress.length;

  // ── Lists ─────────────────────────────────────────────────────────────────
  const releasesOrdered = [...a.releases.filter((r) => !r.undated && inWin(r.y)), ...a.releases.filter((r) => r.undated || !inWin(r.y))];
  const rowReleases = releasesOrdered.filter((r) => allReleases || r.onTimeline || r.undated || inWin(r.y));
  const hiddenCount = a.releases.length - rowReleases.length;
  const story = EV.slice().reverse();

  // What else on the page is about a show: videos, press, photos and mixes whose title or caption names it.
  const related = useCallback((m: Moment) => {
    const venue = (m.venue ?? "").trim().toLowerCase();
    const me = new Set(toks(a.name));
    const keys = toks(m.t).filter((w) => !me.has(w));
    const need = keys.length <= 2 ? keys.length : Math.max(2, Math.ceil(keys.length * 0.5));
    const hit = (text: string | null | undefined) => {
      if (!text) return false;
      const t = text.toLowerCase();
      if (venue.length >= 5 && !/livestream|online/.test(venue) && t.includes(venue)) return true;
      if (!need) return false;
      const tt = new Set(toks(t));
      return keys.filter((k) => tt.has(k)).length >= need;
    };
    return {
      videos: a.videos.filter((v) => hit(`${v.title} ${v.note ?? ""}`)),
      mixes: a.mixes.filter((x) => hit(x.title)),
      press: a.press.filter((x) => hit(`${x.title} ${x.excerpt ?? ""}`)),
      photos: a.photos.filter((ph) => hit(ph.caption)),
    };
  }, [a]);

  const css = `
html,body{overflow-x:visible!important}
@supports (overflow:clip){html,body{overflow-x:clip!important}}
.av{font-family:'Space Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.45;transition:background-color .7s ease,color .7s ease}
.av a{color:inherit;text-decoration:none}
.av button:disabled{opacity:.35;cursor:default}
.av .clamp{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.av .clamp3{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.av .disp{font-family:'Bowlby One',Impact,sans-serif;font-weight:400;letter-spacing:.01em}
.av .ease{transition:background-color .7s ease,color .7s ease,border-color .7s ease,opacity .4s ease,box-shadow .7s ease}
.av .press{transition:transform .12s ease,box-shadow .12s ease}.av .press:active{transform:translate(2px,2px)}
.av .lift:hover{transform:translate(-2px,-2px)}
.av .row{scrollbar-width:none}.av .row::-webkit-scrollbar{display:none}
.av .strip{touch-action:none;user-select:none;-webkit-user-select:none}
.av button{font:inherit;color:inherit}
.av button:focus-visible,.av a:focus-visible,.av [tabindex]:focus-visible{outline:3px solid ${BLUE};outline-offset:3px}
.av .hit:hover{background:rgba(127,127,127,.14)}
@keyframes avspin{to{transform:rotate(360deg)}}@keyframes aveq{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
@keyframes avin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.av .fadein{animation:avin .35s ease both}
.av .spin{animation:avspin 5s linear infinite}.av .spin.paused{animation-play-state:paused}
.av .eq span{display:block;width:2px;height:10px;background:currentColor;transform-origin:bottom;animation:aveq .9s ease-in-out infinite}
.av .eq span:nth-child(2){animation-delay:.2s}.av .eq span:nth-child(3){animation-delay:.4s}
.av .phone{display:flex}.av .desk{display:none}
@media (min-width:1024px){.av .phone{display:none}.av .desk{display:flex}}
@media (prefers-reduced-motion:reduce){.av .spin,.av .eq span,.av .fadein{animation:none}.av *{transition:none!important}}
`;

  // ── Style helpers (CCD: ink borders, hard offset shadows, square corners) ──
  const card = (extra?: CSSProperties): CSSProperties => ({ background: p.surface, border: `3px solid ${p.ink}`, boxShadow: `5px 5px 0 ${p.hard}`, boxSizing: "border-box", ...extra });
  const chunk = (bg: string, fg: string, bd: string, sh: string, h = 40): CSSProperties => ({
    height: h, padding: "0 14px", border: `3px solid ${bd}`, background: bg, color: fg, boxShadow: `3px 3px 0 ${sh}`,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700, fontSize: 13, letterSpacing: "0.04em",
    textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap", boxSizing: "border-box", borderRadius: 0,
  });
  const chip = (on = false): CSSProperties => ({ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", border: `2px solid ${p.ink}`, background: on ? p.ink : "transparent", color: on ? p.bg : p.ink, whiteSpace: "nowrap" });
  const H = ({ children, right, big, id }: { children: ReactNode; right?: ReactNode; big?: boolean; id?: string }) => (
    <div id={id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingBottom: 12 }}>
      <h2 className="disp" style={{ margin: 0, fontSize: big ? 28 : 22, lineHeight: 1, textTransform: "uppercase" }}>{children}</h2>
      {right && <span style={{ fontSize: 12, fontWeight: 700, color: p.mute, textAlign: "right" }}>{right}</span>}
    </div>
  );
  const Links = ({ links, small }: { links: LinkOut[]; small?: boolean }) => links.length ? (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {links.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
          style={{ fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", padding: small ? "2px 6px" : "4px 8px", border: `2px solid ${p.ink}`, background: p.bg, color: p.ink, whiteSpace: "nowrap" }}>
          {l.label} ↗
        </a>
      ))}
    </span>
  ) : null;

  const PlayIcon = playing ? "❚❚" : "▶";
  const playAria = playing ? "Pause" : `Play ${dock.t}`;

  // ── Hero pieces ───────────────────────────────────────────────────────────
  const FollowBtn = ({ h = 44 }: { h?: number }) => (
    <button className="press" onClick={() => void setFollow(!following)} style={chunk(following ? CREAM : "transparent", following ? INK : CREAM, CREAM, following ? ACID : "transparent", h)}>
      {following ? "Following" : "Follow"}
    </button>
  );
  const DatesBtn = ({ h = 44 }: { h?: number }) => a.upcoming.length ? (
    <a href="#av-upcoming" className="press" style={chunk(RED, "#ffffff", CREAM, CREAM, h)}>
      {a.upcoming.length} {a.upcoming.length === 1 ? "date" : "dates"} coming up
    </a>
  ) : (
    <button className="press" onClick={onAlert} style={{ ...chunk("transparent", CREAM, "rgba(244,239,228,0.5)", "transparent", h), fontSize: 12 }}>
      {member && following ? "Alert on ✓" : "Not touring · Alert me"}
    </button>
  );
  const AlertNote = () => alertNote && !member ? (
    <span style={{ fontSize: 13, color: "rgba(244,239,228,0.85)" }}>Alerts need a CCD account. <a href="/join" style={{ textDecoration: "underline", fontWeight: 700 }}>Join free</a> and follow to get their dates.</span>
  ) : null;
  const HeroLinks = () => a.links.length ? (
    <nav aria-label={`${displayName(a.name)} elsewhere`} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {a.links.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="press lift"
          style={{ height: 34, padding: "0 10px", border: `3px solid ${CREAM}`, background: INK, color: CREAM, boxShadow: `3px 3px 0 ${ACID}`, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {l.label} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </nav>
  ) : null;
  const Genres = () => a.genres.length ? (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {a.genres.map((g, i) => (
        <span key={g} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", border: `2px solid ${CREAM}`, background: i === 0 ? ACID : "transparent", color: i === 0 ? INK : CREAM }}>{g}</span>
      ))}
    </div>
  ) : null;
  const Line = () => (a.line || a.playedCcd) ? (
    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
      {a.line && <span style={{ opacity: 0.85 }}>{a.line}</span>}
      {a.playedCcd && <span style={{ background: ACID, color: INK, padding: "2px 8px", border: `2px solid ${INK}`, letterSpacing: "0.06em" }}>PLAYED CCD</span>}
    </span>
  ) : null;
  const HeroCover = ({ size }: { size: number }) => (
    <div style={{ width: size, height: size, flex: `0 0 ${size}px`, position: "relative", border: `3px solid ${CREAM}`, boxShadow: `6px 6px 0 ${ACID}`, background: relNow?.fill ?? p.fill, color: relNow?.ink ?? CREAM, overflow: "hidden", boxSizing: "border-box" }}>
      {curCover ? <Img src={curCover} size="100%" alt={`${relNow?.t ?? ""} cover`} /> : a.photo ? <Img src={a.photo} size="100%" alt={a.name} /> : (
        <span style={{ position: "absolute", inset: 0, padding: 12, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em" }}>{a.name.toUpperCase()}</span>
          <span className="disp" style={{ fontSize: size > 180 ? 24 : 18, lineHeight: 1.05 }}>{relNow?.t ?? ""}</span>
        </span>
      )}
      {relNow && curCover && <span style={{ position: "absolute", left: 0, bottom: 0, background: INK, color: CREAM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 6px" }}>{relNow.date.toUpperCase()}</span>}
    </div>
  );
  const PlayBtn = ({ h = 44, label }: { h?: number; label?: boolean }) => (
    <button className="press" onClick={togglePlay} aria-label={playAria} disabled={nothingPlayable && !playEmbed}
      style={{ ...chunk(ACID, INK, INK, CREAM, h), minWidth: h, padding: label ? "0 18px" : 0 }}>
      {label ? (playing ? "❚❚ Pause" : "▶ Play") : PlayIcon}
    </button>
  );

  // ── Numbers strip ─────────────────────────────────────────────────────────
  const Numbers = ({ cols: want }: { cols: number }) => { const cols = Math.min(want, a.stats.length); return a.stats.length ? (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, border: `3px solid ${p.ink}`, boxShadow: `5px 5px 0 ${p.hard}`, background: p.surface }} className="ease">
      {a.stats.map((s, i) => (
        <div key={s.label} style={{ padding: "12px 10px", borderLeft: i % cols ? `3px solid ${p.ink}` : 0, borderTop: i >= cols ? `3px solid ${p.ink}` : 0, display: "flex", flexDirection: "column", gap: 2, minWidth: 0,
          gridColumn: i === a.stats.length - 1 && a.stats.length % cols ? `span ${cols - (a.stats.length % cols) + 1}` : undefined }}>
          <span className="disp" style={{ fontSize: 26, lineHeight: 1, color: i % 3 === 0 ? (p.dark ? ACID : RED) : p.ink }}>{fmtN(s.n)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: p.mute }}>{s.label}</span>
        </div>
      ))}
    </div>
  ) : null; };

  // ── Media cards ───────────────────────────────────────────────────────────
  const MediaCard = ({ id, title, url, kind, date, tracks }: { id: string; title: string; url: string; kind: string; date?: string | null; tracks?: Mix["tracks"] }) => {
    const yt = ytId(url);
    const emb = embedFor(url);
    const on = playingMedia === id;
    const src = sourceName(url) ?? "Link";
    const tone = [[BLUE, "#ffffff"], [RED, "#ffffff"], [ACID, INK]][Math.abs(hashStr(id)) % 3];
    const face = (
      <span style={{ position: "relative", display: "block", width: "100%", aspectRatio: "16 / 9", background: yt ? INK : tone[0], color: tone[1], overflow: "hidden" }}>
        {yt ? <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : (
            <span style={{ position: "absolute", inset: 0, padding: "30px 12px 12px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <span className="disp" style={{ fontSize: 20, lineHeight: 1 }}>{src.toUpperCase()}</span>
            </span>
          )}
        <span aria-hidden="true" style={{ position: "absolute", right: 12, top: "50%", width: 52, height: 52, marginTop: -26, background: ACID, color: INK, border: `3px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, ...(yt ? { right: "auto", left: "50%", marginLeft: -26 } : {}) }}>{yt || emb ? "▶" : "↗"}</span>
        <span style={{ position: "absolute", left: 0, top: 0, background: INK, color: CREAM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 6px" }}>{kind.toUpperCase()}</span>
      </span>
    );
    return (
      <div className="ease" style={{ ...card(), display: "flex", flexDirection: "column", minWidth: 0 }}>
        {on && emb ? (
          <iframe title={title} src={yt ? `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0` : emb.src} width="100%"
            style={{ border: 0, display: "block", aspectRatio: yt ? "16 / 9" : undefined, height: yt ? undefined : emb.h }} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : emb ? (
          <button onClick={() => setPlayingMedia(id)} aria-label={`Play ${title}`} style={{ padding: 0, border: 0, background: "none", cursor: "pointer", display: "block", width: "100%" }}>{face}</button>
        ) : (
          <a href={url} target="_blank" rel="noreferrer" aria-label={`${title} on ${src}`} style={{ display: "block" }}>{face}</a>
        )}
        <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 4, borderTop: `3px solid ${p.ink}` }}>
          <span style={{ fontWeight: 700, lineHeight: 1.25 }}>{title}</span>
          <span style={{ fontSize: 12, color: p.mute, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[src, date].filter(Boolean).join(" · ")}
            <a href={url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: p.link }}>{emb ? `Open on ${src} ↗` : `Watch on ${src} ↗`}</a>
          </span>
          {tracks && tracks.length > 0 && (
            <>
              <button onClick={() => setOpenTracks(openTracks === id ? null : id)} aria-expanded={openTracks === id}
                style={{ alignSelf: "flex-start", marginTop: 4, background: "none", border: 0, padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Tracklist ({tracks.length}) {openTracks === id ? "▴" : "▾"}
              </button>
              {openTracks === id && (
                <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {tracks.map((t, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: `1px solid ${p.rule}`, fontSize: 13 }}>
                      <span style={{ flex: "0 0 18px", color: p.mute }}>{i + 1}</span>
                      <span style={{ minWidth: 0 }}><b>{t.title}</b> <span style={{ color: p.mute }}>{t.artist}</span></span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      </div>
    );
  };
  const VideoCard = ({ v, i }: { v: Video; i: number }) => MediaCard({ id: `v${i}-${v.url}`, title: v.title, url: v.url, kind: (v.kind ?? "video").replace(/_/g, " "), date: v.y ? String(Math.floor(v.y)) : null });
  const MixCard = ({ m, i }: { m: Mix; i: number }) => MediaCard({ id: `m${i}-${m.url}`, title: m.title, url: m.url, kind: "mix", date: m.date, tracks: m.tracks });

  const PressCard = ({ x, i, small }: { x: PressItem; i: number; small?: boolean }) => {
    const tone = [[RED, "#ffffff"], [BLUE, "#ffffff"], [ACID, INK]][i % 3];
    return (
      <a href={x.url} target="_blank" rel="noreferrer" className="press lift ease" style={{ ...card(), display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span className="disp" style={{ background: tone[0], color: tone[1], padding: small ? "6px 10px" : "8px 12px", fontSize: small ? 13 : 15, lineHeight: 1.1, borderBottom: `3px solid ${p.ink}`, textTransform: "uppercase" }}>{x.publication}</span>
        <span style={{ padding: small ? "8px 10px 10px" : "10px 12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 700, lineHeight: 1.25, fontSize: small ? 13 : 15 }}>{x.title}</span>
          {!small && x.excerpt && <span className="clamp3" style={{ fontSize: 13, color: p.mute }}>{x.excerpt}</span>}
          <span style={{ fontSize: 12, color: p.mute, display: "flex", gap: 8, flexWrap: "wrap" }}>{x.date && <span>{x.date}</span>}<b style={{ color: p.link }}>Read ↗</b></span>
        </span>
      </a>
    );
  };

  // ── Shows: expandable cards ───────────────────────────────────────────────
  const ShowCard = ({ m, compact, pickOnOpen, flat }: { m: Moment; compact?: boolean; pickOnOpen?: boolean; flat?: boolean }) => {
    const isOpen = !!openShows[m.id];
    const r = related(m);
    const past = isPast(m);
    const parts = [
      r.videos.length ? plural(r.videos.length, "video") : null,
      r.mixes.length ? plural(r.mixes.length, "mix", "mixes") : null,
      r.press.length ? plural(r.press.length, "article") : null,
      r.photos.length ? plural(r.photos.length, "photo") : null,
    ].filter(Boolean) as string[];
    const srcN = m.src ? sourceName(m.src) : null;
    const afford = parts.length ? `Open: ${parts.join(", ")}` : m.src ? (srcN === "Resident Advisor" ? "Source: RA" : "Source") : "Details";
    const d = m.day ? new Date(`${m.day}T00:00:00`) : null;
    const count = wasCounts?.[m.id] ?? 0;
    const toggle = () => { setOpenShows((o) => ({ ...o, [m.id]: !o[m.id] })); if (pickOnOpen && !isOpen) select(m); };
    return (
      <div className="ease" style={flat ? { borderTop: `2px solid ${p.rule}` } : { ...card({ boxShadow: `3px 3px 0 ${p.hard}` }) }}>
        <button onClick={toggle} aria-expanded={isOpen}
          style={{ width: "100%", background: "none", border: 0, padding: compact ? "8px 10px" : "10px 12px", display: "grid", gridTemplateColumns: "48px minmax(0,1fr)", gap: 12, alignItems: "center", textAlign: "left", cursor: "pointer" }}>
          <span style={{ width: 48, height: 48, border: `2px solid ${p.ink}`, background: p.dark ? ACID : RED, color: p.dark ? INK : "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
            {d ? (<><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>{MON[d.getMonth()]}</span><span className="disp" style={{ fontSize: 18 }}>{d.getDate()}</span></>)
              : <span className="disp" style={{ fontSize: 14 }}>&apos;{String(Math.floor(m.y)).slice(2)}</span>}
          </span>
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>SHOW · {d ? `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}` : m.date.toUpperCase()}{was[m.id] ? " · YOU WERE THERE" : ""}</span>
            <span style={{ fontWeight: 700, lineHeight: 1.25 }}>{m.t}</span>
            {m.sub && <span style={{ fontSize: 13, color: p.mute }}>{m.sub}</span>}
            <span style={{ marginTop: 4, alignSelf: "flex-start", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 7px", border: `2px solid ${p.ink}`, background: isOpen ? p.ink : "transparent", color: isOpen ? p.bg : p.ink }}>
              {isOpen ? "Close ▴" : `${afford} ▾`}
            </span>
          </span>
        </button>
        {isOpen && (
          <div className="fadein" style={{ padding: compact ? "0 10px 12px" : "0 12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content minmax(0,1fr)", gap: "4px 14px", fontSize: 13 }}>
              {m.venue && <><dt style={{ color: p.mute, fontWeight: 700 }}>Venue</dt><dd style={{ margin: 0 }}>{m.venue}</dd></>}
              {m.city && <><dt style={{ color: p.mute, fontWeight: 700 }}>City</dt><dd style={{ margin: 0 }}>{m.city}</dd></>}
              <dt style={{ color: p.mute, fontWeight: 700 }}>When</dt><dd style={{ margin: 0 }}>{d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : m.date}</dd>
            </dl>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {past && (
                <button className="press" onClick={() => void toggleWas(m.id)} aria-pressed={!!was[m.id]}
                  style={chunk(was[m.id] ? (p.dark ? ACID : RED) : p.bg, was[m.id] ? (p.dark ? INK : "#ffffff") : p.ink, p.ink, p.hard, 36)}>
                  {was[m.id] ? "✓ I was there" : "I was there"}
                </button>
              )}
              {past && wasCounts && count > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: p.mute }}>{count} {count === 1 ? "person was" : "people were"} there</span>}
              {m.src && <a href={m.src} target="_blank" rel="noreferrer" className="press" style={chunk("transparent", p.ink, p.ink, "transparent", 36)}>{srcN ?? "Source"} ↗</a>}
              {!pickOnOpen && <button onClick={() => select(m)} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: p.link, textDecoration: "underline", textUnderlineOffset: 3 }}>Go to {Math.floor(m.y)} on the timeline</button>}
            </div>
            {wasNote === m.id && !member && (
              <span style={{ fontSize: 12, color: p.mute }}>Saved on this device. <a href="/join" style={{ color: p.link, fontWeight: 700, textDecoration: "underline" }}>Join CCD free</a> to keep your shows with your account and add to the count.</span>
            )}
            {wasNote && wasNote !== m.id && member && was[m.id] && <span style={{ fontSize: 12, color: p.mute }}>{wasNote}</span>}
            {(r.videos.length > 0 || r.mixes.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {r.videos.map((v, i) => <div key={v.url}>{VideoCard({ v, i: 100 + i })}</div>)}
                {r.mixes.map((x, i) => <div key={x.url}>{MixCard({ m: x, i: 100 + i })}</div>)}
              </div>
            )}
            {r.press.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {r.press.map((x, i) => <div key={x.url}>{PressCard({ x, i, small: true })}</div>)}
              </div>
            )}
            {r.photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.photos.map((ph) => <button key={ph.url} onClick={() => setLightbox(a.photos.indexOf(ph))} style={{ padding: 0, border: `2px solid ${p.ink}`, background: "none", cursor: "zoom-in" }}><Img src={ph.url} size={88} alt={ph.caption ?? ""} /></button>)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Focus card: the moment you are on ────────────────────────────────────
  const Focus = ({ big }: { big?: boolean }) => {
    if (!shown) return null;
    if (shown.kind === "show") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>YOU ARE ON</span>
        {ShowCard({ m: shown })}
      </div>
    );
    const rel = shown.kind === "rel" ? a.releases.find((r) => r.id === shown.id) : undefined;
    const img = shown.kind === "rel" ? coverUrl(shown.albumId, "medium") : null;
    const sz = big ? 72 : 60;
    return (
      <div className="ease" style={{ ...card(), padding: big ? 16 : 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>YOU ARE ON</span>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ flex: `0 0 ${sz}px`, height: sz, border: `2px solid ${p.ink}`, overflow: "hidden", background: shown.kind === "rel" ? shown.fill : p.chip, color: shown.kind === "rel" ? shown.ink : p.ink, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
            {img ? <Img src={img} size={sz - 4} /> : <span className="disp" style={{ fontSize: 18 }}>&apos;{String(Math.floor(shown.y)).slice(2)}</span>}
          </span>
          <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>
              <Mark s={shape(shown.kind, p.dark, true)} />{KL[shown.kind]} · {shown.date.toUpperCase()}
            </span>
            <span style={{ fontWeight: 700, fontSize: big ? 18 : 16, lineHeight: 1.25 }}>{shown.t}</span>
            {shown.sub && <span style={{ fontSize: 13, color: p.mute }}>{shown.sub.replace(" · not on streaming", "")}</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button className="press" onClick={() => setShare(true)} style={chunk(p.ink, p.bg, p.ink, p.hard, 32)}>Share</button>
          {rel ? Links({ links: rel.links }) : shown.src && <a href={shown.src} target="_blank" rel="noreferrer" className="press" style={chunk("transparent", p.ink, p.ink, "transparent", 32)}>{sourceName(shown.src) ?? "Source"} ↗</a>}
        </div>
      </div>
    );
  };

  // ── THEN: the era you are in, its material pulled to the top ─────────────
  const EraChips = () => a.eraReal && a.eras.length > 1 ? (
    <div role="tablist" aria-label="Eras" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {a.eras.map((e, k) => (
        <button key={k} role="tab" aria-selected={k === ei} className="press" onClick={() => jumpEra(k)}
          style={{ ...chip(k === ei), cursor: "pointer", padding: "5px 9px" }}>
          {e.from}{e.to == null ? " on" : e.to !== e.from ? `–${String(e.to).slice(2)}` : ""}
        </button>
      ))}
    </div>
  ) : null;
  const Then = ({ big }: { big?: boolean }) => {
    const hasSound = !!era.sound || era.tags.length > 0;
    if (!hasSound && eraCount === 0) return null;
    const relN = big ? 6 : 8;
    return (
      <section aria-label="This era" key={`${win.lo}-${win.hi}`} className="ease fadein" style={{ ...card(), padding: big ? 20 : 14, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="disp" style={{ fontSize: 13, padding: "4px 8px", background: win.now ? ACID : RED, color: win.now ? INK : "#ffffff", border: `2px solid ${p.ink}` }}>{win.now ? "NOW" : "THEN"}</span>
          <span className="disp" style={{ fontSize: big ? 26 : 22, lineHeight: 1 }}>{win.label}</span>
          {eraCount > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: p.mute }}>{[eraRels.length ? plural(eraRels.length, "release") : null, eraShows.length ? plural(eraShows.length, "show") : null, eraVideos.length + eraMixes.length ? plural(eraVideos.length + eraMixes.length, "video or mix", "videos and mixes") : null, eraPress.length ? plural(eraPress.length, "story", "stories") : null].filter(Boolean).join(" · ")}</span>}
        </div>
        {EraChips()}
        {era.sound && <p style={{ margin: 0, fontSize: big ? 24 : 19, fontWeight: 700, lineHeight: 1.2 }}>{era.sound.charAt(0).toUpperCase() + era.sound.slice(1)}</p>}
        {era.tags.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{era.tags.map((x) => <span key={x} style={chip()}>{x}</span>)}</div>}
        {era.src && <span style={{ fontSize: 12, color: p.mute }}>Sound line from <a href={era.src} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>{era.srcName ?? sourceName(era.src)}</a></span>}
        {eraRels.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>RELEASES THEN</span>
            <div className="row" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
              {eraRels.slice(0, relN * 2).map((r) => {
                const cov = coverUrl(r.albumId, "medium");
                const on = relNow?.id === r.id;
                return (
                  <button key={r.id} className="press" onClick={() => select(r)} aria-label={`${r.t}, ${r.date}`} title={`${r.t} (${r.date})`}
                    style={{ flex: "0 0 84px", padding: 0, border: `2px solid ${p.ink}`, boxShadow: on ? `3px 3px 0 ${p.hard}` : "none", background: r.fill, color: r.ink, cursor: "pointer", display: "flex", flexDirection: "column", textAlign: "left" }}>
                    <span style={{ width: 80, height: 80, display: "block", position: "relative", overflow: "hidden" }}>
                      {cov ? <Img src={cov} size={80} /> : <span style={{ position: "absolute", inset: 0, padding: 6, fontSize: 11, fontWeight: 700, lineHeight: 1.1 }}>{r.t}</span>}
                    </span>
                    <span style={{ background: p.bg, color: p.ink, padding: "3px 5px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: 80, boxSizing: "border-box" }}>{r.date}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {eraShows.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>SHOWS THEN</span>
            {eraShows.slice(0, 3).map((m) => <div key={m.id}>{ShowCard({ m, compact: true })}</div>)}
            {eraShows.length > 3 && <a href="#av-shows" style={{ fontSize: 12, fontWeight: 700, color: p.link }}>{eraShows.length - 3} more shows in these years, see Past shows</a>}
          </div>
        )}
        {(eraVideos.length > 0 || eraMixes.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>WATCH AND LISTEN THEN</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {eraVideos.map((v, i) => <div key={v.url}>{VideoCard({ v, i: 200 + i })}</div>)}
              {eraMixes.map((x, i) => <div key={x.url}>{MixCard({ m: x, i: 200 + i })}</div>)}
            </div>
          </div>
        )}
        {eraPress.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>PRESS THEN</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {eraPress.slice(0, 4).map((x, i) => <div key={x.url}>{PressCard({ x, i, small: true })}</div>)}
            </div>
          </div>
        )}
        {eraCount === 0 && <span style={{ fontSize: 13, color: p.mute }}>Nothing dated in these years yet. Drag the timeline to another year.</span>}
      </section>
    );
  };

  // ── Releases ──────────────────────────────────────────────────────────────
  const ReleaseTile = ({ r, size, idPrefix }: { r: Release; size: number | "100%"; idPrefix: string }) => {
    const cur = relNow && r.id === relNow.id;
    const thisEra = !r.undated && inWin(r.y);
    const cov = coverUrl(r.albumId, "big");
    return (
      <div key={r.id} id={`${idPrefix}${r.id}`} style={{ flex: size === "100%" ? undefined : `0 0 ${size}px`, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <button className="press" onClick={() => { if (!r.undated) select(r); }} aria-label={`${r.t}, ${r.date}${r.undated ? "" : ". Go there on the timeline"}`}
          style={{ padding: 0, border: `3px solid ${p.ink}`, boxShadow: cur ? `5px 5px 0 ${p.dark ? ACID : RED}` : `3px 3px 0 ${p.hard}`, background: r.fill, color: r.ink, cursor: r.undated ? "default" : "pointer", display: "block", width: size, aspectRatio: "1", height: size === "100%" ? undefined : size, position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
          {cov ? <Img src={cov} size="100%" /> : (
            <span style={{ position: "absolute", inset: 0, padding: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "left" }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em" }}>{a.name.toUpperCase()}</span>
              <span className="disp" style={{ fontSize: 15, lineHeight: 1.05 }}>{r.t}</span>
            </span>
          )}
          {(thisEra || cur) && <span style={{ position: "absolute", left: 0, top: 0, background: cur ? (p.dark ? ACID : RED) : INK, color: cur && p.dark ? INK : "#ffffff", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 5px" }}>{cur ? "ON NOW" : "THIS ERA"}</span>}
        </button>
        <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{r.t}</span>
          <span style={{ fontSize: 12, color: p.mute }}>{r.date} · {r.sub.replace(" · not on streaming", "")}</span>
          {Links({ links: r.links, small: true })}
        </span>
      </div>
    );
  };

  // ── About and facts ───────────────────────────────────────────────────────
  const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const latestRel = a.releases.find((r) => !r.undated);
  const nextShow = a.upcoming[0] ?? null;
  const nextCcd = a.ccdNights.find((n) => n.upcoming) ?? null;
  const pastCcd = a.ccdNights.filter((n) => !n.upcoming);
  const facts: [string, string][] = [
    ...(a.city ? [["Based in", a.city] as [string, string]] : []),
    ...(latestRel ? [["Latest release", `${latestRel.t} (${latestRel.date}${latestRel.label ? `, ${latestRel.label}` : ""})`] as [string, string]] : []),
    ...(nextShow ? [["Next show", `${nextShow.title}${nextShow.city ? `, ${nextShow.city}` : ""}, ${fmtDay(nextShow.event_date)}`] as [string, string]]
      : nextCcd ? [["Next show", `${nextCcd.title} with Cats Can Dance${nextCcd.date ? `, ${fmtDay(nextCcd.date)}` : ""}`] as [string, string]] : []),
    ...(pastCcd.length ? [["Played Cats Can Dance", pastCcd.map((n) => n.title).join(", ")] as [string, string]] : []),
  ].slice(0, 4);
  const About = ({ big }: { big?: boolean }) => a.bio || a.members || facts.length ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {H({ children: "About", big })}
      {a.bio && <p className={bioOpen ? "" : "clamp"} style={{ margin: 0, fontSize: big ? 16 : 15, lineHeight: 1.55, whiteSpace: "pre-line" }}>{a.bio}</p>}
      {(a.bio?.length ?? 0) > 280 && (
        <button onClick={() => setBioOpen((v) => !v)} style={{ alignSelf: "flex-start", background: "none", border: 0, padding: 0, cursor: "pointer", fontSize: 13, fontWeight: 700, color: p.link }}>{bioOpen ? "Less" : "Read more"}</button>
      )}
      {a.members && <span style={{ fontSize: 13, color: p.mute }}>Members: {a.members}</span>}
      {facts.length > 0 && (
        <dl style={{ margin: "8px 0 0", display: "grid", gridTemplateColumns: "max-content minmax(0, 1fr)", gap: "6px 16px", fontSize: 14 }}>
          {facts.map(([k, v]) => [
            <dt key={`k${k}`} style={{ color: p.mute, fontWeight: 700 }}>{k}</dt>,
            <dd key={`v${k}`} style={{ margin: 0 }}>{v}</dd>,
          ])}
        </dl>
      )}
    </section>
  ) : null;

  const Book = () => a.bookable ? (
    <section id="av-book" className="ease" style={{ ...card({ background: p.dark ? CREAM : INK, color: p.dark ? INK : CREAM }), padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <span style={{ flex: "1 1 220px", display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="disp" style={{ fontSize: 22, lineHeight: 1 }}>BOOK {displayName(a.name).toUpperCase()}</span>
        <span style={{ fontSize: 13, opacity: 0.75 }}>
          CCD replies with dates and a quote. <a href={`/artists/${a.slug}/epk`} style={{ fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>Press kit</a>
        </span>
      </span>
      {/* The booking desk drawer (PR #11). Opens itself on ?book=1&date=&city= links from On tour. */}
      <BookButton fromQuery artist={{ slug: a.slug, name: displayName(a.name), photo_url: a.photo, city: a.city, sound: a.genres.slice(0, 2).join(", ") || undefined }}
        label="Send a request" className="press"
        style={chunk(ACID, INK, INK, p.dark ? INK : CREAM, 44)} />
    </section>
  ) : null;

  const WithCcd = () => a.ccdNights.length || a.touring.length ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {a.touring.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {H({ children: "On tour" })}
          {a.touring.map((t, i) => (
            <div key={`t${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: `2px solid ${p.ink}` }}>
              <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 700 }}>{t.city}</span>
                <span style={{ fontSize: 13, color: p.mute }}>{fmtDay(t.from)}{t.to !== t.from ? ` to ${fmtDay(t.to)}` : ""}{t.note ? ` · ${t.note}` : ""}</span>
              </span>
              {a.bookable && <a href="#av-book" className="press" style={chunk("transparent", p.ink, p.ink, "transparent", 32)}>Book these dates</a>}
            </div>
          ))}
          <a href="/tour" style={{ fontSize: 12, fontWeight: 700, color: p.mute, paddingTop: 6 }}>Everyone touring India in the next 60 days</a>
        </div>
      )}
      {a.ccdNights.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {H({ children: "With Cats Can Dance" })}
          {a.ccdNights.map((n) => (
            <a key={n.slug} className="press" href={n.url} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: `2px solid ${p.ink}` }}>
              <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 700 }}>{n.title}</span>
                <span style={{ fontSize: 13, color: p.mute }}>{n.date ? fmtDay(n.date) + " " + n.date.slice(0, 4) : "Date to come"}</span>
              </span>
              <span style={chunk(n.upcoming ? ACID : "transparent", n.upcoming ? INK : p.ink, p.ink, n.upcoming ? p.hard : "transparent", 32)}>{n.upcoming ? "Tickets" : "The night"}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  ) : null;

  const UpcomingList = ({ id }: { id?: string }) => a.upcoming.length ? (
    <section id={id} style={{ display: "flex", flexDirection: "column" }}>
      {H({ children: "Upcoming" })}
      {a.upcoming.map((d) => {
        const dt = new Date(`${d.event_date}T00:00:00`);
        return (
          <a key={d.id} className="press" href={d.ticket_url ?? undefined} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderTop: `2px solid ${p.ink}` }}>
            <span style={{ flex: "0 0 48px", height: 48, border: `2px solid ${p.ink}`, background: ACID, color: INK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{MON[dt.getMonth()]}</span>
              <span className="disp" style={{ fontSize: 18 }}>{dt.getDate()}</span>
            </span>
            <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700 }}>{d.city ?? d.title}</span>
              <span style={{ fontSize: 13, color: p.mute }}>{[d.venue, d.city ? d.title : null].filter(Boolean).join(" · ")}</span>
            </span>
            {d.ticket_url && <span style={chunk("transparent", p.ink, p.ink, "transparent", 32)}>Tickets ↗</span>}
          </a>
        );
      })}
    </section>
  ) : null;

  const Popular = () => a.popular.length ? (
    <section style={{ display: "flex", flexDirection: "column" }}>
      {H({ children: "Popular", right: "30s previews" })}
      {a.popular.map((k, i) => {
        const cur = pop === i, live = cur && playing;
        return (
          <button key={k.id} className="press hit" onClick={() => { if (live) stop(); else { setPop(i); void playTrack(k.id, !cur); } }} aria-label={`${live ? "Pause" : "Play"} ${k.t}`}
            style={{ background: "none", border: 0, borderTop: `2px solid ${p.rule}`, padding: "8px 0", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left" }}>
            <span style={{ flex: "0 0 16px", fontSize: 13, fontWeight: 700, color: cur ? p.link : p.mute, display: "flex", justifyContent: "center" }}>
              {live ? <span className="eq" aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 10 }}><span /><span /><span /></span> : i + 1}
            </span>
            <span style={{ flex: "0 0 42px", height: 42, border: `2px solid ${p.ink}`, overflow: "hidden", background: p.chip, display: "block", boxSizing: "border-box" }}><Img src={coverUrl(k.albumId, "small")} size={38} /></span>
            <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700, color: cur ? p.link : p.ink }}>{k.t}</span>
              <span style={{ fontSize: 13, color: p.mute }}>{k.album}</span>
            </span>
          </button>
        );
      })}
      <span style={{ fontSize: 11, color: p.mute, paddingTop: 6 }}>Previews from Deezer.</span>
    </section>
  ) : null;

  const watchCount = a.videos.length + a.mixes.length;
  // Phone: a swipe row of cards. Desktop: a grid.
  const gridOrRow = (cols: number, w: number): CSSProperties => cols > 1
    ? { display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 16 }
    : { display: "grid", gridAutoFlow: "column", gridAutoColumns: `${w}px`, gap: 14, overflowX: "auto", padding: "0 8px 10px 0", alignItems: "start" };
  const Watch = ({ cols }: { cols: number }) => watchCount ? (
    <section style={{ display: "flex", flexDirection: "column" }}>
      {H({ children: "Watch and listen", right: cols > 1 ? plural(watchCount, "item") : `${plural(watchCount, "item")}, swipe` })}
      <div className="row" style={gridOrRow(cols, watchCount > 1 ? 280 : 340)}>
        {a.videos.slice(0, cols > 1 && !watchAll ? 6 : undefined).map((v, i) => <div key={v.url}>{VideoCard({ v, i })}</div>)}
        {a.mixes.slice(0, cols > 1 && !watchAll ? Math.max(0, 6 - a.videos.length) : undefined).map((m, i) => <div key={m.url}>{MixCard({ m, i })}</div>)}
      </div>
      {cols > 1 && watchCount > 6 && (
        <button className="press" onClick={() => setWatchAll((v) => !v)} style={{ ...chunk("transparent", p.ink, p.ink, p.hard, 38), alignSelf: "flex-start", marginTop: 16 }}>
          {watchAll ? "Show fewer" : `Show all ${watchCount}`}
        </button>
      )}
    </section>
  ) : null;

  const Press = ({ cols }: { cols: number }) => a.press.length ? (
    <section style={{ display: "flex", flexDirection: "column" }}>
      {H({ children: "Press", right: plural(a.press.length, "story", "stories") })}
      <div className="row" style={gridOrRow(cols, a.press.length > 1 ? 260 : 340)}>
        {a.press.slice(0, cols > 1 && !pressAll ? 6 : undefined).map((x, i) => <div key={x.url}>{PressCard({ x, i })}</div>)}
      </div>
      {cols > 1 && a.press.length > 6 && (
        <button className="press" onClick={() => setPressAll((v) => !v)} style={{ ...chunk("transparent", p.ink, p.ink, p.hard, 38), alignSelf: "flex-start", marginTop: 16 }}>
          {pressAll ? "Show fewer" : `Show all ${a.press.length} stories`}
        </button>
      )}
    </section>
  ) : null;

  const hasPhotos = a.photos.length > 1 || (a.photos.length === 1 && a.photos[0].url !== a.photo);
  const Photos = ({ cols }: { cols: number }) => hasPhotos ? (
    <section style={{ display: "flex", flexDirection: "column" }}>
      {H({ children: "Photos", right: plural(a.photos.length, "photo") })}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 10 }}>
        {a.photos.map((ph, i) => (
          <button key={ph.url} onClick={() => setLightbox(i)} aria-label={`Open photo ${i + 1}${ph.caption ? `: ${ph.caption}` : ""}`}
            className="press" style={{ padding: 0, border: `3px solid ${p.ink}`, boxShadow: `3px 3px 0 ${p.hard}`, background: p.chip, cursor: "zoom-in", aspectRatio: i === 0 && cols > 2 ? "1" : "1", overflow: "hidden", gridColumn: i === 0 && a.photos.length >= 4 ? "span 2" : undefined, gridRow: i === 0 && a.photos.length >= 4 ? "span 2" : undefined }}>
            <img src={ph.url} alt={ph.caption ?? a.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </button>
        ))}
      </div>
      {a.photos.some((ph) => ph.credit) && <span style={{ fontSize: 11, color: p.mute, paddingTop: 6 }}>Photos: {[...new Set(a.photos.map((ph) => ph.credit).filter(Boolean))].join(", ")}</span>}
    </section>
  ) : null;

  // Past shows, grouped by year (newest first).
  const showYears = useMemo(() => {
    const out: { y: number; list: Moment[] }[] = [];
    for (const m of pastShows) {
      const y = Math.floor(m.y);
      const last = out[out.length - 1];
      if (last && last.y === y) last.list.push(m); else out.push({ y, list: [m] });
    }
    return out;
  }, [pastShows]);
  const PastShows = ({ cols }: { cols: number }) => {
    if (!pastShows.length) return null;
    let budget = showsAll ? Infinity : 6;
    const groups = showYears.map((g) => { const take = g.list.slice(0, Math.max(0, budget)); budget -= take.length; return { y: g.y, list: take }; }).filter((g) => g.list.length);
    return (
      <section id="av-shows" style={{ display: "flex", flexDirection: "column" }}>
        {H({ children: "Past shows", right: `${plural(pastShows.length, "show")}, tap one to open it` })}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {groups.map((g) => (
            <div key={g.y} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="disp" style={{ fontSize: 18, lineHeight: 1, color: inWin(g.y + 0.5) ? (p.dark ? ACID : RED) : p.ink }}>{g.y}</span>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 12, alignItems: "start" }}>
                {g.list.map((m) => <div key={m.id}>{ShowCard({ m })}</div>)}
              </div>
            </div>
          ))}
        </div>
        {pastShows.length > 6 && (
          <button className="press" onClick={() => setShowsAll((v) => !v)} style={{ ...chunk("transparent", p.ink, p.ink, p.hard, 38), alignSelf: "flex-start", marginTop: 14 }}>
            {showsAll ? "Show fewer" : `Show all ${pastShows.length} shows`}
          </button>
        )}
      </section>
    );
  };

  const circle = a.tiles.find((t) => t.id === "circle");
  const Connections = ({ cols }: { cols: number }) => a.connections.length || circle ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {H({ children: "Played with and worked with", right: a.connections.length ? `${a.connections.length} on CCD` : undefined })}
      {a.connections.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 12 }}>
          {a.connections.map((cn, i) => {
            const tone = [[BLUE, "#ffffff"], [RED, "#ffffff"], [ACID, INK]][i % 3];
            return (
              <a key={cn.slug} href={`/artists/${cn.slug}`} className="press lift ease" style={{ ...card({ boxShadow: `3px 3px 0 ${p.hard}` }), display: "flex", alignItems: "center", gap: 10, padding: 8, minWidth: 0 }}>
                <span style={{ flex: "0 0 52px", height: 52, border: `2px solid ${p.ink}`, overflow: "hidden", background: tone[0], color: tone[1], display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                  {cn.img ? <Img src={cn.img} size={48} /> : <span className="disp" style={{ fontSize: 22 }}>{cn.name.charAt(0).toUpperCase()}</span>}
                </span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontWeight: 700, lineHeight: 1.2 }}>{displayName(cn.name)}</span>
                  <span style={{ fontSize: 12, color: p.mute, lineHeight: 1.25 }}>{cn.why}</span>
                </span>
              </a>
            );
          })}
        </div>
      )}
      {circle && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>ALSO WORKED WITH</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {circle.rows.map((r) => r.u
              ? <a key={r.a} href={r.u} target="_blank" rel="noreferrer" title={r.b} style={{ ...chip(), fontSize: 12, textTransform: "none", padding: "5px 9px" }}>{r.a} <span style={{ color: p.mute, fontWeight: 500 }}>· {r.b.length > 40 ? r.b.slice(0, 40).replace(/\s\S*$/, "") + "…" : r.b}</span> ↗</a>
              : <span key={r.a} style={{ ...chip(), fontSize: 12, textTransform: "none", padding: "5px 9px" }}>{r.a} <span style={{ color: p.mute, fontWeight: 500 }}>· {r.b}</span></span>)}
          </div>
        </div>
      )}
    </section>
  ) : null;

  // Labels and collectives: their own bordered cards, with other CCD artists in the same group.
  const labelGroups = a.groups.filter((g) => g.kind === "label");
  const crewGroups = a.groups.filter((g) => g.kind === "collective");
  const GroupCard = ({ g, i, small }: { g: ArtistV2["groups"][number]; i: number; small?: boolean }) => {
    const tone = g.kind === "label" ? [[BLUE, "#ffffff"], [RED, "#ffffff"], [ACID, INK]][i % 3] : [[ACID, INK], [BLUE, "#ffffff"], [RED, "#ffffff"]][i % 3];
    const site = g.url ? sourceName(g.url) : null;
    return (
      <div className="ease" style={{ ...card(), display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ background: tone[0], color: tone[1], padding: "10px 12px", borderBottom: `3px solid ${p.ink}`, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em" }}>{g.kind === "label" ? "LABEL" : "COLLECTIVE"}</span>
          <span className="disp" style={{ fontSize: (small ? 15 : 20) - (g.name.length > 14 ? 3 : 0), lineHeight: 1.05, overflowWrap: "break-word" }}>{g.name.toUpperCase()}</span>
        </div>
        <div style={{ padding: small ? "8px 10px 10px" : "10px 12px 12px", display: "flex", flexDirection: "column", gap: 8, fontSize: small ? 12 : undefined }}>
          {g.kind === "label" && (
            <span style={{ fontSize: small ? 12 : 13 }}>{g.releases ? <><b>{plural(g.releases, "release")}</b>{g.years ? ` here, ${g.years}` : " here"}</> : <span style={{ color: p.mute }}>On their label list</span>}</span>
          )}
          {g.peers.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>ALSO ON CCD</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {g.peers.map((x, k) => (
                  <a key={x.slug} href={`/artists/${x.slug}`} className="press" title={displayName(x.name)} style={{ display: "flex", alignItems: "center", gap: 6, border: `2px solid ${p.ink}`, background: p.bg, paddingRight: 8, maxWidth: "100%" }}>
                    <span style={{ flex: "0 0 30px", height: 30, overflow: "hidden", background: [BLUE, RED, ACID][k % 3], color: k % 3 === 2 ? INK : "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", borderRight: `2px solid ${p.ink}` }}>
                      {x.img ? <Img src={x.img} size={30} /> : <span className="disp" style={{ fontSize: 14 }}>{x.name.charAt(0).toUpperCase()}</span>}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName(x.name)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {g.url && <a href={g.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: p.link }}>{onSite(g.url, g.name) ? `${g.kind === "label" ? "Label site" : "Their site"} ↗` : `Source: ${site ?? "link"} ↗`}</a>}
        </div>
      </div>
    );
  };
  const Groups = ({ cols }: { cols: number }) => a.groups.length ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {labelGroups.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column" }}>
          {H({ children: "Labels", right: plural(labelGroups.length, "label") })}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 16, alignItems: "start" }}>
            {labelGroups.map((g, i) => <div key={g.name}>{GroupCard({ g, i, small: cols === 2 })}</div>)}
          </div>
        </section>
      )}
      {crewGroups.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column" }}>
          {H({ children: "Collectives and crews", right: plural(crewGroups.length, "crew") })}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 16, alignItems: "start" }}>
            {crewGroups.map((g, i) => <div key={g.name}>{GroupCard({ g, i, small: cols === 2 })}</div>)}
          </div>
        </section>
      )}
    </div>
  ) : null;

  // Festivals and influences: labelled blocks, always open.
  const fests = a.tiles.find((t) => t.id === "fests");
  const into = a.tiles.find((t) => t.id === "into");
  const Extras = ({ cols }: { cols: number }) => fests || into ? (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 16, alignItems: "start" }}>
      {fests && (
        <section className="ease" style={{ ...card(), padding: 14 }}>
          {H({ children: "Festivals", right: String(fests.rows.length) })}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{fests.rows.map((r, i) => <span key={r.a} style={{ ...chip(i === 0), fontSize: 12, textTransform: "none", padding: "5px 9px" }}>{r.a}</span>)}</div>
        </section>
      )}
      {into && (
        <section className="ease" style={{ ...card(), padding: 14 }}>
          {H({ children: "Grew up on" })}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {into.rows.slice(0, 4).map((r, i) => (
              <figure key={i} style={{ margin: 0, paddingLeft: 10, borderLeft: `4px solid ${p.dark ? ACID : RED}` }}>
                <blockquote style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>{r.a}</blockquote>
                {(r.b || r.u) && <figcaption style={{ fontSize: 12, color: p.mute, paddingTop: 2 }}>{r.u ? <a href={r.u} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{r.b || "Source"}</a> : r.b}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  ) : null;

  const AlsoLike = ({ size }: { size: number }) => a.alsoLike.length ? (
    <section style={{ display: "flex", flexDirection: "column" }}>
      {H({ children: "Fans also like" })}
      <div className="row" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "0 4px 8px 0" }}>
        {a.alsoLike.map((r, i) => {
          const [bg, ink] = r.internal ? [[BLUE, "#ffffff"], [RED, "#ffffff"], [ACID, INK]][i % 3] : [p.chip, p.ink];
          const body = (
            <>
              <span className="ease" style={{ width: size, height: size, border: `3px solid ${p.ink}`, boxShadow: r.internal ? `3px 3px 0 ${p.hard}` : "none", overflow: "hidden", background: bg, color: ink, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                {r.img ? <Img src={r.img} size={size - 6} /> : <span className="disp" style={{ fontSize: 24 }}>{r.n.charAt(0).toUpperCase()}</span>}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{r.n}</span>
              <span style={{ fontSize: 11, color: p.mute, lineHeight: 1.2 }}>{r.internal ? r.why : "not on CCD yet"}</span>
            </>
          );
          const st: CSSProperties = { flex: `0 0 ${size}px`, display: "flex", flexDirection: "column", gap: 6 };
          return r.u ? <a key={r.n} className="press" href={r.u} style={st}>{body}</a> : <div key={r.n} style={{ ...st, opacity: 0.85 }}>{body}</div>;
        })}
      </div>
    </section>
  ) : null;

  const StoryRow = ({ e, i }: { e: Moment; i: number }) => {
    const y = Math.floor(e.y), prev = i > 0 ? Math.floor(story[i - 1].y) : null, on = pick?.id === e.id;
    return (
      <div key={e.id} style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr)", gap: 10, alignItems: "start", padding: "6px 0" }}>
        <span className="disp" style={{ fontSize: 14, lineHeight: 1.8, color: on ? (p.dark ? ACID : RED) : p.mute, opacity: y === prev ? 0 : 1 }}>{y}</span>
        {e.kind === "show" ? ShowCard({ m: e, compact: true, pickOnOpen: true }) : (
          <button onClick={() => select(e)} className="ease hit" style={{ border: `2px solid ${on ? p.ink : "transparent"}`, cursor: "pointer", textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", background: on ? p.surface : "transparent" }}>
            <span style={{ paddingTop: 7 }}><Mark s={shape(e.kind, p.dark, on)} /></span>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>{KL[e.kind]} · {e.date.toUpperCase()}</span>
              <span style={{ fontWeight: 700 }}>{e.t}</span>
              {e.sub && <span style={{ fontSize: 13, color: p.mute }}>{e.sub.replace(" · not on streaming", "")}</span>}
            </span>
          </button>
        )}
      </div>
    );
  };

  const ReleasesHeadRight = () => (
    <span style={{ display: "inline-flex", gap: 10, alignItems: "baseline" }}>
      {a.releases.length} records{eraRels.length ? `, ${eraRels.length} from ${win.label.toLowerCase()} first` : ""}
    </span>
  );

  const G = 16; // phone side gutter
  const sec = (m = 36): CSSProperties => ({ margin: `${m}px ${G}px 0` });

  return (
    <>
      <Nav forceDark />
      <div className="av" style={{ background: p.bg, color: p.ink, minHeight: "100vh", paddingTop: navH }}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <audio ref={audio} preload="none"
          onTimeUpdate={(e) => setProg(Math.min(1, e.currentTarget.currentTime / (e.currentTarget.duration || 30)))}
          onEnded={() => { setPlaying(false); setProg(1); }} onPause={() => setPlaying(false)} />

        {/* ═════════════════════════ PHONE ═════════════════════════ */}
        <div className="phone" style={{ flexDirection: "column", maxWidth: 640, margin: "0 auto", position: "relative" }}>
          <header style={{ position: "relative", overflow: "hidden", background: INK, color: CREAM, borderBottom: `4px solid ${INK}` }}>
            {heroBig ? <img src={heroBig} alt="" style={{ position: "absolute", left: "-15%", top: "-15%", width: "130%", height: "130%", objectFit: "cover", filter: "blur(30px) saturate(1.2)", opacity: 0.45 }} />
              : <div style={{ position: "absolute", inset: 0, background: p.fill, opacity: 0.5 }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(17,17,17,0.35) 0%, rgba(17,17,17,0.9) 100%)" }} />
            <div style={{ position: "relative", padding: `20px ${G}px 22px`, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                {HeroCover({ size: 124 })}
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <a href="/artists" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7 }}>← ARTISTS</a>
                  {Line()}
                </div>
              </div>
              <h1 className="disp" style={{ margin: 0, fontSize: a.name.length > 14 ? 36 : a.name.length > 9 ? 44 : 54, lineHeight: 0.92, overflowWrap: "anywhere" }}>{a.name.toUpperCase()}</h1>
              {Genres()}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                {PlayBtn({ h: 44 })}
                {FollowBtn({})}
                {DatesBtn({})}
              </div>
              {AlertNote()}
              {HeroLinks()}
            </div>
          </header>

          {a.stats.length > 0 && <div style={sec(22)}>{Numbers({ cols: 3 })}</div>}
          <div style={sec(26)}>{Then({})}</div>
          {shown && <div style={sec(26)}>{Focus({})}</div>}
          {a.groups.length > 0 && <div style={sec()}>{Groups({ cols: 2 })}</div>}
          {a.upcoming.length > 0 && <div style={sec()}>{UpcomingList({ id: "av-upcoming" })}</div>}
          {(a.ccdNights.length > 0 || a.touring.length > 0) && <div style={sec()}>{WithCcd()}</div>}

          {a.releases.length > 0 && (
            <section style={{ marginTop: 36, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: `0 ${G}px` }}>{H({ children: "Releases", right: ReleasesHeadRight() })}</div>
              <div className="row" id="av-rel-row" style={{ display: "flex", gap: 16, overflowX: "auto", padding: `0 ${G}px 10px` }}>
                {rowReleases.map((r) => <div key={r.id}>{ReleaseTile({ r, size: 136, idPrefix: "rel-" })}</div>)}
                {hiddenCount > 0 && (
                  <button className="press" onClick={() => setAllReleases(true)} style={{ flex: "0 0 136px", height: 136, border: `3px dashed ${p.ink}`, background: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, textTransform: "uppercase" }}>
                    + {hiddenCount} more
                  </button>
                )}
              </div>
            </section>
          )}

          {a.popular.length > 0 && <div style={sec()}>{Popular()}</div>}
          {watchCount > 0 && <div style={sec()}>{Watch({ cols: 1 })}</div>}
          {hasPhotos && <div style={sec()}>{Photos({ cols: 2 })}</div>}
          {a.press.length > 0 && <div style={sec()}>{Press({ cols: 1 })}</div>}
          {(a.bio || a.members || facts.length > 0) && <div style={sec()}>{About({})}</div>}
          {pastShows.length > 0 && <div style={sec()}>{PastShows({ cols: 1 })}</div>}
          {(a.connections.length > 0 || circle) && <div style={sec()}>{Connections({ cols: 1 })}</div>}
          {(fests || into) && <div style={sec()}>{Extras({ cols: 1 })}</div>}

          {story.length > 0 && (
            <section style={{ ...sec(), display: "flex", flexDirection: "column" }}>
              {H({ children: "Story", right: "tap to jump there" })}
              {(storyAll ? story : story.slice(0, 8)).map((e, i) => <div key={e.id}>{StoryRow({ e, i })}</div>)}
              {story.length > 8 && (
                <button className="press" onClick={() => setStoryAll((v) => !v)} style={{ ...chunk("transparent", p.ink, p.ink, p.hard, 36), alignSelf: "flex-start", marginTop: 8 }}>
                  {storyAll ? "Show less" : `Show all ${story.length}`}
                </button>
              )}
            </section>
          )}

          {a.bookable && <div style={sec()}>{Book()}</div>}
          {a.alsoLike.length > 0 && <div style={sec()}>{AlsoLike({ size: 80 })}</div>}

          <PageFoot p={p} a={a} />

          {/* Dock: the player and the career scrubber. Hidden when there is nothing to play or scrub. */}
          {(!nothingPlayable || playEmbed || EV.length > 0) && <div style={{ position: "sticky", bottom: 10, margin: "24px 10px 12px", zIndex: 20, background: INK, color: CREAM, border: `3px solid ${CREAM}`, boxShadow: `4px 4px 0 ${ACID}`, padding: "10px 12px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
            {embed && playEmbed && (
              <iframe title={`${a.name} player`} src={playEmbed.src} width="100%" height={playEmbed.h} style={{ border: 0 }} allow="autoplay; clipboard-write; encrypted-media" loading="lazy" />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ flex: "0 0 42px", height: 42, border: `2px solid ${CREAM}`, overflow: "hidden", background: dock.fill, display: "block", boxSizing: "border-box" }}><Img src={dock.cover} size={38} /></span>
              <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dock.t}</span>
                <span style={{ fontSize: 12, color: "rgba(244,239,228,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{audioErr ?? dock.sub}</span>
              </span>
              {!(nothingPlayable && !playEmbed) && <button className="press" onClick={togglePlay} aria-label={playAria} style={{ ...chunk(ACID, INK, CREAM, "transparent", 40), width: 40, padding: 0 }}>{PlayIcon}</button>}
            </div>
            <div style={{ height: 3, background: "rgba(244,239,228,0.14)", overflow: "hidden" }}><div style={{ height: 3, width: `${prog * 100}%`, background: ACID }} /></div>

            {EV.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, height: 22 }}>
                  <span className="disp" style={{ fontSize: 16, lineHeight: 1, color: ACID }}>{year}</span>
                  {shown && <Mark s={shape(shown.kind, true, true)} />}
                  <span style={{ fontSize: 13, color: "rgba(244,239,228,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shown?.t}</span>
                </div>
                <div className="strip" role="slider" tabIndex={0}
                  aria-label={`${a.name}'s career. Drag to scrub, tap to jump, arrow keys step through moments.`}
                  aria-valuemin={Math.floor(Y0)} aria-valuemax={Math.floor(Y1)} aria-valuenow={year}
                  aria-valuetext={`${year}${shown ? `, ${KL[shown.kind].toLowerCase()}: ${shown.t}` : ""}`}
                  onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}
                  style={{ position: "relative", height: zoom ? 64 : 46, cursor: "ew-resize", transition: "height 0.2s ease" }}>
                  <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: zoom ? 40 : 26, display: "flex", alignItems: "center", gap: 2, pointerEvents: "none", transition: "height 0.2s ease" }}>
                    {bars.map((b, i) => <span key={i} style={{ flex: "1 1 0", height: b.h, maxHeight: "100%", background: b.c }} />)}
                  </div>
                  {marks.map((m) => (
                    <span key={m.id} aria-hidden="true" style={{ position: "absolute", left: `${m.left}%`, top: zoom ? 44 : 29, width: m.sh.w, height: m.sh.h, marginLeft: -m.sh.w / 2, background: m.sh.c, borderRadius: m.sh.r, border: m.sh.b, transform: `rotate(${m.sh.rot}deg)`, pointerEvents: "none", transition: "left 0.15s ease" }} />
                  ))}
                  {ticks.map((t) => (
                    <span key={t.n} aria-hidden="true" style={{ position: "absolute", left: `${t.left}%`, bottom: 0, transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: "rgba(244,239,228,0.5)", pointerEvents: "none" }}>{t.n}</span>
                  ))}
                  {zoom && (
                    <span aria-hidden="true" style={{ position: "absolute", left: `${headPct}%`, top: -30, transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700, padding: "3px 8px", border: `2px solid ${INK}`, background: ACID, color: INK, pointerEvents: "none" }}>{bubble}</span>
                  )}
                  <span aria-hidden="true" style={{ position: "absolute", top: -3, height: zoom ? 46 : 32, left: `${headPct}%`, width: 3, marginLeft: -1, background: CREAM, pointerEvents: "none" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 14, fontSize: 10, color: "rgba(244,239,228,0.5)", paddingTop: 2, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mark s={shape("rel", true, false)} />release</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mark s={shape("show", true, false)} />show</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mark s={shape("mile", true, false)} />moment</span>
                  <span>hold and drag to zoom</span>
                </div>
              </>
            )}
          </div>}
        </div>

        {/* ═════════════════════════ DESKTOP ═════════════════════════ */}
        <div className="desk">
          <aside style={{ flex: "0 0 300px", boxSizing: "border-box", background: "#141414", color: CREAM, borderRight: `4px solid ${INK}`, padding: "20px 20px 28px", display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: navH, height: `calc(100vh - ${navH}px)`, overflowY: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, border: `3px solid ${CREAM}`, boxShadow: `4px 4px 0 ${ACID}`, background: INK }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", opacity: 0.6 }}>PLAYING FROM {year}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ flex: "0 0 48px", height: 48, border: `2px solid ${CREAM}`, overflow: "hidden", background: dock.fill, display: "block", boxSizing: "border-box" }}><Img src={dock.cover} size={44} /></span>
                <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dock.t}</span>
                  <span style={{ fontSize: 12, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{audioErr ?? dock.sub}</span>
                </span>
                <button className="press" onClick={togglePlay} aria-label={playAria} disabled={nothingPlayable && !playEmbed} style={{ ...chunk(ACID, INK, CREAM, "transparent", 40), width: 40, padding: 0 }}>{PlayIcon}</button>
              </div>
              <div style={{ height: 3, background: "rgba(244,239,228,0.14)", overflow: "hidden" }}><div style={{ height: 3, width: `${prog * 100}%`, background: ACID }} /></div>
              {embed && playEmbed && <iframe title={`${a.name} player`} src={playEmbed.src} width="100%" height={playEmbed.h} style={{ border: 0 }} allow="autoplay; clipboard-write; encrypted-media" loading="lazy" />}
            </div>
            {EV.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span className="disp" style={{ fontSize: 15 }}>THE YEARS</span>
                  <span style={{ fontSize: 11, opacity: 0.5 }}>↑↓ or click</span>
                </div>
                <div role="listbox" aria-label={`${a.name}'s career`} tabIndex={0} onKeyDown={onKey} style={{ position: "relative", flex: "1 1 auto", display: "flex", flexDirection: "column" }}>
                  <div style={{ position: "absolute", left: 47, top: 6, bottom: 6, width: 2, background: "rgba(244,239,228,0.14)" }} />
                  {EV.map((e, i) => {
                    const on = pick?.id === e.id, y = Math.floor(e.y), prev = i > 0 ? Math.floor(EV[i - 1].y) : null;
                    return (
                      <button key={e.id} role="option" aria-selected={on} className="hit" onClick={() => select(e)} style={{ background: on ? "rgba(182,239,54,0.14)" : "transparent", border: 0, borderLeft: `3px solid ${on ? ACID : "transparent"}`, padding: "5px 6px", display: "grid", gridTemplateColumns: "34px 16px 1fr", gap: 6, alignItems: "center", cursor: "pointer", textAlign: "left", position: "relative" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, opacity: y === prev ? 0 : 1, color: on ? ACID : CREAM }}>{y}</span>
                        <span style={{ display: "flex", justifyContent: "center" }}><Mark s={shape(e.kind, true, on)} /></span>
                        <span style={{ fontSize: 13, fontWeight: on ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: e.y <= (pick?.y ?? Y1) + 0.001 ? 1 : 0.5 }}>{e.t}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 11, opacity: 0.55 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Mark s={shape("rel", true, false)} />release</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Mark s={shape("show", true, false)} />show</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Mark s={shape("mile", true, false)} />moment</span>
                </div>
              </>
            )}
          </aside>

          <main style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", paddingBottom: 8 }}>
            <header style={{ position: "relative", overflow: "hidden", background: INK, color: CREAM, borderBottom: `4px solid ${INK}` }}>
              {heroBig ? <img src={heroBig} alt="" style={{ position: "absolute", left: "-10%", top: "-30%", width: "120%", height: "160%", objectFit: "cover", filter: "blur(40px) saturate(1.2)", opacity: 0.45 }} />
                : <div style={{ position: "absolute", inset: 0, background: p.fill, opacity: 0.5 }} />}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(17,17,17,0.85) 0%, rgba(17,17,17,0.35) 75%)" }} />
              <div style={{ position: "relative", padding: "36px 48px 40px", display: "flex", alignItems: "flex-end", gap: 36 }}>
                {HeroCover({ size: 230 })}
                <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  <a href="/artists" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7 }}>← ARTISTS</a>
                  {Line()}
                  <h1 className="disp" style={{ margin: 0, fontSize: a.name.length > 14 ? 60 : a.name.length > 9 ? 76 : 92, lineHeight: 0.88, overflowWrap: "anywhere" }}>{a.name.toUpperCase()}</h1>
                  {Genres()}
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    {PlayBtn({ h: 46, label: true })}
                    {FollowBtn({ h: 46 })}
                    {DatesBtn({ h: 46 })}
                  </div>
                  {AlertNote()}
                  {HeroLinks()}
                </div>
              </div>
            </header>

            {a.stats.length > 0 && <div style={{ padding: "28px 48px 0" }}>{Numbers({ cols: a.stats.length })}</div>}

            <div style={{ padding: "32px 48px 0", display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)", gap: 36, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 28, minWidth: 0 }}>
                {Then({ big: true })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 28, minWidth: 0 }}>
                {Focus({ big: true })}
                {UpcomingList({ id: "av-upcoming-d" })}
                {WithCcd()}
                {Popular()}
              </div>
            </div>

            {a.groups.length > 0 && <div style={{ padding: "44px 48px 0" }}>{Groups({ cols: 4 })}</div>}

            {a.releases.length > 0 && (
              <div style={{ padding: "44px 48px 0", display: "flex", flexDirection: "column" }}>
                {H({ children: "Releases", big: true, right: ReleasesHeadRight() })}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 22 }}>
                  {rowReleases.map((r) => <div key={r.id}>{ReleaseTile({ r, size: "100%", idPrefix: "drel-" })}</div>)}
                </div>
                {hiddenCount > 0 && <button className="press" onClick={() => setAllReleases(true)} style={{ ...chunk("transparent", p.ink, p.ink, p.hard, 38), alignSelf: "flex-start", marginTop: 18 }}>Show all {a.releases.length}</button>}
              </div>
            )}

            {watchCount > 0 && <div style={{ padding: "44px 48px 0" }}>{Watch({ cols: 3 })}</div>}
            {hasPhotos && <div style={{ padding: "44px 48px 0" }}>{Photos({ cols: 4 })}</div>}
            {a.press.length > 0 && <div style={{ padding: "44px 48px 0" }}>{Press({ cols: 3 })}</div>}

            <div style={{ padding: "44px 48px 0", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 36, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 36, minWidth: 0 }}>
                {About({ big: true })}
                {Connections({ cols: 2 })}
              </div>
              <div style={{ minWidth: 0 }}>{PastShows({ cols: 1 })}</div>
            </div>

            {(fests || into) && <div style={{ padding: "44px 48px 0" }}>{Extras({ cols: Math.max(2, [fests, into].filter(Boolean).length) })}</div>}
            {a.bookable && <div style={{ padding: "44px 48px 0", maxWidth: 820 }}>{Book()}</div>}
            {a.alsoLike.length > 0 && <div style={{ padding: "44px 48px 0" }}>{AlsoLike({ size: 96 })}</div>}

            <div style={{ padding: "0 28px" }}><PageFoot p={p} a={a} /></div>
          </main>
        </div>

        {lightbox != null && a.photos[lightbox] && (
          <div role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <figure onClick={(e) => e.stopPropagation()} style={{ margin: 0, maxWidth: "min(1100px, 100%)", display: "flex", flexDirection: "column", gap: 8 }}>
              <img src={a.photos[lightbox].url} alt={a.photos[lightbox].caption ?? a.name} style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", border: `4px solid ${CREAM}`, boxShadow: `8px 8px 0 ${ACID}`, display: "block" }} />
              <figcaption style={{ color: CREAM, fontSize: 13, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <span>{[a.photos[lightbox].caption, a.photos[lightbox].credit ? `Photo: ${a.photos[lightbox].credit}` : null].filter(Boolean).join(" · ")}</span>
                {a.photos[lightbox].src && <a href={a.photos[lightbox].src!} target="_blank" rel="noreferrer" style={{ color: ACID, fontWeight: 700 }}>Source ↗</a>}
                <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button onClick={() => setLightbox((lightbox + a.photos.length - 1) % a.photos.length)} aria-label="Previous photo" style={chunk(CREAM, INK, INK, ACID, 36)}>←</button>
                  <button onClick={() => setLightbox((lightbox + 1) % a.photos.length)} aria-label="Next photo" style={chunk(CREAM, INK, INK, ACID, 36)}>→</button>
                  <button onClick={() => setLightbox(null)} style={chunk(CREAM, INK, INK, ACID, 36)}>Close</button>
                </span>
              </figcaption>
            </figure>
          </div>
        )}

        {share && (
          <div role="dialog" aria-modal="true" aria-label="Share" onClick={() => setShare(false)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: CREAM, color: INK, borderTop: `4px solid ${INK}`, borderLeft: `4px solid ${INK}`, borderRight: `4px solid ${INK}`, padding: "18px 20px 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, boxSizing: "border-box" }}>
              <div style={{ width: 200, height: 356, overflow: "hidden", position: "relative", background: "#0b0b0b", color: CREAM, border: `3px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}>
                {heroBig ? <img src={heroBig} alt="" style={{ position: "absolute", inset: "-20%", width: "140%", height: "140%", objectFit: "cover", filter: "blur(16px)", opacity: 0.6 }} /> : <div style={{ position: "absolute", inset: 0, background: p.fill, opacity: 0.7 }} />}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.8))" }} />
                <div className="disp" style={{ position: "absolute", left: 14, right: 14, top: 14, fontSize: 9 }}>CATS CAN DANCE</div>
                <div style={{ position: "absolute", left: 14, right: 14, bottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="disp" style={{ fontSize: 40, lineHeight: 0.9, color: ACID }}>{year}</span>
                  <span className="disp" style={{ fontSize: a.name.length > 10 ? 18 : 22, lineHeight: 0.95 }}>{a.name.toUpperCase()}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{shown?.t}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>catscandance.com/artists/{a.slug}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <button className="press" onClick={() => void shareStory()} style={{ ...chunk(INK, CREAM, INK, ACID, 44), flex: "1 1 0" }}>Share to story</button>
                <button className="press" onClick={() => void copyLink()} style={{ ...chunk("transparent", INK, INK, INK, 44), flex: "1 1 0" }}>{copied ? "Copied" : "Copy link"}</button>
              </div>
              <button onClick={() => setShare(false)} style={{ fontSize: 13, color: "rgba(17,17,17,0.6)", background: "none", border: 0, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

/** True when the link sits on the group's own domain (tru-thoughts.co.uk for Tru Thoughts, x.bandcamp.com for X). */
function onSite(url: string, name: string) {
  const k = name.toLowerCase().replace(/\b(records?|recordings|music)\b/g, "").replace(/[^a-z0-9]/g, "");
  try { return k.length >= 3 && new URL(url).hostname.replace(/[^a-z0-9]/g, "").includes(k); } catch { return false; }
}
function hashStr(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

function PageFoot({ p, a }: { p: Palette; a: ArtistV2 }) {
  return (
    <div style={{ margin: "40px 16px 0", paddingTop: 16, borderTop: `3px solid ${p.ink}`, display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: p.mute }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", fontWeight: 700 }}>
        {a.bookable && <a href="#av-book">Book</a>}
        <a href={`/artists/${a.slug}/epk`}>Press kit</a>
        <a href="/tour#post">Post tour dates</a>
        <a href="/artists">All artists</a>
      </div>
      <span>
        Compiled by Cats Can Dance from press, labels and listings. Every line links to its source. Previews from Deezer.{" "}
        {!a.claimed && <a href={`/for-artists?claim=${encodeURIComponent(a.slug)}#claim`} style={{ color: p.ink, fontWeight: 700 }}>Are you {displayName(a.name)}? Claim this page.</a>}
      </span>
    </div>
  );
}

/** Draws a 1080x1920 story card. Covers from Deezer are not drawn (cross-origin), so it uses the era colour. */
async function storyImage({ name, year, title, palette }: { name: string; year: number; title: string; palette: Palette }): Promise<Blob | null> {
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const W = 1080, H = 1920;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    if (!g) return null;
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, palette.fill);
    grad.addColorStop(1, "#0b0b0b");
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.fillStyle = "#f4efe4";
    g.font = "48px 'Bowlby One', Impact, sans-serif";
    g.fillText("CATS CAN DANCE", 72, 140);
    g.fillStyle = "#b6ef36";
    g.font = "220px 'Bowlby One', Impact, sans-serif";
    g.fillText(String(year), 64, H - 620);
    g.fillStyle = "#f4efe4";
    const nameSize = name.length > 10 ? 96 : 120;
    g.font = `${nameSize}px 'Bowlby One', Impact, sans-serif`;
    g.fillText(name.toUpperCase(), 64, H - 470);
    g.font = "700 56px 'Space Grotesk', system-ui, sans-serif";
    wrap(g, title, 72, H - 370, W - 144, 66, 3);
    g.globalAlpha = 0.7;
    g.font = "40px 'Space Grotesk', system-ui, sans-serif";
    g.fillText("catscandance.com/artists", 72, H - 110);
    g.globalAlpha = 1;
    return await new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
  } catch {
    return null;
  }
}
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  const words = text.split(/\s+/);
  let line = "", n = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y + n * lh); n++; line = w;
      if (n >= maxLines) return;
    } else line = test;
  }
  if (line && n < maxLines) g.fillText(line, x, y + n * lh);
}
