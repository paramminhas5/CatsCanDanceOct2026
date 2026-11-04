/**
 * Our nights: the next Episode as a compact strip (countdown, date, venue, lineup, tickets),
 * then every Episode so far as a row of posters that drifts on its own and can be scrolled
 * or swiped. Hover, touch or focus stops the drift.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import catHeadphones from "@/assets/cat-headphones.png";
import { imgUrl } from "@/lib/img";
import type { CcdEvent } from "@/lib/ccd-db";
import { displayDate, displayTime, startDate } from "@/lib/nights";
import { resolvePoster } from "@/lib/poster";
import { loadCrowd, type Crowd } from "@/lib/plans";

type Props = { next: CcdEvent | null; past: CcdEvent[]; hasTickets: boolean; lineup: { name: string; slug: string | null }[] };
const pad = (n: number) => String(n).padStart(2, "0");
const TINTS = ["bg-electric-blue", "bg-ink"];

function useCountdown(ms: number | null) {
  const [t, setT] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (ms == null) return;
    const calc = () => { const diff = ms - Date.now(); if (diff <= 0) return setT(null); const s = Math.floor(diff / 1000); setT({ d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }); };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

/** Drift a scroller slowly to the right, loop back at the end, stop while the visitor is using it. */
function useDrift(ref: React.RefObject<HTMLDivElement>, on: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !on) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, held = false, last = 0, pos = el.scrollLeft, resume: ReturnType<typeof setTimeout> | undefined;
    // Snapping fights a slow drift, so it is only on while the visitor is scrolling.
    el.style.scrollSnapType = "none";
    const hold = () => { held = true; clearTimeout(resume); el.style.scrollSnapType = "x proximity"; };
    const release = () => {
      clearTimeout(resume);
      resume = setTimeout(() => { held = false; pos = el.scrollLeft; el.style.scrollSnapType = "none"; }, 2500);
    };
    const tick = (ts: number) => {
      const dt = last ? Math.min(64, ts - last) : 16;
      last = ts;
      if (!held && el.scrollWidth > el.clientWidth + 4) {
        pos = pos + el.clientWidth >= el.scrollWidth - 1 ? 0 : pos + dt * 0.035;
        el.scrollLeft = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    el.addEventListener("pointerenter", hold); el.addEventListener("pointerleave", release);
    el.addEventListener("touchstart", hold, { passive: true }); el.addEventListener("touchend", release);
    el.addEventListener("focusin", hold); el.addEventListener("focusout", release);
    el.addEventListener("wheel", () => { hold(); release(); }, { passive: true });
    return () => {
      cancelAnimationFrame(raf); clearTimeout(resume); el.style.scrollSnapType = "";
      el.removeEventListener("pointerenter", hold); el.removeEventListener("pointerleave", release);
      el.removeEventListener("touchstart", hold); el.removeEventListener("touchend", release);
      el.removeEventListener("focusin", hold); el.removeEventListener("focusout", release);
    };
  }, [ref, on]);
}

