/**
 * Artists on the home: six featured artists with the most complete sourced pages.
 * Moves on its own every few seconds and steps through each artist's eras; swipe,
 * click a thumbnail, an era or a connection to take over. Play streams the real
 * 30 second Deezer preview through /api/preview. The DJ cat grooves while it plays
 * and the cat on the thumbnails walks to whoever is on.
 */
import { useOnScreen } from "@/lib/useOnScreen";
import { track } from "@/lib/track";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import heroCenter from "@/assets/hero-center.svg";
import catCap from "@/assets/cat-cap.png";
import { imgUrl } from "@/lib/img";
import type { FeaturedArtist } from "@/lib/home";
import { LINKS, productLink } from "@ccd/brand";

type Props = { artists: FeaturedArtist[]; count: number };

const TICK = 1800;
const PER_ARTIST = 4; // ticks

const FILTERS = ["sepia(.55) contrast(1.1)", "saturate(1.35) hue-rotate(-8deg)", "none"];

export default function ArtistsCarousel({ artists, count }: Props) {
  const [ai, setAi] = useState(0);
  const [ei, setEi] = useState(0);
  const [cycle, setCycle] = useState(0);
  const hold = useRef(0);
  const [thumbStep, setThumbStep] = useState(76);
  const [playing, setPlaying] = useState<string | null>(null); // slug playing
  const [cardW, setCardW] = useState(940);
  const audio = useRef<HTMLAudioElement | null>(null);
  const firstCard = useRef<HTMLElement>(null);
  const tick = useRef(0);
  const touchX = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = firstCard.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCardW(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [artists.length]);

  useEffect(() => {
    const set = () => setThumbStep(window.innerWidth < 768 ? 52 : 76);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  const secRef = useRef<HTMLElement>(null);
  const visible = useOnScreen(secRef);
  useEffect(() => {
    if (!artists.length || playing || !visible) return;
    const id = setInterval(() => {
      if (hold.current > 0) { hold.current -= 1; return; }
      tick.current += 1;
      if (tick.current % PER_ARTIST === 0) {
        setAi((i) => (i + 1) % artists.length);
        setEi(0);
        setCycle((c) => c + 1);
      } else {
        setEi((e) => e + 1);
      }
    }, TICK);
    return () => clearInterval(id);
  }, [artists.length, playing, visible]);

  useEffect(() => () => { audio.current?.pause(); }, []);

  if (!artists.length) return null;

  const go = (i: number) => {
    const n = (i + artists.length) % artists.length;
    if (n === ai) return;
    stop();
    setAi(n); setEi(0); hold.current = 5; setCycle((c) => c + 1); tick.current = 0;
  };
  const stop = () => { audio.current?.pause(); setPlaying(null); };
  const play = async (a: FeaturedArtist) => {
    if (playing === a.slug) return stop();
    stop();
    const id = a.latest.find((r) => r.deezer)?.deezer;
    if (!id) return;
    try {
      const r = await fetch(`/api/preview/${id}`);
      if (!r.ok) return;
      const j = await r.json();
      const el = audio.current ?? new Audio();
      audio.current = el;
      el.src = j.preview;
      el.onended = () => setPlaying(null);
      await el.play();
      track("play_preview", { where: "home" });
      setPlaying(a.slug);
    } catch {
      setPlaying(null);
    }
  };

  const GAP = 28;
  const shift = ai * (cardW + GAP);

  return (
    <section id="artists-product" ref={secRef} className="relative bg-ink text-cream border-b-4 border-ink py-14 md:py-24 overflow-hidden">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-10 mb-10">
          <div>
            <p className="font-display text-acid-yellow text-xs md:text-sm uppercase tracking-[0.2em] mb-3">02 · Artists</p>
            <h2 className="font-display text-[2.6rem] sm:text-6xl md:text-7xl leading-[0.92]">Look them up.<br />Book them.</h2>
          </div>
          <div className="flex items-end gap-6">
            <p className="text-cream/80 text-base md:text-lg max-w-[34ch]">Pages for South Asian electronic artists. Every fact has a source. New gigs and releases get added as we find them.</p>
            <img
              src={imgUrl(heroCenter)}
              alt=""
              aria-hidden
              className={`hidden md:block w-40 drop-shadow-[6px_6px_0_hsl(var(--acid-yellow))] ${playing ? "ccd-react animate-[ccd-bob_.48s_ease-in-out_infinite]" : "ccd-bob"}`}
            />
          </div>
        </div>
      </div>

      {/* The track */}
      <div
        className="pl-4 md:pl-[max(2rem,calc((100%-1200px)/2+2rem))]"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(ai + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        <div className="overflow-hidden -mr-[100vw] pr-[100vw]">
        <div className="flex gap-7 transition-transform duration-[900ms] ease-[cubic-bezier(.6,0,.2,1)]" style={{ transform: `translateX(-${shift}px)` }}>
          {artists.map((a, i) => {
            const on = i === ai;
            const e = on ? ei % a.eras.length : 0;
            const era = a.eras[e];
            const filter = a.eras.length > 1 ? FILTERS[Math.round((e * 2) / (a.eras.length - 1))] : "none";
            const isPlaying = playing === a.slug;
            const hasPreview = a.latest.some((r) => r.deezer);
            return (
              <article
                key={a.slug}
                ref={i === 0 ? firstCard : undefined}
                aria-hidden={!on}
                className={`shrink-0 w-[calc(100vw-3.5rem)] md:w-[940px] grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] border-4 bg-[#0f1322] transition-all duration-500 ${on ? "border-cream shadow-[12px_12px_0_0_hsl(var(--acid-yellow))]" : "border-cream/25 opacity-40 scale-[.96]"}`}
              >
                <div className="relative min-h-[280px] md:min-h-[540px] overflow-hidden bg-ink">
                  <img src={a.photo} alt={a.name} loading="lazy" className={`absolute inset-0 w-full h-full object-cover object-[center_25%] transition-[filter,transform] duration-[700ms,7000ms] ${on ? "scale-[1.08]" : ""}`} style={{ filter }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1322] via-transparent to-transparent" />
                  {a.label && <span className="absolute top-3 left-3 z-[2] bg-acid-yellow text-ink border-2 border-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">{a.label}</span>}
                  <div className="absolute left-4 right-4 bottom-4 z-[2]">
                    <p className="md:hidden text-xs text-cream/75">{a.city}</p>
                    <p className="md:hidden font-display text-3xl leading-[0.95] mb-2">{a.name}</p>
                    {isPlaying && (
                      <div className="ccd-rise flex items-center gap-3 bg-ink border-[3px] border-acid-yellow px-3 py-2">
                        <span className="ccd-bars"><span /><span /><span /><span /><span /></span>
                        <span className="text-sm font-bold truncate">{a.latest.find((r) => r.deezer)?.title}</span>
                        <span className="ml-auto text-[11px] text-cream/60 whitespace-nowrap">30s preview</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-5 md:p-8 flex flex-col gap-4 md:gap-5 min-w-0">
                  <div className="hidden md:block">
                    <p className="text-sm text-cream/65 mb-1">{[a.city, a.genres.join(", ")].filter(Boolean).join(" · ")}</p>
                    <p className="font-display text-5xl leading-[0.95]">{a.name}</p>
                  </div>
                  <div className="flex gap-2">
                    {a.eras.map((x, j) => (
                      <button
                        key={x.years}
                        type="button"
                        tabIndex={on ? 0 : -1}
                        onClick={() => { if (!on) return go(i); setEi(j); hold.current = 5; }}
                        className={`text-left px-3 py-2 border-2 transition-all duration-500 ${j === e ? "flex-[1.6] bg-acid-yellow text-ink border-acid-yellow" : "flex-1 border-cream/25 text-cream/70 hover:text-cream"}`}
                      >
                        <b className="block font-display font-normal text-xs md:text-[13px]">{x.years}</b>
                        {x.label && <small className="text-[11px]">{x.label}</small>}
                      </button>
                    ))}
                  </div>
                  <p className="text-base md:text-lg leading-snug min-h-[48px]"><span className="text-acid-yellow">Sound · </span>{era?.sound}</p>
                  {a.stats.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 border-y-2 border-cream/15 py-4">
                      {a.stats.map((s) => (
                        <div key={s.l}><b className="block font-display font-normal text-3xl md:text-4xl leading-none">{s.n}</b><span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.12em] text-cream/55">{s.l}</span></div>
                      ))}
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {a.latest.map((r, k) => (
                      <div key={r.title} className="flex items-center gap-3 min-w-0">
                        <span className={`shrink-0 grid place-items-center w-11 h-11 border-2 border-cream ${k === 0 ? "bg-acid-yellow" : "bg-cream"}`} aria-hidden>
                          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 2l9 5-9 5z" fill="hsl(var(--ink))" /></svg>
                        </span>
                        <span className="min-w-0"><span className="block font-display text-sm leading-tight truncate">{r.title}</span><span className="text-xs text-cream/60">{r.meta}</span></span>
                      </div>
                    ))}
                  </div>
                  {a.extra && <p className="text-sm text-cream/70">{a.extra}</p>}
                  <div className="flex flex-wrap items-center gap-3 mt-auto">
                    {hasPreview && (
                      <button type="button" tabIndex={on ? 0 : -1} onClick={() => (on ? play(a) : go(i))} className="bg-cream text-ink font-display text-sm px-4 py-2.5 border-4 border-ink shadow-[4px_4px_0_0_hsl(var(--ink))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform">
                        {isPlaying ? "■ Stop" : "▶ Play"}
                      </button>
                    )}
                    <a href={productLink("artists", LINKS.artists.book(a.slug))} tabIndex={on ? 0 : -1} className="bg-magenta text-cream font-display text-sm px-4 py-2.5 border-4 border-ink shadow-[4px_4px_0_0_hsl(var(--ink))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform">Book</a>
                    <a href={productLink("artists", LINKS.artists.artist(a.slug))} tabIndex={on ? 0 : -1} className="inline-block py-1 font-bold underline underline-offset-4 decoration-2 text-sm">Full page →</a>
                    {a.conn && (
                      <button type="button" tabIndex={on ? 0 : -1} onClick={() => go(artists.findIndex((x) => x.slug === a.conn!.to))} className="md:ml-auto border-2 border-cream/45 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider hover:border-cream max-w-full truncate">
                        ↔ {a.conn.label}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        </div>
      </div>

      {/* Thumbnails, with a cat that walks to the one that's on */}
      <div className="container mt-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="relative flex items-center gap-2 md:gap-3">
          <div className="absolute -top-14 md:-top-16 w-12 md:w-16 transition-[left] duration-[1100ms] ease-[cubic-bezier(.5,0,.3,1)] pointer-events-none" style={{ left: ai * thumbStep - 3 }} aria-hidden>
            <img src={imgUrl(catCap)} alt="" className="ccd-step ccd-react w-full drop-shadow-[3px_3px_0_hsl(var(--ink))]" />
          </div>
          {artists.map((a, i) => (
            <button
              key={a.slug}
              type="button"
              onClick={() => go(i)}
              aria-label={a.name}
              aria-current={i === ai}
              className={`relative w-11 h-11 md:w-16 md:h-16 overflow-hidden border-[3px] transition-all duration-300 ${i === ai ? "border-acid-yellow -translate-y-1.5" : "border-cream/30"}`}
            >
              <img src={a.photo} alt="" loading="eager" className={`w-full h-full object-cover ${i === ai ? "" : "grayscale-[.7]"}`} />
              {i === ai && !playing && <span className={`absolute left-0 bottom-0 h-[5px] bg-acid-yellow ${cycle % 2 ? "ccd-fillA" : "ccd-fillB"}`} />}
            </button>
          ))}
          <span className="font-display text-xl ml-3">{String(ai + 1).padStart(2, "0")} <span className="text-cream/40">/ {String(artists.length).padStart(2, "0")}</span></span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <span className="text-sm text-cream/60 max-w-[32ch] md:text-right">Touring artists post their dates under On tour, so you can book them while they're in your city.</span>
          <div className="flex gap-3">
            <a href={productLink("artists", LINKS.artists.tour)} className="border-4 border-cream text-cream font-display px-4 py-3 hover:bg-cream hover:text-ink transition-colors">On tour</a>
            <a href={productLink("artists", LINKS.artists.index)} className="bg-acid-yellow text-ink font-display px-5 py-3 border-4 border-ink shadow-[5px_5px_0_0_hsl(var(--cream))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform">All {count} artists →</a>
          </div>
        </div>
      </div>
    </section>
  );
}
