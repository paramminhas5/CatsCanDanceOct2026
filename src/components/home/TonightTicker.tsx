/**
 * One scrolling line of real nights under the hero. Tonight if there are any,
 * otherwise this week. Each item links to the night on What's on.
 */
import Link from "next/link";
import type { HomeNight } from "@/lib/home";
import { dayStamp, tidyTitle } from "@/lib/find";

type Props = { tonight: HomeNight[]; week: HomeNight[]; today: string };

export default function TonightTicker({ tonight, week, today }: Props) {
  const list = tonight.length ? tonight : week;
  if (!list.length) return null;
  const label = tonight.length ? "Tonight" : "This week";
  const loop = [...list, ...list];

  return (
    <div className="bg-ink border-b-4 border-ink overflow-hidden" aria-label={`${label} on What's on`}>
      <div className="flex items-stretch">
        <Link
          href="/whats-on"
          className="shrink-0 bg-electric-blue text-cream font-display text-xs md:text-sm uppercase tracking-[0.18em] px-4 md:px-6 flex items-center border-r-4 border-ink"
        >
          {label}
        </Link>
        <div className="flex-1 overflow-hidden py-2.5 md:py-3">
          <div className="flex gap-8 md:gap-12 whitespace-nowrap marquee [animation-duration:40s] md:[animation-duration:60s]">
            {loop.map((e, i) => {
              const stamp = tonight.length ? null : dayStamp(e.event_date, today).label;
              return (
                <Link
                  key={`${e.id}-${i}`}
                  href={`/whats-on?q=${encodeURIComponent(tidyTitle(e.title))}`}
                  className="group inline-flex items-center gap-3 min-h-[36px] text-cream/90 hover:text-acid-yellow transition-colors"
                >
                  {stamp && <span className="font-display text-xs uppercase tracking-widest text-acid-yellow">{stamp}</span>}
                  <span className="font-semibold">{tidyTitle(e.title)}</span>
                  <span className="text-cream/55 text-sm">{[e.venue, e.city].filter(Boolean).join(", ")}</span>
                  <span className="text-magenta" aria-hidden>★</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
