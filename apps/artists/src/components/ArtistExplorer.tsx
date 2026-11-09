"use client";
/**
 * The artist's work, explored (boards W40-Artist and A40-Artist, with the eras and the drawer from the
 * live v2 page). Pick an era and every list below narrows to those years. Click a record, a show or a
 * moment and it opens in the drawer: play it, read the tracklist, say you were there, watch what goes
 * with it. A preview player sits at the bottom. "#ask" anywhere on the page opens the booking drawer,
 * "#play" plays their best known track.
 * Data: getArtistV2 (database rows with sources, plus Deezer at request time). Previews and tracklists
 * come through /api/deezer. Nothing here is invented; a block with nothing in it is not drawn.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Sleeve } from "@ccd/ui";
import {
  type ArtistV2, type Era, type Release, type Moment, type Mix, type Video, coverUrl, sourceName, embedFor, bandcampEmbed, ytThumb,
} from "@/lib/artist-v2";
import { setWasThere, wasThereState } from "@/lib/booking-actions";
import AskForm from "@/components/AskForm";

type Focus = { kind: "rel" | "show" | "mile"; id: string } | { kind: "media"; url: string; title: string } | { kind: "ask" } | null;
type Track = { trackId: string; t: string; sub: string; cover: string | null; y: number | null };
type AlbumTrack = { id: string; t: string; d: number | null };

const TYPE: Record<string, string> = { album: "Album", ep: "EP", single: "Single", remix: "Remix", compilation: "Compilation" };
const LS_WAS = "ccd_i_was_there";
const short = (e: Era) => (e.to == null ? `${e.from} on` : e.from === e.to ? String(e.from) : `${e.from} to ${String(e.to).slice(2)}`);
const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const mmss = (s: number | null) => (s == null ? "" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
const noteless = (t: string) => t.replace(/\s*\((?=[^)]*\b(?:tracklist|no date|on page|unverified|unconfirmed|source)\b)[^)]*\)/gi, "").trim() || t;
const STOP = new Set(["festival", "presents", "present", "feat", "featuring", "with", "live", "the", "and", "night", "party", "tour", "event", "edition", "special", "music", "debut", "india", "from", "this", "that", "review", "album", "new"]);
const toks = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w) && !/^(19|20)\d{2}$/.test(w));

export default function ArtistExplorer({ a, name, today, rate }: { a: ArtistV2; name: string; today: string; rate: string | null }) {
  const eras = useMemo(() => (a.eraReal && a.eras.length >= 2 ? a.eras : []), [a.eraReal, a.eras]);
  const hasEras = eras.length >= 2;
  const nowY = Number(today.slice(0, 4));

  const [eraId, setEraId] = useState("all");
  const [type, setType] = useState("all");
  const [focus, setFocus] = useState<Focus>(null);
  const [allRels, setAllRels] = useState(false);
  const [allShows, setAllShows] = useState(false);
  const [tab, setTab] = useState("");
  const [albums, setAlbums] = useState<Record<string, AlbumTrack[] | "loading" | "none">>({});
  const [cur, setCur] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const [audioErr, setAudioErr] = useState<string | null>(null);
  const [queue, setQueue] = useState<{ list: Track[]; i: number } | null>(null);
  const [was, setWas] = useState<Record<string, boolean>>({});
  const [wasCounts, setWasCounts] = useState<Record<string, number>>({});
  const [wasNote, setWasNote] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const loaded = useRef<string | null>(null);
  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  /* ── Eras ── */
  const eraOfY = useCallback((y: number | null | undefined): Era | null => {
    if (!hasEras || y == null) return null;
    const yy = Math.floor(y);
    return eras.find((e) => yy >= e.from && yy <= (e.to ?? 9999)) ?? (yy < eras[0].from ? eras[0] : eras[eras.length - 1]);
  }, [eras, hasEras]);
  const era = hasEras ? eras.find((e) => e.id === eraId) ?? null : null;
  const inEra = (y: number | null | undefined) => !era || (y != null && Math.floor(y) >= era.from && Math.floor(y) <= (era.to ?? 9999));
  const dotOf = (y: number | null | undefined) => eraOfY(y)?.accent ?? null;

  /* ── What can play ── */
  const relTrack = useCallback((r: Release): Track | null => (r.trackId ? { trackId: r.trackId, t: r.track ?? r.t, sub: `${r.t} · ${r.date}`, cover: coverUrl(r.albumId, "medium"), y: r.undated ? null : r.y } : null), []);
  const firstTrack = useMemo<Track | null>(() => {
    const p = a.popular[0];
    if (p) return { trackId: p.id, t: p.t, sub: `${p.album}${p.y ? ` · ${Math.floor(p.y)}` : ""}`, cover: coverUrl(p.albumId, "medium"), y: p.y };
    const r = a.releases.filter((x) => x.trackId && !x.undated).sort((x, y) => y.y - x.y)[0];
    return r ? relTrack(r) : null;
  }, [a.popular, a.releases, relTrack]);
  const track = cur ?? firstTrack;
  const theme = era ?? eraOfY(track?.y) ?? (hasEras ? eras[eras.length - 1] : null);
  const accent = theme?.accent ?? "var(--k-pc)";

  // Start here: one track per era, oldest first.
  const tour = useMemo<Track[]>(() => {
    if (!hasEras) return [];
    const out: Track[] = [];
    for (const e of eras) {
      const inside = (y: number | null) => y != null && Math.floor(y) >= e.from && Math.floor(y) <= (e.to ?? 9999);
      const p = a.popular.find((x) => inside(x.y));
      if (p) { out.push({ trackId: p.id, t: p.t, sub: `${e.label} · ${p.album}`, cover: coverUrl(p.albumId, "medium"), y: p.y }); continue; }
      const r = a.releases.filter((x) => x.trackId && !x.undated && inside(x.y)).sort((x, y) => (x.type === "album" ? -1 : 0) - (y.type === "album" ? -1 : 0) || y.y - x.y)[0];
      const t = r ? relTrack(r) : null;
      if (t && r) out.push({ ...t, sub: `${e.label} · ${r.t}` });
    }
    return out;
  }, [a.popular, a.releases, eras, hasEras, relTrack]);

  /* ── Audio ── */
  const play = useCallback(async (t: Track, keepQueue = false) => {
    const el = audio.current;
    if (!el) return;
    if (!keepQueue) setQueue(null);
    setAudioErr(null);
    setCur(t);
    try {
      if (loaded.current !== t.trackId) {
        const r = await fetch(`/api/deezer/track/${t.trackId}`);
        if (!r.ok) throw new Error("no preview");
        el.src = (await r.json()).preview;
        loaded.current = t.trackId;
        setProg(0);
      } else if (el.ended) el.currentTime = 0;
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setAudioErr("No preview for this one");
    }
  }, []);
  const pause = useCallback(() => { audio.current?.pause(); setPlaying(false); }, []);
  const toggle = (t: Track | null) => { if (!t) return; if (playing && track?.trackId === t.trackId) pause(); else void play(t); };
  const next = useCallback(() => {
    const q = queueRef.current;
    if (!q || q.i + 1 >= q.list.length) { setQueue(null); pause(); return; }
    const i = q.i + 1;
    setQueue({ list: q.list, i });
    const e = eraOfY(q.list[i].y);
    if (e) setEraId(e.id);
    void play(q.list[i], true);
  }, [eraOfY, pause, play]);
  const startHere = () => {
    if (!tour.length) return;
    setQueue({ list: tour, i: 0 });
    const e = eraOfY(tour[0].y);
    if (e) setEraId(e.id);
    void play(tour[0], true);
  };

  /* ── The page's own links: #ask opens the booking drawer, #play plays, ?at= and ?era= open a moment ── */
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash;
      if (h === "#ask") { setFocus({ kind: "ask" }); history.replaceState(null, "", window.location.pathname + window.location.search); }
      if (h === "#play" && firstTrack) { void play(firstTrack); history.replaceState(null, "", window.location.pathname + window.location.search); }
      if (h.startsWith("#open=")) {
        const id = decodeURIComponent(h.slice(6));
        const r = a.releases.find((x) => x.id === id);
        if (r) { setFocus({ kind: "rel", id }); const t = relTrack(r); if (t) void play(t); }
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };
    const q = new URLSearchParams(window.location.search);
    const at = q.get("at");
    const e = q.get("era");
    // Read the link once on arrival; set in a microtask so the first paint matches the server.
    queueMicrotask(() => {
      if (e && eras.some((x) => x.id === e)) setEraId(e);
      if (at) {
        const r = a.releases.find((x) => x.id === at);
        const m = a.moments.find((x) => x.id === at);
        if (r) setFocus({ kind: "rel", id: r.id });
        else if (m) setFocus({ kind: m.kind === "show" ? "show" : m.kind === "rel" ? "rel" : "mile", id: m.id });
      }
      onHash();
    });
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [a.releases, a.moments, eras, firstTrack, play, relTrack]);

  useEffect(() => {
    let live = true;
    wasThereState(a.slug).then((s) => {
      if (!live) return;
      let local: string[] = [];
      try { local = (JSON.parse(localStorage.getItem(LS_WAS) ?? "{}") as Record<string, string[]>)[a.slug] ?? []; } catch { /* storage blocked */ }
      setWas(Object.fromEntries([...local, ...s.mine].map((id) => [id, true])));
      setWasCounts(s.counts);
    });
    return () => { live = false; };
  }, [a.slug]);

  useEffect(() => {
    if (!focus) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setFocus(null); };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [focus]);

  const fRel = focus?.kind === "rel" ? a.releases.find((r) => r.id === focus.id) ?? null : null;
  const fMom = focus && (focus.kind === "show" || focus.kind === "mile") ? a.moments.find((m) => m.id === focus.id) ?? null : null;
  const albumId = fRel && ["album", "ep", "compilation"].includes(fRel.type) ? fRel.albumId : null;
  useEffect(() => {
    if (!albumId || albums[albumId]) return;
    let live = true;
    queueMicrotask(() => live && setAlbums((m) => ({ ...m, [albumId]: "loading" })));
    fetch(`/api/deezer/album/${albumId}`).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (live) setAlbums((m) => ({ ...m, [albumId]: j?.tracks?.length ? (j.tracks as AlbumTrack[]) : "none" }));
    }).catch(() => live && setAlbums((m) => ({ ...m, [albumId]: "none" })));
    return () => { live = false; };
  }, [albumId, albums]);

  const open = (kind: "rel" | "show" | "mile", id: string, y: number | null) => {
    setFocus({ kind, id });
    const e = eraOfY(y);
    if (e && eraId !== "all") setEraId(e.id);
  };
  const pickEra = (id: string) => { setEraId(id); setType("all"); setAllRels(false); setAllShows(false); };

  const toggleWas = async (id: string) => {
    const on = !was[id];
    setWas((w) => ({ ...w, [id]: on }));
    setWasCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + (on ? 1 : -1)) }));
    try {
      const all = JSON.parse(localStorage.getItem(LS_WAS) ?? "{}") as Record<string, string[]>;
      const mine = new Set(all[a.slug] ?? []);
      if (on) mine.add(id); else mine.delete(id);
      all[a.slug] = [...mine];
      localStorage.setItem(LS_WAS, JSON.stringify(all));
    } catch { /* storage blocked */ }
    const r = await setWasThere(a.slug, id, on);
    setWasNote(r.ok ? null : "Saved on this phone. Sign in to keep it on your profile.");
  };
  const share = async (path: string) => {
    const url = `${window.location.origin}${path}`;
    try { if (navigator.share) { await navigator.share({ title: name, url }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(url); } catch { /* nothing to do */ }
  };

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
    return { videos: a.videos.filter((x) => hit(`${x.title} ${x.note ?? ""}`)).slice(0, 3), press: a.press.filter((x) => hit(`${x.title} ${x.excerpt ?? ""}`)).slice(0, 3), mixes: a.mixes.filter((x) => hit(x.title)).slice(0, 2) };
  }, [a]);

  /* ── Lists, narrowed to the era ── */
  const isPast = (m: Moment) => (m.day ? m.day <= today : Math.floor(m.y) < nowY);
  const shows = a.moments.filter((m) => m.kind === "show" && isPast(m) && inEra(m.y)).slice().reverse();
  const miles = a.moments.filter((m) => m.kind === "mile" && inEra(m.y)).slice().reverse();
  const relEra = a.releases.filter((r) => (r.undated ? !era : inEra(r.y)));
  const ofType = (r: Release, t: string) => t === "all" || (t === "single" ? !["album", "ep", "remix"].includes(r.type) : r.type === t);
  const types = ["album", "ep", "single", "remix"].map((t) => ({ t, n: relEra.filter((r) => ofType(r, t)).length })).filter((x) => x.n > 0);
  const rels = relEra.filter((r) => ofType(r, type));
  type Watch = { key: string; title: string; url: string; kind: string; meta: string; img: string | null; mix?: Mix };
  const watch: Watch[] = [
    ...a.videos.filter((v: Video) => (v.y == null ? !era : inEra(v.y))).map((v) => ({ key: v.url, title: noteless(v.title), url: v.url, kind: v.kind ? v.kind.replace(/_/g, " ") : "Video", meta: sourceName(v.url) ?? "", img: ytThumb(v.url) })),
    ...a.mixes.filter((m) => (m.y == null ? !era : inEra(m.y))).map((m) => ({ key: m.url, title: noteless(m.title), url: m.url, kind: "Mix", meta: [sourceName(m.url), m.date, m.tracks.length ? `${m.tracks.length} tracks` : null].filter(Boolean).join(" · "), img: ytThumb(m.url), mix: m })),
  ];
  const press = a.press.filter((x) => (x.y == null ? !era : inEra(x.y)));
  const photos = a.photos;
  const tabs = [
    { id: "labels", label: "Labels", n: a.groups.filter((g) => g.kind === "label").length },
    { id: "crews", label: "Crews and bands", n: a.groups.filter((g) => g.kind === "collective").length },
    { id: "worked", label: "Worked with", n: a.worked.length },
    { id: "fests", label: "Festivals", n: a.festivals.length },
  ].filter((t) => t.n > 0);
  const tabId = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id ?? "";
  const eraCovers = (e: Era) => a.releases.filter((r) => r.albumId && !r.undated && Math.floor(r.y) >= e.from && Math.floor(r.y) <= (e.to ?? 9999)).sort((x, y) => Number(["album", "ep"].includes(y.type)) - Number(["album", "ep"].includes(x.type))).slice(0, 3).map((r) => coverUrl(r.albumId, "medium")!);
  const eraCount = (e: Era) => a.releases.filter((r) => !r.undated && Math.floor(r.y) >= e.from && Math.floor(r.y) <= (e.to ?? 9999)).length + a.moments.filter((m) => m.kind === "show" && Math.floor(m.y) >= e.from && Math.floor(m.y) <= (e.to ?? 9999)).length;

  const scope = era ? { k: `${era.label}, ${short(era)}`, t: era.sound ?? "" } : { k: `Every era · ${eras[0]?.from ?? ""} to now`, t: `${eras.length} eras. The dot on each record shows which.` };

  const mf = focus?.kind === "media" ? focus : null;
  const mediaPanel = mf ? (() => {
              const em = embedFor(mf.url);
              return (
                <div>
                  <span className="k-m">Watch</span>
                  <h2 className="k-d mt-2 text-[32px]">{mf.title}</h2>
                  {em ? <iframe title={mf.title} src={em.src} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" style={{ width: "100%", height: Math.max(em.h, 260), border: 0, borderRadius: 16, marginTop: 16, background: "#000" }} /> : null}
                  <a className="k-btn mt-4" href={mf.url} target="_blank" rel="noopener">Open on {sourceName(mf.url) ?? "the site"}</a>
                </div>
              );
            })() : null;
  const relPanel = fRel ? (() => {
              const t = relTrack(fRel);
              const list = fRel.albumId ? albums[fRel.albumId] : undefined;
              const rel = related(fRel.t, null);
              const bc = !fRel.trackId ? bandcampEmbed(fRel.bandcamp) : null;
              return (
                <div>
                  <div className="ax-cover"><Sleeve title={fRel.t} label={fRel.label} cover={coverUrl(fRel.albumId, "xl")} fontSize={48} out={!!t && playing && track?.trackId === t.trackId} /></div>
                  <span className="k-m mt-6 flex items-center gap-2"><Dot c={dotOf(fRel.undated ? null : fRel.y)} />{[TYPE[fRel.type] ?? "Release", fRel.undated ? null : fRel.date, eraOfY(fRel.undated ? null : fRel.y)?.label].filter(Boolean).join(" · ")}</span>
                  <h2 className="k-d mt-2 text-[44px]">{fRel.t}</h2>
                  {fRel.label && <p className="k-b mt-1">on {fRel.label}</p>}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {/* eslint-disable-next-line react-hooks/refs -- toggle reads the audio element only when clicked */}
                    {t && <button type="button" className="k-btn k-btn--key" onClick={() => toggle(t)}>{playing && track?.trackId === t.trackId ? "Pause" : `Play ${t.t}`}</button>}
                    {fRel.links.slice(0, 3).map((l) => <a key={l.url} className="k-btn" href={l.url} target="_blank" rel="noopener">{l.label}</a>)}
                    <button type="button" className="k-btn" onClick={() => void share(`/${a.slug}?at=${encodeURIComponent(fRel.id)}`)}>Share</button>
                  </div>
                  {Array.isArray(list) && (
                    <ol className="ax-tracks">
                      {list.map((x, i) => {
                        const on = track?.trackId === x.id;
                        return <li key={x.id}><button type="button" onClick={() => toggle({ trackId: x.id, t: x.t, sub: `${fRel.t} · ${fRel.date}`, cover: coverUrl(fRel.albumId, "medium"), y: fRel.y })} style={{ color: on ? "var(--ax)" : undefined }}><span className="k-m">{on && playing ? <Eq /> : i + 1}</span><b>{x.t}</b><span className="k-m">{mmss(x.d)}</span></button></li>;
                      })}
                    </ol>
                  )}
                  {list === "loading" && <p className="k-b mt-4">Loading the tracklist</p>}
                  {bc && <iframe title={`${fRel.t} on Bandcamp`} src={bc.src} loading="lazy" style={{ border: 0, width: "100%", height: bc.h, marginTop: 16 }} />}
                  <Also rel={rel} onMedia={(url, title) => setFocus({ kind: "media", url, title })} />
                </div>
              );
            })() : null;
  const momPanel = fMom ? (() => {
              const isShow = fMom.kind === "show";
              const rel = related(fMom.t, fMom.venue);
              const vid = rel.videos.find((v) => ytThumb(v.url));
              const n = wasCounts[fMom.id] ?? 0;
              return (
                <div>
                  {vid ? <button type="button" className="ax-thumb ax-wide" onClick={() => setFocus({ kind: "media", url: vid.url, title: vid.title })}><img src={ytThumb(vid.url)!} alt="" /><span className="ax-pl"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg></span></button>
                    : <div className="ax-ticket" style={{ ["--ea" as string]: dotOf(fMom.y) ?? "var(--k-pc)" } as CSSProperties}><span className="k-m">{isShow ? "Admit one" : "Moment"}</span><b className="k-d">{fMom.city ?? Math.floor(fMom.y)}</b><span className="k-m">{fMom.day ? fmtDay(fMom.day) : fMom.date}</span></div>}
                  <span className="k-m mt-6 flex items-center gap-2"><Dot c={dotOf(fMom.y)} />{[isShow ? "Show" : "Moment", fMom.day ? fmtDay(fMom.day) : fMom.date, eraOfY(fMom.y)?.label].filter(Boolean).join(" · ")}</span>
                  <h2 className="k-d mt-2 text-[40px]">{fMom.t}</h2>
                  {fMom.sub && <p className="k-b mt-1">{fMom.sub}</p>}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {isShow && <button type="button" className={`k-btn ${was[fMom.id] ? "k-btn--key" : ""}`} aria-pressed={!!was[fMom.id]} onClick={() => void toggleWas(fMom.id)}>{was[fMom.id] ? "I was there" : "Were you there?"}{n > 0 ? ` · ${n}` : ""}</button>}
                    {fMom.src && <a className="k-btn" href={fMom.src} target="_blank" rel="noopener">Source: {sourceName(fMom.src)}</a>}
                    <button type="button" className="k-btn" onClick={() => void share(`/${a.slug}?at=${encodeURIComponent(fMom.id)}`)}>Share</button>
                  </div>
                  {wasNote && isShow && <p className="k-b mt-3 text-sm">{wasNote} <a href={`/sign-in?next=/${a.slug}`} className="underline">Sign in</a></p>}
                  <Also rel={rel} onMedia={(url, title) => setFocus({ kind: "media", url, title })} />
                </div>
              );
            })() : null;

  return (
    <div className="ax" style={{ ["--ax" as string]: accent } as CSSProperties}>
      <audio ref={audio} preload="none" onTimeUpdate={(e) => setProg(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)} onEnded={() => (queueRef.current ? next() : setPlaying(false))} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />

      {/* ── Eras ── */}
      {hasEras && (
        <section className="k-wrap k-section" aria-labelledby="eras" id="eras">
          <div className="k-h2">
            <div><h2 className="k-d" id="eras">Eras</h2><p className="k-b">{scope.k}.{scope.t ? ` ${scope.t}` : ""}</p></div>
            {tour.length > 1 && <button type="button" className="k-btn k-btn--key" onClick={startHere}><svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>Start here, one track an era</button>}
          </div>
          <div className="ax-rail" role="tablist" aria-label="Eras">
            <button type="button" role="tab" aria-selected={!era} className={`ax-era${!era ? " on" : ""}`} onClick={() => pickEra("all")} style={{ ["--ea" as string]: "var(--k-pc)" } as CSSProperties}>
              <span className="k-m">{eras[0].from} to now</span>
              <b className="k-d">Every era</b>
              <span className="k-b">{a.releases.length} records, {a.moments.filter((m) => m.kind === "show").length} shows</span>
              <span className="ax-bar" style={{ background: `linear-gradient(90deg, ${eras.map((e) => e.accent).join(", ")})` }} />
            </button>
            {eras.map((e) => (
              <button key={e.id} type="button" role="tab" aria-selected={era?.id === e.id} className={`ax-era${era?.id === e.id ? " on" : ""}`} onClick={() => pickEra(e.id)} style={{ ["--ea" as string]: e.accent } as CSSProperties}>
                <span className="ax-covers" aria-hidden="true">{eraCovers(e).map((c, i) => <img key={c} src={c} alt="" loading="lazy" style={{ ["--i" as string]: i } as CSSProperties} />)}</span>
                <span className="k-m">{short(e)}</span>
                <b className="k-d">{e.label}</b>
                {e.sound && <span className="k-b ax-sound">{e.sound}</span>}
                <span className="k-b" style={{ fontSize: 12 }}>{eraCount(e)} things</span>
                <span className="ax-bar" style={{ background: e.accent }} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Music ── */}
      {a.releases.length > 0 && (
        <section className="k-wrap k-section" aria-labelledby="music" id="music">
          <div className="k-h2">
            <div><h2 className="k-d" id="music">Music</h2><p className="k-b">{era ? `${rels.length} from ${era.label.toLowerCase()}. ` : ""}Click a record to play it and see the tracklist.</p></div>
          </div>
          {types.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Kind of release">
              <button type="button" className={`k-pill${type === "all" ? " k-pill--on" : ""}`} onClick={() => setType("all")}>All {relEra.length}</button>
              {types.map((x) => <button key={x.t} type="button" className={`k-pill${type === x.t ? " k-pill--on" : ""}`} onClick={() => setType(x.t)}>{TYPE[x.t] === "EP" ? "EPs" : `${TYPE[x.t]}s`} {x.n}</button>)}
            </div>
          )}
          {rels.length === 0 ? <p className="k-b mt-6">Nothing of this kind in these years.</p> : (
            <ul className="mt-8 grid list-none grid-cols-2 gap-x-6 gap-y-9 p-0 pr-6 md:grid-cols-4 md:gap-x-10 md:gap-y-11">
              {(allRels ? rels : rels.slice(0, 8)).map((r) => {
                const t = relTrack(r);
                const on = !!t && playing && track?.trackId === t.trackId;
                return (
                  <li key={r.id} className="ax-in">
                    <button type="button" className="ax-rec" onClick={() => open("rel", r.id, r.undated ? null : r.y)} aria-label={`${r.t}, ${TYPE[r.type] ?? "release"}${r.undated ? "" : `, ${r.date}`}`}>
                      <Sleeve title={r.t} label={r.label} cover={coverUrl(r.albumId, "big")} fontSize={34} out={on} />
                      {t && <span className={`ax-play${on ? " on" : ""}`} onClick={(e) => { e.stopPropagation(); toggle(t); }} role="button" tabIndex={-1} aria-hidden="true">{on ? <Eq /> : <svg width="16" height="16" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>}</span>}
                    </button>
                    <b className="mt-4 flex items-center gap-2 text-[16px] font-semibold"><Dot c={dotOf(r.undated ? null : r.y)} /><span className="truncate">{r.t}</span></b>
                    <span className="k-b block truncate text-[13px]">{[TYPE[r.type] ?? "Release", r.undated ? null : r.date, r.label].filter(Boolean).join(" · ")}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {rels.length > 8 && <div className="mt-10"><button type="button" className="k-btn" onClick={() => setAllRels((v) => !v)}>{allRels ? "Fewer" : `All ${rels.length}`}</button></div>}
        </section>
      )}

      {/* ── Shows and moments ── */}
      {(shows.length > 0 || miles.length > 0) && (
        <section className="k-wrap k-section" aria-labelledby="past" id="past">
          <div className="grid items-start gap-12 md:grid-cols-[1fr_minmax(0,460px)] md:gap-16">
            {shows.length > 0 && (
              <div>
                <div className="k-h2"><div><h2 className="k-d" id="past">Where they played</h2><p className="k-b">{shows.length} {era ? `in ${era.label.toLowerCase()}` : "shows on record"}. Were you there? Say so.</p></div></div>
                <ul className="mt-6 list-none p-0">
                  {(allShows ? shows : shows.slice(0, 8)).map((m) => (
                    <li key={m.id} className="ax-in">
                      <button type="button" className="k-li ax-row" onClick={() => open("show", m.id, m.y)}>
                        <span className="k-m w-[88px] flex-none !text-[var(--k-tx)]">{m.day ? fmtDay(m.day) : m.date}</span>
                        <span className="min-w-0 flex-1 text-left"><b className="flex items-center gap-2"><Dot c={dotOf(m.y)} />{m.t}</b><small>{m.sub}</small></span>
                        {(wasCounts[m.id] ?? 0) > 0 && <span className="k-m" style={{ color: "var(--ax)" }}>{wasCounts[m.id]} there</span>}
                        {was[m.id] && <span className="k-m" style={{ color: "var(--ax)" }}>You</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                {shows.length > 8 && <div className="mt-6"><button type="button" className="k-btn" onClick={() => setAllShows((v) => !v)}>{allShows ? "Fewer" : `All ${shows.length}`}</button></div>}
              </div>
            )}
            {miles.length > 0 && (
              <div>
                <h3 className="k-d text-[32px]">Moments</h3>
                <ol className="ax-time mt-5 list-none p-0">
                  {miles.slice(0, 8).map((m) => (
                    <li key={m.id} className="ax-in"><button type="button" onClick={() => open("mile", m.id, m.y)}><span className="k-m">{m.date}</span><b>{m.t}</b>{m.sub && <small className="k-b">{m.sub}</small>}</button></li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Watch and listen ── */}
      {watch.length > 0 && (
        <section className="k-wrap k-section" aria-labelledby="watch">
          <div className="k-h2"><div><h2 className="k-d" id="watch">Watch and listen</h2><p className="k-b">Sets, mixes and videos{era ? ` from ${era.label.toLowerCase()}` : ""}.</p></div></div>
          <ul className="mt-8 grid list-none gap-6 p-0 md:grid-cols-3">
            {watch.slice(0, 6).map((w) => (
              <li key={w.key} className="ax-in">
                <button type="button" className="ax-watch" onClick={() => (embedFor(w.url) ? setFocus({ kind: "media", url: w.url, title: w.title }) : window.open(w.url, "_blank", "noopener"))}>
                  <span className="ax-thumb">{w.img ? <img src={w.img} alt="" loading="lazy" /> : <span className="k-m">{w.kind}</span>}<span className="ax-pl"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg></span></span>
                  <b className="mt-3 block text-left text-[15px] font-semibold">{w.title}</b>
                  <span className="k-b block text-left text-[13px]">{[w.kind, w.meta].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Photos ── */}
      {photos.length > 1 && (
        <section className="k-section" aria-label="Photos">
          <div className="ax-photos k-wrap">
            {photos.slice(0, 10).map((p) => <figure key={p.url} className="ax-in"><img src={p.url} alt={p.caption ?? name} loading="lazy" />{(p.caption || p.credit) && <figcaption className="k-b">{[p.caption, p.credit && `Photo: ${p.credit}`].filter(Boolean).join(". ")}</figcaption>}</figure>)}
          </div>
        </section>
      )}

      {/* ── Press ── */}
      {press.length > 0 && (
        <section className="k-wrap k-section" aria-labelledby="press">
          <div className="k-h2"><div><h2 className="k-d" id="press">Press</h2><p className="k-b">What was written{era ? ` in ${era.label.toLowerCase()}` : ""}.</p></div></div>
          <ul className="mt-6 grid list-none gap-x-12 p-0 md:grid-cols-2">
            {press.slice(0, 6).map((x) => (
              <li key={x.url}><a className="k-li" href={x.url} target="_blank" rel="noopener"><span className="k-m w-[110px] flex-none">{x.publication}</span><span className="min-w-0 flex-1"><b>{x.title}</b>{x.excerpt && <small>{x.excerpt.slice(0, 140)}</small>}</span></a></li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Connections ── */}
      {tabs.length > 0 && (
        <section className="k-wrap k-section" aria-labelledby="circle">
          <div className="k-h2"><div><h2 className="k-d" id="circle">Their circle</h2><p className="k-b">Labels, crews and the people they made things with.</p></div></div>
          <div className="mt-6 flex flex-wrap gap-2" role="tablist">
            {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tabId === t.id} className={`k-pill${tabId === t.id ? " k-pill--on" : ""}`} onClick={() => setTab(t.id)}>{t.label} {t.n}</button>)}
          </div>
          <ul className="mt-6 grid list-none gap-x-12 p-0 md:grid-cols-2">
            {(tabId === "labels" || tabId === "crews") && a.groups.filter((g) => g.kind === (tabId === "labels" ? "label" : "collective")).map((g) => (
              <li key={g.name}><Row href={g.url} title={g.name} sub={[g.years, g.releases ? `${g.releases} releases` : null, g.peers.length ? `with ${g.peers.slice(0, 3).map((p) => p.name).join(", ")}` : null].filter(Boolean).join(" · ")} /></li>
            ))}
            {tabId === "worked" && a.worked.map((w) => <li key={w.name}><Row href={w.slug ? `/${w.slug}` : w.url} title={w.name} sub={w.note} img={w.img} /></li>)}
            {tabId === "fests" && a.festivals.map((f) => <li key={f.name}><Row href={f.url} title={f.name} sub={f.years ?? ""} /></li>)}
          </ul>
        </section>
      )}

      {/* ── The drawer ── */}
      {focus && (
        <div className="ax-scrim" onClick={(e) => e.target === e.currentTarget && setFocus(null)}>
          <aside className="ax-drawer" role="dialog" aria-modal="true" aria-label={focus.kind === "ask" ? `Book ${name}` : "Details"}>
            <button type="button" className="ax-x" onClick={() => setFocus(null)} aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            {focus.kind === "ask" && (
              <div>
                <span className="k-m" style={{ color: "var(--k-pc)" }}>Book</span>
                <h2 className="k-d mt-2 text-[44px]">Ask {name}</h2>
                <p className="k-b mt-2">{rate ? `From ${rate}. ` : ""}They reply here or on WhatsApp. Nothing is booked until you both say yes.</p>
                <div className="mt-6"><AskForm picks={[{ slug: a.slug, name, rate }]} date="" city="" budget="" today={today} names={{ [a.slug]: name }} /></div>
              </div>
            )}
            {mediaPanel}
            {relPanel}
            {momPanel}
          </aside>
        </div>
      )}

      {/* ── The player ── */}
      {track && (cur || playing) && (
        <div className="ax-player" role="region" aria-label="Preview player">
          <span className="ax-pc">{track.cover ? <img src={track.cover} alt="" /> : null}<i className={playing ? "spin" : ""} /></span>
          <span className="min-w-0 flex-1"><b className="block truncate text-[15px]">{track.t}</b><span className="k-b block truncate text-[12px]">{audioErr ?? (queue ? `Start here, ${queue.i + 1} of ${queue.list.length} · ${track.sub}` : `30 second preview · ${track.sub}`)}</span></span>
          <button type="button" className="ax-pp" onClick={() => toggle(track)} aria-label={playing ? "Pause" : "Play"}>{playing ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>}</button>
          {queue && <button type="button" className="k-btn k-btn--s" onClick={next}>Next era</button>}
          <button type="button" className="ax-close" onClick={() => { pause(); setCur(null); setQueue(null); }} aria-label="Close the player"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
          <i className="ax-prog" style={{ transform: `scaleX(${prog})` }} />
        </div>
      )}
    </div>
  );
}

function Dot({ c }: { c: string | null }) {
  return c ? <i aria-hidden="true" style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: c, flex: "none", boxShadow: `0 0 8px ${c}` }} /> : null;
}
const Eq = () => <span className="k-eq" aria-hidden="true"><i /><i /><i /></span>;

function Row({ href, title, sub, img }: { href: string | null; title: string; sub: string; img?: string | null }) {
  const inner = <>{img ? <img src={img} alt="" width={48} height={48} className="h-12 w-12 flex-none rounded-full object-cover" loading="lazy" /> : null}<span className="min-w-0 flex-1"><b>{title}</b>{sub && <small>{sub}</small>}</span></>;
  return href ? <a className="k-li" href={href} target={href.startsWith("/") ? undefined : "_blank"} rel="noopener">{inner}</a> : <div className="k-li">{inner}</div>;
}

function Also({ rel, onMedia }: { rel: { videos: Video[]; press: { title: string; publication: string; url: string }[]; mixes: Mix[] }; onMedia: (url: string, title: string) => void }): ReactNode {
  if (!rel.videos.length && !rel.press.length && !rel.mixes.length) return null;
  return (
    <div className="mt-8 border-t border-[var(--k-hair)] pt-5">
      <span className="k-m">Goes with it</span>
      <ul className="mt-2 list-none p-0">
        {rel.videos.map((v) => <li key={v.url}><button type="button" className="k-li w-full text-left" onClick={() => onMedia(v.url, v.title)}><span className="flex-1"><b>{noteless(v.title)}</b><small>{v.kind ? v.kind.replace(/_/g, " ") : "Video"}</small></span></button></li>)}
        {rel.mixes.map((m) => <li key={m.url}><a className="k-li" href={m.url} target="_blank" rel="noopener"><span className="flex-1"><b>{noteless(m.title)}</b><small>Mix{m.tracks.length ? `, ${m.tracks.length} tracks` : ""}</small></span></a></li>)}
        {rel.press.map((p) => <li key={p.url}><a className="k-li" href={p.url} target="_blank" rel="noopener"><span className="flex-1"><b>{p.title}</b><small>{p.publication}</small></span></a></li>)}
      </ul>
    </div>
  );
}
