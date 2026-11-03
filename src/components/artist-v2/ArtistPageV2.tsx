"use client";
/**
 * Artist page v2 (design board I). The timeline scrubber is the player: wherever you are in the
 * career, the dock plays the release from then (Deezer 30s preview). Hold and drag to zoom into
 * five years, let go to snap to the nearest moment. Phone layout with a sticky dock; desktop
 * layout with a dark timeline rail on the left. Everything shown comes from a sourced row.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent, KeyboardEvent as RKeyboardEvent } from "react";
import { useMember, memberRpc } from "@/lib/member";
import Footer from "@/components/Footer";
import {
  type ArtistV2, type Moment, type Era, type Palette, type Release,
  PALETTES, coverUrl, sourceName, displayName,
} from "@/lib/artist-v2";

const KL: Record<Moment["kind"], string> = { rel: "RELEASE", mile: "MOMENT", show: "PAST SHOW" };
const ENERGY: Record<string, number> = { night: 46, blush: 56, ink: 30, cream: 40 };
const SITE = "https://catscandance.com";
const LS_FOLLOW = "ccd_followed_artists";

type Shape = { w: number; h: number; r: string; c: string; b: string; rot: number };
function shape(kind: Moment["kind"], dark: boolean, hot: boolean): Shape {
  const ink = dark ? "#f4efe4" : "#1d1416";
  const show = dark ? "#b6ef36" : "#dc2626";
  if (kind === "rel") return { w: hot ? 9 : 6, h: hot ? 9 : 6, r: "50%", c: ink, b: "0", rot: 0 };
  if (kind === "show") return { w: 3, h: hot ? 13 : 9, r: "1px", c: show, b: "0", rot: 0 };
  return { w: hot ? 7 : 5, h: hot ? 7 : 5, r: "0", c: "transparent", b: `1.5px solid ${ink}`, rot: 45 };
}
const Mark = ({ s, style }: { s: Shape; style?: React.CSSProperties }) => (
  <span aria-hidden="true" style={{ display: "inline-block", flex: "0 0 auto", width: s.w, height: s.h, background: s.c, borderRadius: s.r, border: s.b, transform: `rotate(${s.rot}deg)`, ...style }} />
);

function eraAt(eras: Era[], y: number): { era: Era; i: number } {
  let i = 0;
  for (let k = 0; k < eras.length; k++) if (eras[k].from <= y) i = k;
  return { era: eras[i], i };
}

const Img = ({ src, size, alt = "", style }: { src: string | null; size: number | string; alt?: string; style?: React.CSSProperties }) =>
  src ? <img src={src} alt={alt} loading="lazy" style={{ width: size, height: size, objectFit: "cover", display: "block", ...style }} /> : null;

const ext = (u: string | null | undefined) => !!u && /^https?:/.test(u);

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
  const [open, setOpen] = useState<string | null>(null);
  const [openMix, setOpenMix] = useState<number | null>(null);
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

  const audio = useRef<HTMLAudioElement | null>(null);
  const loadedTrack = useRef<string | null>(null);
  const drag = useRef<{ x0: number; y0: number; left: number; w: number; moved: boolean } | null>(null);
  const holdT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { member } = useMember();

  // Open at a shared moment: /litter/slug?at=<moment id>
  useEffect(() => {
    try {
      const at = new URLSearchParams(window.location.search).get("at");
      const m = at ? EV.find((e) => e.id === at) : null;
      if (m) { setSel(m.id); setYf(m.y); setCenter(m.y); }
      setFollowing((JSON.parse(localStorage.getItem(LS_FOLLOW) ?? "[]") as string[]).includes(a.slug));
    } catch { /* storage can be blocked */ }
  }, [EV, a.slug]);

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

  const dockTrackId = popNow ? popNow.id : playable?.trackId ?? null;
  const dock = popNow
    ? { t: popNow.t, sub: `${popNow.album} · 30s preview`, cover: coverUrl(popNow.albumId, "medium"), fill: "#333" }
    : playable
      ? {
          t: playable.track ?? playable.t,
          sub: `${playable.t} · ${playable.date}${relNow && relNow.id !== playable.id && !relNow.trackId ? ` · ${relNow.t} is not on streaming` : ""}`,
          cover: coverUrl(playable.albumId, "medium"), fill: playable.fill || "#333",
        }
      : { t: a.spotify || a.soundcloud ? "Listen" : "Nothing to play yet", sub: a.spotify ? "Spotify" : a.soundcloud ? "SoundCloud" : "", cover: null, fill: "#333" };

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
  const togglePlay = () => {
    if (playing) return stop();
    if (dockTrackId) return void playTrack(dockTrackId, false);
    if (a.spotify || a.soundcloud) setEmbed((v) => !v);
  };
  // Scrubbing to another release while playing switches the record.
  useEffect(() => {
    if (playing && dockTrackId && loadedTrack.current !== dockTrackId) void playTrack(dockTrackId, true);
  }, [dockTrackId, playing, playTrack]);

  // ── Selection and scrubbing ───────────────────────────────────────────────
  const buzz = () => { try { navigator.vibrate?.(8); } catch { /* not supported */ } };
  const slideTo = (rowId: string, elId: string) => {
    const row = document.getElementById(rowId), el = document.getElementById(elId);
    if (row && el) row.scrollTo({ left: Math.max(0, el.offsetLeft - 20), behavior: "smooth" });
  };
  const select = (e: Moment, opts?: { buzz?: boolean }) => {
    setSel(e.id); setYf(e.y); setCenter(e.y); setPop(null);
    if (e.kind === "rel") { setAllReleases((v) => v || !a.releases.find((r) => r.id === e.id)?.onTimeline); slideTo("av-rel-row", `rel-${e.id}`); }
    if (opts?.buzz) buzz();
  };
  const step = (dir: number) => {
    if (!EV.length) return;
    const i = pick ? EV.indexOf(pick) : EV.length - 1;
    select(EV[Math.min(EV.length - 1, Math.max(0, i + dir))], { buzz: true });
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

  // ── Share ─────────────────────────────────────────────────────────────────
  const shareUrl = `${SITE}/litter/${a.slug}${pick ? `?at=${encodeURIComponent(pick.id)}` : ""}`;
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

  // ── Lists ─────────────────────────────────────────────────────────────────
  const rowReleases = a.releases.filter((r) => allReleases || r.onTimeline || r.undated);
  const hiddenCount = a.releases.length - rowReleases.length;
  const story = EV.slice().reverse();
  const focus = shown ? {
    kind: KL[shown.kind], date: shown.date, t: shown.t, sub: shown.sub, src: shown.src,
    img: shown.kind === "rel" ? coverUrl(shown.albumId, "medium") : null,
    c: shown.kind === "rel" ? shown.fill : shown.kind === "show" ? p.show : p.chip,
    ink: shown.kind === "show" ? (p.dark ? "#111111" : "#ffffff") : shown.kind === "rel" ? shown.ink : p.ink,
    rad: shown.kind === "rel" ? "6px" : shown.kind === "show" ? "10px" : "50%",
    glyph: shown.kind === "rel" ? "" : shown.kind === "show" ? "LIVE" : `'${String(Math.floor(shown.y)).slice(2)}`,
  } : null;
  const watchCount = a.videos.length + a.mixes.length;
  const deskTiles = [
    ...(watchCount ? [{
      id: "watch", label: "WATCH AND LISTEN",
      head: [...a.videos.map((v) => v.title), ...a.mixes.map((m) => m.title)].slice(0, 2).join(", "),
      rows: [
        ...a.videos.map((v) => ({ a: v.title, b: v.kind?.replace(/_/g, " ") ?? sourceName(v.url) ?? "", u: v.url })),
        ...a.mixes.flatMap((m) => [
          { a: m.title, b: m.date ? `mix, ${m.date}` : "mix", u: m.url },
          ...m.tracks.map((t, i) => ({ a: `${i + 1}. ${t.title}`, b: t.artist, u: `https://www.deezer.com/search/${encodeURIComponent(`${t.artist} ${t.title}`)}` })),
        ]),
      ],
    }] : []),
    ...a.tiles,
  ];

  const css = `
html,body{overflow-x:visible!important}
@supports (overflow:clip){html,body{overflow-x:clip!important}}
.av{font-family:'Space Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.45;transition:background-color .7s ease,color .7s ease}
.av a{color:inherit;text-decoration:none}
.av .disp{font-family:'Bowlby One',Impact,sans-serif;font-weight:400}
.av .ease{transition:background-color .7s ease,color .7s ease,border-color .7s ease,opacity .4s ease}
.av .press{transition:transform .18s ease}.av .press:active{transform:scale(.97)}
.av .row{scrollbar-width:none}.av .row::-webkit-scrollbar{display:none}
.av .strip{touch-action:none;user-select:none;-webkit-user-select:none}
.av button{font:inherit;color:inherit}
.av button:focus-visible,.av a:focus-visible,.av [tabindex]:focus-visible{outline:2px solid currentColor;outline-offset:3px;border-radius:6px}
.av .hit:hover{background:rgba(127,127,127,.12)}
@keyframes avspin{to{transform:rotate(360deg)}}@keyframes aveq{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
.av .spin{animation:avspin 5s linear infinite}.av .spin.paused{animation-play-state:paused}
.av .eq span{display:block;width:2px;height:10px;background:currentColor;transform-origin:bottom;animation:aveq .9s ease-in-out infinite}
.av .eq span:nth-child(2){animation-delay:.2s}.av .eq span:nth-child(3){animation-delay:.4s}
.av .phone{display:flex}.av .desk{display:none}
@media (min-width:1024px){.av .phone{display:none}.av .desk{display:flex}}
@media (prefers-reduced-motion:reduce){.av .spin,.av .eq span{animation:none}.av *{transition:none!important}}
`;

  const PlayIcon = playing ? "❚❚" : "▶";
  const playAria = playing ? "Pause" : `Play ${dock.t}`;

  const ReleaseTile = ({ r, size, idPrefix }: { r: Release; size: number | "100%"; idPrefix: string }) => {
    const ring = relNow && r.id === relNow.id ? `0 0 0 3px ${p.bg}, 0 0 0 5px ${p.ink}` : "none";
    const cov = coverUrl(r.albumId, "big");
    return (
      <button key={r.id} className="press" id={`${idPrefix}${r.id}`} onClick={() => { if (r.undated) return; select(r); }}
        aria-label={`${r.t}, ${r.date}`}
        style={{ flex: size === "100%" ? undefined : `0 0 ${size}px`, background: "none", border: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8, textAlign: "left", cursor: r.undated ? "default" : "pointer" }}>
        <span style={{ width: size, aspectRatio: "1", height: size === "100%" ? undefined : size, borderRadius: 6, overflow: "hidden", display: "block", position: "relative", background: r.fill, color: r.ink, boxShadow: ring }}>
          {cov ? <Img src={cov} size="100%" /> : (
            <span style={{ position: "absolute", inset: 0, padding: 10, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em" }}>{a.name.toUpperCase()}</span>
              <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.05 }}>{r.t}</span>
            </span>
          )}
        </span>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{r.t}</span>
          <span style={{ fontSize: 12, color: p.mute }}>{r.date} · {r.sub.replace(" · not on streaming", "")}</span>
        </span>
      </button>
    );
  };

  const TileBox = ({ t, wide, cols }: { t: { id: string; label: string; head: string; rows: { a: string; b: string; u: string | null }[] }; wide: string; cols: number }) => {
    const isOpen = open === t.id;
    return (
      <div key={t.id} className="ease hit" style={{ position: "relative", gridColumn: isOpen ? wide : "span 1", borderRadius: 14, background: p.surface, padding: 16, display: "flex", flexDirection: "column", gap: 6, minHeight: 120, boxSizing: "border-box" }}>
        {!isOpen && <button onClick={() => setOpen(t.id)} aria-label={`Open ${t.label.toLowerCase()}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", padding: 0, border: 0, borderRadius: 14, background: "transparent", cursor: "pointer", zIndex: 1 }} />}
        <button onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen} style={{ background: "none", border: 0, padding: 0, display: "flex", justifyContent: "space-between", alignItems: "baseline", cursor: "pointer", textAlign: "left" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: p.mute }}>{t.label}</span>
          <span style={{ fontSize: 18, color: p.mute }}>{isOpen ? "−" : "+"}</span>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{t.head}</span>
        {isOpen && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, columnGap: 24, marginTop: 4 }}>
            {t.rows.map((r, i) => (
              <a key={i} className="hit" href={r.u ?? undefined} target={ext(r.u) ? "_blank" : undefined} rel="noreferrer"
                style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 4px", borderTop: `1px solid ${p.rule}`, fontSize: 14 }}>
                <span style={{ fontWeight: 700 }}>{r.a}</span><span style={{ color: p.mute, textAlign: "right" }}>{r.b}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  const FollowBtn = ({ h = 36 }: { h?: number }) => (
    <button className="press" onClick={() => void setFollow(!following)} style={{ height: h, padding: "0 16px", borderRadius: 999, border: "1.5px solid #f4efe4", background: following ? "#f4efe4" : "transparent", color: following ? "#111111" : "#f4efe4", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
      {following ? "Following" : "Follow"}
    </button>
  );
  const DatesBtn = ({ h = 36 }: { h?: number }) => a.upcoming.length ? (
    <a href="#av-upcoming" style={{ height: h, padding: "0 12px", borderRadius: 999, background: "#b6ef36", color: "#111111", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center" }}>
      {a.upcoming.length} {a.upcoming.length === 1 ? "date" : "dates"} coming up
    </a>
  ) : (
    <button className="press" onClick={onAlert} style={{ height: h, padding: "0 12px", borderRadius: 999, border: 0, background: "rgba(244,239,228,0.14)", color: "#f4efe4", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
      {member && following ? "Alert on ✓" : "Not touring · Alert me"}
    </button>
  );
  const AlertNote = () => alertNote && !member ? (
    <span style={{ fontSize: 12, color: "rgba(244,239,228,0.8)" }}>Alerts need a CCD account. <a href="/join" style={{ textDecoration: "underline" }}>Join free</a> and follow to get their dates.</span>
  ) : null;

  const Focus = ({ big }: { big?: boolean }) => focus ? (
    <div className="ease" style={{ borderRadius: 14, background: p.surface, padding: big ? 18 : 14, display: "flex", gap: 14, alignItems: "center" }}>
      <span style={{ flex: `0 0 ${big ? 64 : 56}px`, height: big ? 64 : 56, borderRadius: focus.rad, overflow: "hidden", background: focus.c, color: focus.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>
        {focus.img ? <Img src={focus.img} size={big ? 64 : 56} /> : focus.glyph}
      </span>
      <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>
          {shown && <Mark s={shape(shown.kind, p.dark, true)} />}{focus.kind} · {focus.date}
        </span>
        <span style={{ fontWeight: 700, fontSize: big ? 17 : 16, lineHeight: 1.25 }}>{focus.t}</span>
        {focus.sub && <span style={{ fontSize: 13, color: p.mute }}>{focus.sub}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        <button className="press" onClick={() => setShare(true)} style={{ fontSize: 12, fontWeight: 700, padding: "6px 10px", borderRadius: 999, border: 0, background: p.ink, color: p.bg, cursor: "pointer" }}>Share</button>
        {focus.src && <a href={focus.src} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: p.mute }}>Source</a>}
      </div>
    </div>
  ) : null;

  const Sound = ({ big }: { big?: boolean }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: p.mute }}>THE SOUND IN {year}</span>
      {era.sound && <p style={{ margin: 0, fontSize: big ? 26 : 20, fontWeight: 700, lineHeight: 1.2 }}>{era.sound.charAt(0).toUpperCase() + era.sound.slice(1)}</p>}
      {era.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {era.tags.map((x) => <span key={x} className="ease" style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: p.chip }}>{x}</span>)}
        </div>
      )}
      {era.src && <span style={{ fontSize: 12, color: p.mute }}>From <a href={era.src} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>{era.srcName ?? sourceName(era.src)}</a></span>}
    </div>
  );

  const UpcomingList = ({ id }: { id?: string }) => a.upcoming.length ? (
    <div id={id} style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 20, fontWeight: 700, paddingBottom: 6 }}>Upcoming</span>
      {a.upcoming.map((d) => {
        const dt = new Date(`${d.event_date}T00:00:00`);
        return (
          <a key={d.id} className="press" href={d.ticket_url ?? undefined} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderTop: `1px solid ${p.rule}` }}>
            <span style={{ flex: "0 0 40px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: p.link }}>{dt.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}</span>
              <span style={{ fontSize: 20, fontWeight: 700 }}>{dt.getDate()}</span>
            </span>
            <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700 }}>{d.city ?? d.title}</span>
              <span style={{ fontSize: 13, color: p.mute }}>{[d.venue, d.city ? d.title : null].filter(Boolean).join(" · ")}</span>
            </span>
            {d.ticket_url && <span style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, border: `1.5px solid ${p.ink}` }}>Tickets</span>}
          </a>
        );
      })}
    </div>
  ) : null;

  const Popular = () => a.popular.length ? (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 20, fontWeight: 700, paddingBottom: 4 }}>Popular</span>
      {a.popular.map((k, i) => {
        const cur = pop === i, live = cur && playing;
        return (
          <button key={k.id} className="press" onClick={() => { if (live) stop(); else { setPop(i); void playTrack(k.id, !cur); } }} aria-label={`${live ? "Pause" : "Play"} ${k.t}`}
            style={{ background: "none", border: 0, padding: "9px 0", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left" }}>
            <span style={{ flex: "0 0 16px", fontSize: 13, fontWeight: 700, color: cur ? p.link : p.mute, display: "flex", justifyContent: "center" }}>
              {live ? <span className="eq" aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 10 }}><span /><span /><span /></span> : i + 1}
            </span>
            <span style={{ flex: "0 0 42px", height: 42, borderRadius: 4, overflow: "hidden", background: p.chip, display: "block" }}><Img src={coverUrl(k.albumId, "small")} size={42} /></span>
            <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700, color: cur ? p.link : p.ink }}>{k.t}</span>
              <span style={{ fontSize: 13, color: p.mute }}>{k.album}</span>
            </span>
          </button>
        );
      })}
      <span style={{ fontSize: 11, color: p.mute, paddingTop: 4 }}>30 second previews from <a href={`https://www.deezer.com/artist/${a.deezerId}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Deezer</a></span>
    </div>
  ) : null;

  const AlsoLike = ({ size }: { size: number }) => a.alsoLike.length ? (
    <div className="row" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "0 0 4px" }}>
      {a.alsoLike.map((r, i) => {
        const [bg, ink] = r.internal ? [["#2563eb", "#ffffff"], ["#dc2626", "#ffffff"], ["#b6ef36", "#111111"]][i % 3] : [p.surface, p.ink];
        return (
          <a key={r.u} className="press" href={r.u} target={r.internal ? undefined : "_blank"} rel="noreferrer" style={{ flex: `0 0 ${size}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, textAlign: "center" }}>
            <span className="ease" style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: bg, color: ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700 }}>
              {r.img ? <Img src={r.img} size={size} /> : r.n.charAt(0).toUpperCase()}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{r.n}</span>
            <span style={{ fontSize: 11, color: p.mute, lineHeight: 1.2 }}>{r.why}</span>
          </a>
        );
      })}
    </div>
  ) : null;

  const embedSrc = a.spotify && /open\.spotify\.com\/artist\/([A-Za-z0-9]+)/.test(a.spotify)
    ? `https://open.spotify.com/embed/artist/${/artist\/([A-Za-z0-9]+)/.exec(a.spotify)![1]}?utm_source=generator&theme=0`
    : a.soundcloud ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(a.soundcloud)}&color=%23b6ef36&visual=false` : null;

  return (
    <div className="av" style={{ background: p.bg, color: p.ink, minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <audio ref={audio} preload="none"
        onTimeUpdate={(e) => setProg(Math.min(1, e.currentTarget.currentTime / (e.currentTarget.duration || 30)))}
        onEnded={() => { setPlaying(false); setProg(1); }} onPause={() => setPlaying(false)} />

      {/* ═════════════════════════ PHONE ═════════════════════════ */}
      <div className="phone" style={{ flexDirection: "column", maxWidth: 560, margin: "0 auto", position: "relative" }}>
        <div style={{ position: "relative", height: 470, overflow: "hidden", background: "#0b0b0b", color: "#f4efe4" }}>
          {heroBig ? <img src={heroBig} alt="" style={{ position: "absolute", left: "-15%", top: "-15%", width: "130%", height: "130%", objectFit: "cover", filter: "blur(30px) saturate(1.2)", opacity: 0.55 }} />
            : <div style={{ position: "absolute", inset: 0, background: p.fill, opacity: 0.6 }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,11,11,0.25) 0%, rgba(11,11,11,0.15) 40%, rgba(11,11,11,0.85) 100%)" }} />
          <div style={{ position: "absolute", left: 20, right: 20, top: 16, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700 }}>
            <a href="/" className="disp" style={{ fontSize: 13 }}>CATS CAN DANCE</a>
            <a href="/litter" style={{ opacity: 0.75 }}>Artists</a>
          </div>
          <div style={{ position: "absolute", left: "50%", top: 64, width: 176, height: 176, marginLeft: -118 }}>
            <div className={`spin ${playing ? "" : "paused"}`} style={{ position: "absolute", left: 66, top: 6, width: 164, height: 164, borderRadius: "50%", background: "repeating-radial-gradient(circle at 50% 50%, #0d0d0d 0 1px, #232323 1px 3px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 54, height: 54, borderRadius: "50%", background: relNow?.fill ?? p.fill }} />
            </div>
            {curCover ? <img src={curCover} alt={`${relNow?.t ?? ""} cover`} style={{ position: "absolute", inset: 0, width: 176, height: 176, objectFit: "cover", borderRadius: 6, boxShadow: "0 18px 40px rgba(0,0,0,0.5)" }} />
              : a.photo && !relNow ? <img src={a.photo} alt={a.name} style={{ position: "absolute", inset: 0, width: 176, height: 176, objectFit: "cover", borderRadius: 6, boxShadow: "0 18px 40px rgba(0,0,0,0.5)" }} />
              : (
                <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: relNow?.fill ?? p.fill, color: relNow?.ink ?? "#f4efe4", boxShadow: "0 18px 40px rgba(0,0,0,0.5)", padding: 14, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em" }}>{a.name.toUpperCase()}</span>
                  <span style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.05 }}>{relNow?.t ?? ""}</span>
                </div>
              )}
          </div>
          <div style={{ position: "absolute", left: 20, right: 20, bottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {a.line && <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.8 }}>{a.line}</span>}
            <h1 className="disp" style={{ margin: 0, fontSize: a.name.length > 12 ? 42 : 56, lineHeight: 0.9 }}>{a.name.toUpperCase()}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <button className="press" onClick={togglePlay} aria-label={playAria} disabled={nothingPlayable && !embedSrc} style={{ width: 48, height: 48, borderRadius: "50%", border: 0, background: "#b6ef36", color: "#111111", fontSize: 15, cursor: "pointer" }}>{PlayIcon}</button>
              {FollowBtn({})}
              <span style={{ marginLeft: "auto" }}>{DatesBtn({})}</span>
            </div>
            {AlertNote()}
          </div>
        </div>

        <div style={{ padding: "24px 20px 0" }}>{Sound({})}</div>
        <div style={{ margin: "18px 20px 0" }}>{Focus({})}</div>
        {a.upcoming.length > 0 && <div style={{ margin: "30px 20px 0" }}>{UpcomingList({id: "av-upcoming"})}</div>}

        {a.releases.length > 0 && (
          <div style={{ marginTop: 30, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "0 20px 12px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 20, fontWeight: 700 }}>Releases</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: p.mute }}>{a.releases.length} records</span>
            </div>
            <div className="row" id="av-rel-row" style={{ display: "flex", gap: 14, overflowX: "auto", padding: "0 20px 6px" }}>
              {rowReleases.map((r) => ReleaseTile({r: r, size: 132, idPrefix: "rel-"}))}
              {hiddenCount > 0 && (
                <button className="press" onClick={() => setAllReleases(true)} style={{ flex: "0 0 132px", height: 132, borderRadius: 6, border: `1.5px dashed ${p.mute}`, background: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  + {hiddenCount} singles
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ margin: "30px 20px 0" }}>{Popular()}</div>

        {watchCount > 0 && (
          <div style={{ margin: "30px 20px 0", display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>Watch and listen</span>
            {a.videos.map((v) => (
              <a key={v.url} className="press" href={v.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ flex: "0 0 120px", height: 68, borderRadius: 6, background: "#111111", position: "relative", display: "block" }}>
                  <span style={{ position: "absolute", left: "50%", top: "50%", width: 30, height: 30, margin: "-15px 0 0 -15px", borderRadius: "50%", background: "#f4efe4", color: "#111111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>▶</span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontWeight: 700 }}>{v.title}</span>
                  <span style={{ fontSize: 13, color: p.mute }}>{[v.kind?.replace(/_/g, " "), sourceName(v.url)].filter(Boolean).join(" · ")}</span>
                </span>
              </a>
            ))}
            {a.mixes.map((m, mi) => (
              <div key={m.url} className="ease" style={{ borderRadius: 12, background: p.surface, padding: "12px 14px", display: "flex", flexDirection: "column" }}>
                <button onClick={() => setOpenMix(openMix === mi ? null : mi)} aria-expanded={openMix === mi} style={{ background: "none", border: 0, padding: 0, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ flex: "1 1 auto", display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 700 }}>{m.title}</span>
                    <span style={{ fontSize: 13, color: p.mute }}>{[m.date, m.tracks.length ? `${m.tracks.length} tracks` : null].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span style={{ fontSize: 18, color: p.mute }}>{openMix === mi ? "−" : "+"}</span>
                </button>
                {openMix === mi && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
                    {m.tracks.map((t, i) => (
                      <a key={i} href={`https://www.deezer.com/search/${encodeURIComponent(`${t.artist} ${t.title}`)}`} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 12, padding: "7px 0", borderTop: `1px solid ${p.rule}`, fontSize: 14 }}>
                        <span style={{ flex: "0 0 18px", color: p.mute }}>{i + 1}</span>
                        <span style={{ minWidth: 0 }}><span style={{ fontWeight: 700 }}>{t.title}</span> <span style={{ color: p.mute }}>{t.artist}</span></span>
                      </a>
                    ))}
                    <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 700, paddingTop: 8, borderTop: `1px solid ${p.rule}`, color: p.link }}>Listen on {sourceName(m.url)}</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {a.tiles.length > 0 && (
          <div style={{ margin: "30px 20px 0", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gridAutoFlow: "dense", gap: 10 }}>
            {a.tiles.map((t) => TileBox({t: t, wide: "span 2", cols: 1}))}
          </div>
        )}

        {story.length > 0 && (
          <div style={{ margin: "34px 20px 0", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 700 }}>Story</span>
              <span style={{ fontSize: 12, color: p.mute }}>tap to jump there</span>
            </div>
            {story.map((e, i) => {
              const y = Math.floor(e.y), prev = i > 0 ? Math.floor(story[i - 1].y) : null, on = pick?.id === e.id;
              return (
                <button key={e.id} id={`st-${e.id}`} onClick={() => select(e)} className="ease" style={{ border: 0, cursor: "pointer", textAlign: "left", display: "grid", gridTemplateColumns: "40px 14px 1fr", gap: 10, alignItems: "start", padding: 10, margin: "0 -10px", borderRadius: 10, background: on ? p.surface : "transparent" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: p.mute, opacity: y === prev ? 0 : 1 }}>{y}</span>
                  <span style={{ display: "flex", justifyContent: "center", paddingTop: 7 }}><Mark s={shape(e.kind, p.dark, on)} /></span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontWeight: 700 }}>{e.t}</span>
                    {e.sub && <span style={{ fontSize: 13, color: p.mute }}>{e.sub}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {a.alsoLike.length > 0 && (
          <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ padding: "0 20px", fontSize: 20, fontWeight: 700 }}>Fans also like</span>
            <div style={{ padding: "0 20px" }}>{AlsoLike({size: 76})}</div>
          </div>
        )}

        <PageFoot p={p} a={a} />

        {/* Dock: the player and the career scrubber */}
        <div style={{ position: "sticky", bottom: 12, margin: "24px 10px 12px", zIndex: 20, borderRadius: 18, background: "#141414", color: "#f4efe4", boxShadow: "0 12px 34px rgba(0,0,0,0.3)", padding: "12px 14px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
          {embed && embedSrc && (
            <iframe title={`${a.name} player`} src={embedSrc} width="100%" height="152" style={{ border: 0, borderRadius: 12 }} allow="autoplay; clipboard-write; encrypted-media" loading="lazy" />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ flex: "0 0 42px", height: 42, borderRadius: 4, overflow: "hidden", background: dock.fill, display: "block" }}><Img src={dock.cover} size={42} /></span>
            <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dock.t}</span>
              <span style={{ fontSize: 12, color: "rgba(244,239,228,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{audioErr ?? dock.sub}</span>
            </span>
            <button className="press" onClick={togglePlay} aria-label={playAria} style={{ flex: "0 0 40px", height: 40, borderRadius: "50%", border: 0, background: "#b6ef36", color: "#111111", fontSize: 14, cursor: "pointer" }}>{PlayIcon}</button>
          </div>
          <div style={{ height: 2, background: "rgba(244,239,228,0.14)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: 2, width: `${prog * 100}%`, background: "#b6ef36" }} /></div>

          {EV.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, height: 22 }}>
                <span className="disp" style={{ fontSize: 16, lineHeight: 1, color: "#b6ef36" }}>{year}</span>
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
                  {bars.map((b, i) => <span key={i} style={{ flex: "1 1 0", height: b.h, maxHeight: "100%", borderRadius: 1, background: b.c }} />)}
                </div>
                {marks.map((m) => (
                  <span key={m.id} aria-hidden="true" style={{ position: "absolute", left: `${m.left}%`, top: zoom ? 44 : 29, width: m.sh.w, height: m.sh.h, marginLeft: -m.sh.w / 2, background: m.sh.c, borderRadius: m.sh.r, border: m.sh.b, transform: `rotate(${m.sh.rot}deg)`, pointerEvents: "none", transition: "left 0.15s ease" }} />
                ))}
                {ticks.map((t) => (
                  <span key={t.n} aria-hidden="true" style={{ position: "absolute", left: `${t.left}%`, bottom: 0, transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: "rgba(244,239,228,0.5)", pointerEvents: "none" }}>{t.n}</span>
                ))}
                {zoom && (
                  <span aria-hidden="true" style={{ position: "absolute", left: `${headPct}%`, top: -30, transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 999, background: "#f4efe4", color: "#111111", pointerEvents: "none" }}>{bubble}</span>
                )}
                <span aria-hidden="true" style={{ position: "absolute", top: -3, height: zoom ? 46 : 32, left: `${headPct}%`, width: 2, marginLeft: -1, background: "#f4efe4", borderRadius: 2, pointerEvents: "none" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 14, fontSize: 10, color: "rgba(244,239,228,0.45)", paddingTop: 2, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mark s={shape("rel", true, false)} />release</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mark s={shape("show", true, false)} />show</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mark s={shape("mile", true, false)} />moment</span>
                <span>hold and drag to zoom</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═════════════════════════ DESKTOP ═════════════════════════ */}
      <div className="desk" style={{ minHeight: "100vh" }}>
        <aside style={{ flex: "0 0 300px", boxSizing: "border-box", background: "#141414", color: "#f4efe4", padding: "22px 22px 28px", display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a href="/" className="disp" style={{ fontSize: 14 }}>CATS CAN DANCE</a>
            <a href="/litter" style={{ fontSize: 12, opacity: 0.6 }}>Artists</a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 14, background: "#1f1f1f" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ flex: "0 0 48px", height: 48, borderRadius: 4, overflow: "hidden", background: dock.fill, display: "block" }}><Img src={dock.cover} size={48} /></span>
              <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dock.t}</span>
                <span style={{ fontSize: 12, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{audioErr ?? dock.sub}</span>
              </span>
              <button className="press" onClick={togglePlay} aria-label={playAria} style={{ flex: "0 0 40px", height: 40, borderRadius: "50%", border: 0, background: "#b6ef36", color: "#111111", cursor: "pointer" }}>{PlayIcon}</button>
            </div>
            <div style={{ height: 2, background: "rgba(244,239,228,0.14)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: 2, width: `${prog * 100}%`, background: "#b6ef36" }} /></div>
            {embed && embedSrc && <iframe title={`${a.name} player`} src={embedSrc} width="100%" height="152" style={{ border: 0, borderRadius: 12 }} allow="autoplay; clipboard-write; encrypted-media" loading="lazy" />}
          </div>
          {EV.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.55 }}>THE YEARS</span>
                <span style={{ fontSize: 11, opacity: 0.45 }}>↑↓ or click</span>
              </div>
              <div role="listbox" aria-label={`${a.name}'s career`} tabIndex={0} onKeyDown={onKey} style={{ position: "relative", flex: "1 1 auto", display: "flex", flexDirection: "column" }}>
                <div style={{ position: "absolute", left: 47, top: 6, bottom: 6, width: 2, background: "rgba(244,239,228,0.14)" }} />
                {EV.map((e, i) => {
                  const on = pick?.id === e.id, y = Math.floor(e.y), prev = i > 0 ? Math.floor(EV[i - 1].y) : null;
                  return (
                    <button key={e.id} role="option" aria-selected={on} className="hit" onClick={() => select(e)} style={{ background: on ? "rgba(244,239,228,0.1)" : "transparent", border: 0, borderRadius: 8, padding: "5px 6px", display: "grid", gridTemplateColumns: "34px 16px 1fr", gap: 6, alignItems: "center", cursor: "pointer", textAlign: "left", position: "relative" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, opacity: y === prev ? 0 : 1, color: on ? "#b6ef36" : "#f4efe4" }}>{y}</span>
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

        <main style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ position: "relative", height: 380, overflow: "hidden", background: "#0b0b0b", color: "#f4efe4" }}>
            {heroBig ? <img src={heroBig} alt="" style={{ position: "absolute", left: "-10%", top: "-30%", width: "120%", height: "160%", objectFit: "cover", filter: "blur(40px) saturate(1.2)", opacity: 0.5 }} />
              : <div style={{ position: "absolute", inset: 0, background: p.fill, opacity: 0.6 }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(11,11,11,0.75) 0%, rgba(11,11,11,0.2) 70%)" }} />
            <div style={{ position: "absolute", left: 56, right: 56, bottom: 48, display: "flex", alignItems: "flex-end", gap: 40 }}>
              <div style={{ flex: "0 0 240px", height: 240, borderRadius: 6, overflow: "hidden", background: relNow?.fill ?? p.fill, color: relNow?.ink ?? "#f4efe4", boxShadow: "0 24px 50px rgba(0,0,0,0.5)", position: "relative" }}>
                {curCover ? <Img src={curCover} size={240} alt={`${relNow?.t ?? ""} cover`} /> : a.photo && !relNow ? <Img src={a.photo} size={240} alt={a.name} /> : (
                  <span style={{ position: "absolute", inset: 0, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em" }}>{a.name.toUpperCase()}</span>
                    <span style={{ fontWeight: 700, fontSize: 26, lineHeight: 1.05 }}>{relNow?.t ?? ""}</span>
                  </span>
                )}
              </div>
              <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {a.line && <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.8 }}>{a.line}</span>}
                <h1 className="disp" style={{ margin: 0, fontSize: a.name.length > 12 ? 72 : 96, lineHeight: 0.88 }}>{a.name.toUpperCase()}</h1>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="press" onClick={togglePlay} aria-label={playAria} style={{ height: 44, padding: "0 22px", borderRadius: 999, border: 0, background: "#b6ef36", color: "#111111", fontWeight: 700, cursor: "pointer" }}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
                  {FollowBtn({h: 44})}
                  {DatesBtn({h: 44})}
                </div>
                {AlertNote()}
              </div>
            </div>
          </div>

          <div style={{ padding: "36px 56px 0", display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)", gap: 40 }}>
            {Sound({big: true})}
            <div style={{ alignSelf: "start", display: "flex", flexDirection: "column", gap: 24 }}>
              {Focus({big: true})}
              {UpcomingList({id: "av-upcoming-d"})}
            </div>
          </div>

          {a.releases.length > 0 && (
            <div style={{ padding: "40px 56px 0", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>Releases</span>
                {hiddenCount > 0 && <button onClick={() => setAllReleases(true)} style={{ background: "none", border: 0, cursor: "pointer", fontSize: 13, fontWeight: 700, color: p.mute }}>Show all {a.releases.length}</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 18 }}>
                {rowReleases.map((r) => ReleaseTile({r: r, size: "100%", idPrefix: "drel-"}))}
              </div>
            </div>
          )}

          {a.popular.length > 0 && <div style={{ padding: "40px 56px 0", maxWidth: 640 }}>{Popular()}</div>}

          {deskTiles.length > 0 && (
            <div style={{ padding: "40px 56px 0", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gridAutoFlow: "dense", gap: 16, alignItems: "start" }}>
              {deskTiles.map((t) => TileBox({t: t, wide: "span 4", cols: 2}))}
            </div>
          )}

          {a.alsoLike.length > 0 && (
            <div style={{ padding: "40px 56px 0", display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>Fans also like</span>
              {AlsoLike({size: 88})}
            </div>
          )}

          <div style={{ padding: "0 36px" }}><PageFoot p={p} a={a} /></div>
        </main>
      </div>

      {share && (
        <div role="dialog" aria-modal="true" aria-label="Share" onClick={() => setShare(false)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, borderRadius: "20px 20px 0 0", background: "#f4efe4", color: "#111111", padding: "18px 20px 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, boxSizing: "border-box" }}>
            <span style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(17,17,17,0.2)" }} />
            <div style={{ width: 200, height: 356, borderRadius: 14, overflow: "hidden", position: "relative", background: "#0b0b0b", color: "#f4efe4", boxShadow: "0 12px 30px rgba(0,0,0,0.3)" }}>
              {heroBig ? <img src={heroBig} alt="" style={{ position: "absolute", inset: "-20%", width: "140%", height: "140%", objectFit: "cover", filter: "blur(16px)", opacity: 0.6 }} /> : <div style={{ position: "absolute", inset: 0, background: p.fill, opacity: 0.7 }} />}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.8))" }} />
              <div className="disp" style={{ position: "absolute", left: 14, right: 14, top: 14, fontSize: 9 }}>CATS CAN DANCE</div>
              <div style={{ position: "absolute", left: 14, right: 14, bottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="disp" style={{ fontSize: 40, lineHeight: 0.9, color: "#b6ef36" }}>{year}</span>
                <span className="disp" style={{ fontSize: a.name.length > 10 ? 18 : 22, lineHeight: 0.95 }}>{a.name.toUpperCase()}</span>
                <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{shown?.t}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>catscandance.com/litter/{a.slug}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button className="press" onClick={() => void shareStory()} style={{ flex: "1 1 0", height: 44, borderRadius: 999, border: 0, background: "#111111", color: "#f4efe4", fontWeight: 700, cursor: "pointer" }}>Share to story</button>
              <button className="press" onClick={() => void copyLink()} style={{ flex: "1 1 0", height: 44, borderRadius: 999, border: "1.5px solid #111111", background: "transparent", color: "#111111", fontWeight: 700, cursor: "pointer" }}>{copied ? "Copied" : "Copy link"}</button>
            </div>
            <button onClick={() => setShare(false)} style={{ fontSize: 13, color: "rgba(17,17,17,0.6)", background: "none", border: 0, cursor: "pointer" }}>Close</button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

function PageFoot({ p, a }: { p: Palette; a: ArtistV2 }) {
  return (
    <div style={{ margin: "34px 20px 0", paddingTop: 16, borderTop: `1px solid ${p.rule}`, display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: p.mute }}>
      {a.links.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", fontWeight: 700 }}>
          {a.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>)}
        </div>
      )}
      <span>
        Compiled by Cats Can Dance from press, labels, listings and Deezer. Every line links to its source.{" "}
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
    g.fillText("catscandance.com/litter", 72, H - 110);
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
