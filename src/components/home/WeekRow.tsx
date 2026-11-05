/**
 * This week from the gig guide as a moving row of night cards (hover to pause) with a
 * cat walking along the top. Every card has a real I'm going button.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import catLeft from "@/assets/cat-left.svg";
import { imgUrl } from "@/lib/img";
import type { HomeNight } from "@/lib/home";
import { dayStamp, kindLabel, tidyTitle } from "@/lib/find";
import { displayTime } from "@/lib/nights";
import Going from "@/components/going/Going";
import { loadCrowd, sceneKey, type Crowd } from "@/lib/plans";

type Props = { week: HomeNight[]; count: number; cities: string[]; today: string };

function Card({ e, c, today, onChange }: { e: HomeNight; c?: Crowd; today: string; onChange: () => void }) {
  const stamp = dayStamp(e.event_date, today);
  const time = displayTime(e.event_time);
  const tonight = stamp.label === "Tonight";
  return (
    <div className="shrink-0 w-[290px] md:w-[340px] flex border-4 border-ink bg-cream text-ink transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_hsl(var(--ink))]">
      <div className={`shrink-0 w-[68px] border-r-4 border-ink flex flex-col items-center justify-center py-3 text-center ${tonight ? "bg-electric-blue text-cream" : ""}`}>
        <small className="text-[10px] font-bold uppercase tracking-wide">{stamp.label === "Tomorrow" ? "Tmrw" : stamp.label}</small>
        <b className="font-display font-normal text-3xl leading-none my-0.5">{stamp.day}</b>
        <small className="text-[10px] font-bold uppercase tracking-widest">{stamp.month}</small>
      </div>
      <div className="p-3.5 flex-1 flex flex-col min-w-0">
        <p className="text-xs text-ink/65 mb-1">{kindLabel(e.kind)}{time ? ` · ${time}` : ""}{e.featured ? <span className="text-magenta font-bold"> · Our pick</span> : null}</p>
        <a href={e.ticket_url || e.url} target="_blank" rel="noreferrer" className="font-display text-base md:text-lg leading-tight line-clamp-2 min-h-[24px] hover:text-electric-blue">{tidyTitle(e.title)}</a>
        <p className="text-sm text-ink/75 truncate">{[e.venue, e.city].filter(Boolean).join(", ")}</p>
        {e.artists.length > 0 && (
          <p className="text-sm truncate">
            {e.artists.slice(0, 2).map((a, i) => (
              <span key={a.slug}>{i > 0 ? ", " : ""}<Link href={`/artists/${a.slug}`} className="underline decoration-2 underline-offset-2 decoration-acid-yellow">{a.name}</Link></span>
            ))}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-ink/70 truncate">{c && c.going > 0 ? <><b className="font-display font-normal text-base text-ink">{c.going}</b> going</> : null}</span>
          <div className="shrink-0 [&>button]:px-3 [&>button]:py-1.5 [&>button]:text-xs"><Going nightKey={sceneKey(e.id)} title={e.title} crowd={c} onChange={onChange} /></div>
        </div>
      </div>
    </div>
  );
}

export default function WeekRow({ week, count, cities, today }: Props) {
  const [crowd, setCrowd] = useState<Record<string, Crowd>>({});
  const reload = () => { if (week.length) loadCrowd(week.map((e) => sceneKey(e.id))).then(setCrowd).catch(() => {}); };
  useEffect(reload, [week]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!week.length) return null;
  const cityLine = cities.slice(0, 4).join(", ");

  return (
    <section id="week" className="relative bg-cream border-b-4 border-ink py-14 md:py-24 overflow-hidden">
      <div className="container flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-16">
        <div>
          <p className="font-display text-electric-blue text-xs md:text-sm uppercase tracking-[0.2em] mb-3">What's on · the gig guide</p>
          <h2 className="font-display text-ink text-[2.6rem] sm:text-6xl md:text-7xl leading-[0.92]">This week.</h2>
          <p className="text-ink/70 text-base md:text-lg mt-3">{count} nights in the next seven days{cityLine ? ` across ${cityLine}` : ""}.</p>
        </div>
        <Link href="/whats-on" className="self-start md:self-auto bg-electric-blue text-cream font-display px-5 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform">All {count} nights →</Link>
      </div>
      <div className="relative">
        <div className="absolute -top-14 md:-top-16 inset-x-0 h-16 pointer-events-none" aria-hidden>
          <div className="absolute top-0 w-16 md:w-24 [animation:ccd-walk_22s_linear_infinite] motion-reduce:hidden">
            <img src={imgUrl(catLeft)} alt="" className="ccd-step ccd-react w-full drop-shadow-[3px_3px_0_hsl(var(--ink))]" />
          </div>
        </div>
        <div className="flex w-max gap-5 py-1.5 ccd-marquee motion-reduce:w-full motion-reduce:overflow-x-auto">
          {[...week, ...week].map((e, i) => <Card key={`${e.id}-${i}`} e={e} c={crowd[sceneKey(e.id)]} today={today} onChange={reload} />)}
        </div>
      </div>
    </section>
  );
}
