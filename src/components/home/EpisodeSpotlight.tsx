/**
 * Our next Episode, loud: red section, a giant scrolling banner behind it, the poster
 * (or the EP number when there is no poster yet), a ticking countdown, the lineup
 * linked to the roster, who's going and the ticket button. Past Episodes underneath.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import catHeadphones from "@/assets/cat-headphones.png";
import { imgUrl } from "@/lib/img";
import type { CcdEvent } from "@/lib/ccd-db";
import { displayDate, displayTime, startDate } from "@/lib/nights";
import { resolvePoster } from "@/lib/poster";
import { loadCrowd, type Crowd } from "@/lib/plans";

type Props = { next: CcdEvent | null; past: CcdEvent[]; hasTickets: boolean; lineup: { name: string; slug: string | null }[] };
const pad = (n: number) => String(n).padStart(2, "0");

export default function EpisodeSpotlight({ next, past, hasTickets, lineup }: Props) {
  const start = next ? startDate(next, next.start_time) : null;
  const [t, setT] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [crowd, setCrowd] = useState<Crowd | null>(null);
  useEffect(() => {
    if (!start) return;
    const ms = start.getTime();
    const calc = () => { const diff = ms - Date.now(); if (diff <= 0) return setT(null); const s = Math.floor(diff / 1000); setT({ d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }); };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [start?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (next) loadCrowd([next.slug]).then((c) => setCrowd(c[next.slug] ?? null)).catch(() => {}); }, [next]);

  if (!next && !past.length) return null;
  const title = next ? (next.episode_no ? `Episode ${next.episode_no}` : next.title) : "The Episodes";
  const banner = next ? `${title.toUpperCase()} ★ ${(next.venue ?? "").toUpperCase()} ★ ` : "CATS CAN DANCE ★ EPISODES ★ ";
  const poster = next ? resolvePoster(next.poster_url) : null;
  const time = next ? displayTime(next.start_time) : null;
  const href = next ? (hasTickets ? `/tickets/${next.slug}` : `/nights/${next.slug}`) : "/nights";

  return (
    <section id="episode" className="relative bg-magenta text-cream border-b-4 border-ink py-14 md:py-24 overflow-hidden">
      <div className="absolute top-4 md:top-6 inset-x-0 overflow-hidden opacity-20 pointer-events-none" aria-hidden>
        <div className="flex w-max whitespace-nowrap ccd-marquee font-display text-ink text-6xl md:text-[120px] leading-none gap-10">
          <span>{banner.repeat(3)}</span><span>{banner.repeat(3)}</span>
        </div>
      </div>
      <div className="container relative z-[1]">
        {next && (
          <div className="mt-16 md:mt-20 grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] border-4 border-ink bg-ink shadow-[14px_14px_0_0_hsl(var(--ink))]">
            <Link href={`/nights/${next.slug}`} className="relative block aspect-square md:aspect-auto md:min-h-[460px] bg-electric-blue border-b-4 md:border-b-0 md:border-r-4 border-ink">
              <img src={imgUrl(catHeadphones)} alt="" aria-hidden className="wiggle absolute left-5 -top-20 md:-top-24 w-28 md:w-40 drop-shadow-[5px_5px_0_hsl(var(--ink))] z-[2]" />
              {poster ? (
                <img src={poster} alt={`${title} poster`} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="absolute left-5 bottom-3 font-display text-[110px] md:text-[150px] leading-[0.8] text-cream drop-shadow-[8px_8px_0_hsl(var(--ink))]">
                  {next.episode_no ? `EP${pad(next.episode_no)}` : "CCD"}
                </span>
              )}
            </Link>
            <div className="p-5 md:p-10 flex flex-col">
              <p className="font-display text-magenta text-xs md:text-sm uppercase tracking-[0.2em] mb-2">Our nights · next up</p>
              <h2 className="font-display text-4xl md:text-6xl leading-[0.9] mb-5">{title}.</h2>
              {t && (
                <div className="flex gap-2 md:gap-3 mb-5">
                  {([[t.d, "days"], [t.h, "hours"], [t.m, "min"], [t.s, "sec"]] as [number, string][]).map(([v, l], i) => (
                    <span key={l} className={`flex-1 md:flex-none md:min-w-[84px] border-[3px] ${i === 3 ? "border-acid-yellow" : "border-cream/30"} px-2 py-2 text-center`}>
                      <b className={`block font-display font-normal text-3xl md:text-[42px] leading-none ${i === 3 ? "text-acid-yellow" : ""}`}>{pad(v)}</b>
                      <span className="text-[9px] md:text-[10px] uppercase tracking-[0.14em] text-cream/60">{l}</span>
                    </span>
                  ))}
                </div>
              )}
              <p className="font-display text-acid-yellow text-xs md:text-sm uppercase tracking-[0.14em] mb-3">
                {displayDate(next)}{time ? ` · ${time}` : ""} · {[next.venue, next.city].filter(Boolean).join(", ")}
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {lineup.map(({ name, slug }) =>
                  slug ? (
                    <Link key={name} href={`/artists/${slug}`} className="font-display text-sm border-2 border-acid-yellow px-3 py-1 hover:bg-acid-yellow hover:text-ink transition-colors">{name}</Link>
                  ) : (
                    <span key={name} className="font-display text-sm border-2 border-cream/40 px-3 py-1">{name}</span>
                  ),
                )}
                {!lineup.length && <span className="font-display text-sm border-2 border-cream/40 px-3 py-1 text-cream/70">Lineup soon</span>}
                {next.pet_friendly && <span className="border-2 border-cream/45 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">Pets welcome by day</span>}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-5">
                <Link href={href} className="bg-magenta text-cream font-display text-lg px-6 py-3 border-4 border-cream shadow-[6px_6px_0_0_hsl(var(--cream))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform">
                  {hasTickets ? "Get tickets" : next.rsvp_open ? "RSVP free" : "See the night"}
                </Link>
                <span className="text-sm text-cream/80">
                  {crowd && crowd.going > 0 ? <><b className="font-display font-normal text-acid-yellow text-xl">{crowd.going}</b> going · </> : null}
                  QR at the door · join a crew after checkout
                </span>
              </div>
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-cream/80">Past Episodes</p>
              <Link href="/nights" className="text-sm font-bold underline underline-offset-4 decoration-2">All Episodes →</Link>
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {past.map((e) => (
                <li key={e.slug}>
                  <Link href={`/nights/${e.slug}`} className="block h-full border-[3px] border-ink bg-cream text-ink p-3 hover:-translate-y-1 transition-transform shadow-[4px_4px_0_0_hsl(var(--ink))]">
                    <p className="font-display text-sm leading-tight">{e.episode_no ? `Episode ${e.episode_no}` : e.title}</p>
                    <p className="text-xs text-ink/70 mt-1">{displayDate(e, false)}</p>
                    <p className="text-xs text-ink/70 truncate">{e.venue}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
