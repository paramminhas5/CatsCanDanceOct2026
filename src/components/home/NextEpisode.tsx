/**
 * Our nights on the home: the next Episode as the one dark section on the page.
 * Poster if there is one, lineup linked to the roster, countdown, who's going, tickets.
 * Past Episodes as a small row. Hidden when there is nothing listed.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { CcdEvent } from "@/lib/ccd-db";
import { displayDate, displayTime, startDate } from "@/lib/nights";
import { resolvePoster } from "@/lib/poster";
import { loadCrowd, type Crowd } from "@/lib/plans";

type Props = { next: CcdEvent | null; past: CcdEvent[]; hasTickets: boolean; lineup: { name: string; slug: string | null }[] };

const pad = (n: number) => String(n).padStart(2, "0");

function useCountdown(ms: number | null) {
  const [t, setT] = useState<{ d: number; h: number; m: number } | null>(null);
  useEffect(() => {
    if (ms == null) return;
    const calc = () => {
      const diff = ms - Date.now();
      if (diff <= 0) return setT(null);
      const s = Math.floor(diff / 1000);
      setT({ d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60) });
    };
    calc();
    const id = setInterval(calc, 30000);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

export default function NextEpisode({ next, past, hasTickets, lineup }: Props) {
  const start = next ? startDate(next, next.start_time) : null;
  const cd = useCountdown(start ? start.getTime() : null);
  const [crowd, setCrowd] = useState<Crowd | null>(null);
  useEffect(() => {
    if (!next) return;
    loadCrowd([next.slug]).then((c) => setCrowd(c[next.slug] ?? null)).catch(() => {});
  }, [next]);

  if (!next && !past.length) return null;

  const poster = next ? resolvePoster(next.poster_url) : null;
  const href = next ? `/nights/${next.slug}` : "/nights";
  const time = next ? displayTime(next.start_time) : null;

  return (
    <section id="nights" className="bg-ink text-cream border-b-4 border-ink py-12 md:py-20">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <p className="font-display text-magenta text-sm uppercase tracking-[0.2em] mb-2">Our nights · Episodes</p>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[0.95]">{next ? "Next Episode." : "The Episodes."}</h2>
          </div>
          <Link href="/nights" className="font-semibold underline underline-offset-4 decoration-2 hover:text-acid-yellow">All Episodes →</Link>
        </div>

        {next && (
          <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] border-4 border-cream/20 bg-ink">
            <Link href={href} className="relative block aspect-[4/5] md:aspect-auto md:min-h-[460px] bg-magenta border-b-4 md:border-b-0 md:border-r-4 border-cream/20 overflow-hidden">
              {poster ? (
                <img src={poster} alt={`${next.title} poster`} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <p className="font-display text-cream text-[22vw] md:text-[9rem] leading-[0.8] break-words">
                    {next.episode_no ? `EP${pad(next.episode_no)}` : "CCD"}
                  </p>
                </div>
              )}
              {cd && (
                <div className="absolute top-4 left-4 bg-cream text-ink border-4 border-ink px-3 py-2 font-display text-sm tabular-nums">
                  {cd.d}d {pad(cd.h)}h {pad(cd.m)}m
                </div>
              )}
            </Link>

            <div className="p-6 md:p-10 flex flex-col">
              <p className="text-acid-yellow font-display text-sm uppercase tracking-widest mb-3">
                {displayDate(next)}{time ? ` · ${time}` : ""}
              </p>
              <h3 className="font-display text-3xl sm:text-4xl md:text-5xl leading-[0.95] mb-3">
                <Link href={href} className="hover:text-acid-yellow transition-colors">{next.title}</Link>
              </h3>
              <p className="text-cream/80 text-lg mb-5">{[next.venue, next.city].filter(Boolean).join(", ")}{next.pet_friendly ? " · pets welcome" : ""}</p>

              {lineup.length ? (
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-cream/55 mb-2">Lineup</p>
                  <ul className="flex flex-wrap gap-2">
                    {lineup.map(({ name, slug }) => (
                      <li key={name}>
                        {slug ? (
                          <Link href={`/artists/${slug}`} className="inline-block border-2 border-acid-yellow px-3 py-1 font-display text-sm hover:bg-acid-yellow hover:text-ink transition-colors">{name}</Link>
                        ) : (
                          <span className="inline-block border-2 border-cream/40 px-3 py-1 font-display text-sm">{name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : next.blurb ? (
                <p className="text-cream/80 mb-6 max-w-prose">{next.blurb}</p>
              ) : null}

              <div className="mt-auto flex flex-wrap items-center gap-4">
                <Link
                  href={hasTickets ? `/tickets/${next.slug}` : href}
                  className="bg-magenta text-cream font-display text-lg px-6 py-3 border-4 border-cream shadow-[6px_6px_0_0_hsl(var(--cream))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
                >
                  {hasTickets ? "Get tickets" : next.rsvp_open ? "RSVP free" : "Night details"}
                </Link>
                {crowd && (crowd.going > 0 || crowd.interested > 0) && (
                  <p className="text-sm text-cream/80">
                    <span className="font-display text-acid-yellow text-lg">{crowd.going}</span> going
                    {crowd.interested ? <> · <span className="font-display text-lg">{crowd.interested}</span> interested</> : null}
                    {crowd.names.length ? <span className="block text-cream/55">{crowd.names.slice(0, 3).join(", ")}{crowd.going > 3 ? " and more" : ""}</span> : null}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div className="mt-8 md:mt-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-cream/55 mb-3">Past Episodes</p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {past.map((e) => (
                <li key={e.slug}>
                  <Link href={`/nights/${e.slug}`} className="block border-2 border-cream/25 p-3 hover:border-acid-yellow hover:text-acid-yellow transition-colors h-full">
                    <p className="font-display text-sm leading-tight">{e.episode_no ? `Episode ${e.episode_no}` : e.title}</p>
                    <p className="text-xs text-cream/60 mt-1">{displayDate(e, false)}</p>
                    <p className="text-xs text-cream/60 truncate">{e.venue}</p>
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