export default function EpisodeSpotlight({ next, past, hasTickets, lineup }: Props) {
  const start = next ? startDate(next, next.start_time) : null;
  const t = useCountdown(start ? start.getTime() : null);
  const [crowd, setCrowd] = useState<Crowd | null>(null);
  useEffect(() => { if (next) loadCrowd([next.slug]).then((c) => setCrowd(c[next.slug] ?? null)).catch(() => {}); }, [next]);
  const row = useRef<HTMLDivElement>(null);
  useDrift(row, past.length > 2);

  if (!next && !past.length) return null;
  const title = next ? (next.episode_no ? `Episode ${next.episode_no}` : next.title) : "The Episodes";
  const time = next ? displayTime(next.start_time) : null;
  const href = next ? (hasTickets ? `/tickets/${next.slug}` : `/nights/${next.slug}`) : "/nights";
  const nudge = (dir: number) => { row.current?.dispatchEvent(new Event("pointerenter")); row.current?.scrollBy({ left: dir * (row.current.clientWidth * 0.8), behavior: "smooth" }); row.current?.dispatchEvent(new Event("pointerleave")); };

  return (
    <section id="episode" className="relative bg-magenta text-cream border-b-4 border-ink py-14 md:py-20 overflow-hidden">
      <div className="container relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7 md:mb-9">
          <div>
            <p className="font-display text-acid-yellow text-xs md:text-sm uppercase tracking-[0.2em] mb-3">Our nights · the Episodes</p>
            <h2 className="font-display text-[2.6rem] sm:text-6xl md:text-7xl leading-[0.92] drop-shadow-[6px_6px_0_hsl(var(--ink))]">Small rooms.<br />Big sound.</h2>
          </div>
          <p className="text-cream/90 text-base md:text-lg max-w-[36ch]">We throw our own nights in Bengaluru. Every Episode is a lineup we'd queue for ourselves.</p>
        </div>

        {next && (
          <div className="relative grid grid-cols-[minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 md:gap-8 border-4 border-ink bg-ink p-5 md:p-6 shadow-[10px_10px_0_0_hsl(var(--ink))]">
                        <div className="flex items-center gap-4">
              <img src={imgUrl(catHeadphones)} alt="" aria-hidden className="wiggle w-14 md:w-16 shrink-0 drop-shadow-[3px_3px_0_hsl(var(--magenta))]" />
              <span className="font-display text-5xl md:text-6xl leading-none text-cream drop-shadow-[4px_4px_0_hsl(var(--magenta))]">{next.episode_no ? `EP${pad(next.episode_no)}` : "CCD"}</span>
              <span className="md:hidden font-display text-acid-yellow text-sm">Next up</span>
            </div>
            <div className="min-w-0">
              <p className="hidden md:block font-display text-acid-yellow text-[11px] uppercase tracking-[0.2em] mb-1">Next up · {title}</p>
              <p className="font-display text-lg md:text-2xl leading-tight">{displayDate(next)}{time ? ` · ${time}` : ""}</p>
              <p className="text-sm text-cream/80 mb-3">{[next.venue, next.city].filter(Boolean).join(", ")}</p>
              <div className="flex flex-wrap gap-2">
                {lineup.map(({ name, slug }) =>
                  slug ? (
                    <Link key={name} href={`/artists/${slug}`} className="font-display text-xs md:text-sm border-2 border-acid-yellow px-2.5 py-1 hover:bg-acid-yellow hover:text-ink transition-colors">{name}</Link>
                  ) : (
                    <span key={name} className="font-display text-xs md:text-sm border-2 border-cream/40 px-2.5 py-1">{name}</span>
                  ),
                )}
                {!lineup.length && <span className="text-xs border-2 border-cream/30 px-2.5 py-1 text-cream/70">Lineup soon</span>}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3">
              {t && (
                <div className="flex gap-1.5" aria-label={`${t.d} days to go`}>
                  {([[t.d, "d"], [t.h, "h"], [t.m, "m"], [t.s, "s"]] as [number, string][]).map(([v, l], i) => (
                    <span key={l} className={`min-w-[46px] border-2 ${i === 3 ? "border-acid-yellow text-acid-yellow" : "border-cream/30"} px-1.5 py-1 text-center`}>
                      <b className="font-display font-normal text-xl leading-none">{pad(v)}</b><span className="text-[10px] text-cream/60 ml-0.5">{l}</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <Link href={href} className="bg-magenta text-cream font-display px-5 py-2.5 border-4 border-cream shadow-[5px_5px_0_0_hsl(var(--cream))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform">
                  {hasTickets ? "Get tickets" : next.rsvp_open ? "RSVP free" : "See the night"}
                </Link>
                {crowd && crowd.going > 0 && <span className="text-sm"><b className="font-display font-normal text-acid-yellow text-lg">{crowd.going}</b> going</span>}
              </div>
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div className="mt-12 md:mt-14">
            <div className="flex items-center justify-between gap-4 mb-4">
              <p className="font-display text-sm md:text-base uppercase tracking-[0.14em]">Every Episode so far</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => nudge(-1)} aria-label="Earlier Episodes" className="hidden md:grid place-items-center w-10 h-10 border-[3px] border-ink bg-cream text-ink font-display hover:bg-acid-yellow">←</button>
                <button type="button" onClick={() => nudge(1)} aria-label="More Episodes" className="hidden md:grid place-items-center w-10 h-10 border-[3px] border-ink bg-cream text-ink font-display hover:bg-acid-yellow">→</button>
                <Link href="/nights" className="text-sm font-bold underline underline-offset-4 decoration-2 ml-2">All Episodes →</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div ref={row} className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-px-8 md:scroll-pl-[max(2rem,calc((100vw-1200px)/2+2rem))] px-8 md:pl-[max(2rem,calc((100vw-1200px)/2+2rem))] md:pr-8 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {past.map((e, i) => {
            const poster = resolvePoster(e.poster_url);
            const names = (e.lineup ?? []).filter(Boolean);
            return (
              <Link key={e.slug} href={`/nights/${e.slug}`} className="group snap-start shrink-0 w-[230px] md:w-[280px] border-4 border-ink bg-cream text-ink shadow-[6px_6px_0_0_hsl(var(--ink))] hover:-translate-y-1 transition-transform">
                <div className={`relative aspect-[4/5] border-b-4 border-ink overflow-hidden ${poster ? "bg-ink" : TINTS[i % TINTS.length]}`}>
                  {poster ? (
                    <img src={poster} alt={`${e.episode_no ? `Episode ${e.episode_no}` : e.title} poster`} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <span className="absolute left-4 bottom-3 font-display text-7xl leading-[0.8] drop-shadow-[5px_5px_0_hsl(var(--ink))] text-cream">{e.episode_no ? `EP${pad(e.episode_no)}` : "CCD"}</span>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="font-display text-lg leading-tight">{e.episode_no ? `Episode ${e.episode_no}` : e.title}</p>
                  <p className="text-xs text-ink/70 mt-0.5">{displayDate(e, false)} · {e.venue}</p>
                  {names.length > 0 && <p className="text-xs mt-1.5 line-clamp-2">{names.join(" · ")}</p>}
                </div>
              </Link>
            );
          })}
          <span className="shrink-0 w-1" aria-hidden />
        </div>
      )}
    </section>
  );
}
