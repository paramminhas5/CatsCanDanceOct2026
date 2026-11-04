/**
 * What's on, on the home: six real nights from the gig guide with the day rail,
 * Going counts and one primary action per card, plus the crew offer in three steps.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { HomeNight } from "@/lib/home";
import { dayStamp, kindLabel } from "@/lib/find";
import { displayTime } from "@/lib/nights";
import Going from "@/components/going/Going";
import { loadCrowd, sceneKey, type Crowd } from "@/lib/plans";

type Props = { week: HomeNight[]; count: number; cities: string[]; today: string };

export default function ThisWeek({ week, count, cities, today }: Props) {
  const [crowd, setCrowd] = useState<Record<string, Crowd>>({});
  const keys = week.map((e) => sceneKey(e.id));
  const reload = () => { if (keys.length) loadCrowd(keys).then(setCrowd).catch(() => {}); };
  useEffect(reload, [week.map((e) => e.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!week.length) return null;

  const cityLine = cities.length ? cities.slice(0, 4).join(", ") + (cities.length > 4 ? ` and ${cities.length - 4} more` : "") : "";

  return (
    <section id="whats-on" className="bg-cream border-b-4 border-ink py-12 md:py-20">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <p className="font-display text-electric-blue text-sm uppercase tracking-[0.2em] mb-2">What's on · the gig guide</p>
            <h2 className="font-display text-ink text-4xl sm:text-5xl md:text-6xl leading-[0.95]">This week.</h2>
            <p className="text-ink/70 text-lg mt-3">
              {count} night{count === 1 ? "" : "s"} in the next seven days{cityLine ? ` across ${cityLine}` : ""}, checked by hand before they go up.
            </p>
          </div>
          <Link href="/whats-on" className="bg-electric-blue text-cream font-display text-base px-5 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform">
            Everything on →
          </Link>
        </div>

        <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {week.map((e) => {
            const stamp = dayStamp(e.event_date, today);
            const key = sceneKey(e.id);
            const c = crowd[key];
            const time = displayTime(e.event_time);
            const primaryHref = e.ticket_url || e.url;
            return (
              <li key={e.id} className="border-4 border-ink bg-cream flex hover:bg-white transition-colors">
                <div className={`shrink-0 w-[72px] border-r-4 border-ink flex flex-col items-center justify-center py-4 ${stamp.label === "Tonight" ? "bg-electric-blue text-cream" : "bg-cream text-ink"}`}>
                  <p className={`text-[10px] font-semibold uppercase ${stamp.label.length > 4 ? "tracking-normal" : "tracking-widest"}`}>{stamp.label === "Tomorrow" ? "Tmrw" : stamp.label}</p>
                  <p className="font-display text-3xl leading-none my-1">{stamp.day}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest">{stamp.month}</p>
                </div>
                <div className="p-4 flex-1 flex flex-col min-w-0">
                  <p className="text-xs text-ink/60 mb-1">{kindLabel(e.kind)}{time ? ` · ${time}` : ""}{e.featured ? <span className="text-magenta font-semibold"> · Our pick</span> : null}</p>
                  <h3 className="font-display text-lg leading-tight text-ink mb-1 line-clamp-2">
                    <a href={primaryHref} target="_blank" rel="noreferrer" className="hover:text-electric-blue">{e.title}</a>
                  </h3>
                  <p className="text-sm text-ink/75 truncate">{[e.venue, e.city].filter(Boolean).join(", ")}</p>
                  {e.artists.length > 0 && (
                    <p className="text-sm mt-1 truncate">
                      {e.artists.slice(0, 3).map((a, i) => (
                        <span key={a.slug}>{i > 0 ? ", " : ""}<Link href={`/artists/${a.slug}`} className="underline decoration-2 underline-offset-2 decoration-acid-yellow hover:bg-acid-yellow">{a.name}</Link></span>
                      ))}
                    </p>
                  )}
                  <div className="mt-auto pt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-ink/65 min-w-0 leading-snug">
                      {c && c.going > 0 ? <><span className="font-display text-ink text-base">{c.going}</span> going{c.names.length ? `: ${c.names.slice(0, 2).join(", ")}` : ""}</> : "Nobody yet. Be first."}
                    </p>
                    <div className="shrink-0 [&>button]:px-3 [&>button]:py-1.5 [&>button]:text-sm">
                      <Going nightKey={key} title={e.title} crowd={c} onChange={reload} />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Crews */}
        <div className="mt-10 md:mt-14 grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 md:gap-10 items-center border-4 border-ink bg-electric-blue text-cream p-6 md:p-8 chunk-shadow">
          <div>
            <p className="font-display text-acid-yellow text-sm uppercase tracking-[0.2em] mb-2">Crews</p>
            <h3 className="font-display text-3xl md:text-4xl leading-[0.95]">Never go alone.</h3>
            <p className="text-cream/85 mt-3 max-w-prose">Say you're going to any night, ours or anyone's. We match you with three to six people from your city and you walk in together.</p>
          </div>
          <ol className="grid sm:grid-cols-3 gap-4">
            {[
              ["Say you're going", "Tap I'm going on any night. Takes an email."],
              ["Get your crew", "We form crews before the night and open a chat."],
              ["Walk in together", "Meet point, set times and a captain on the night."],
            ].map(([t, d], i) => (
              <li key={t} className="border-2 border-cream/40 p-4">
                <p className="font-display text-acid-yellow text-2xl leading-none mb-2">{String(i + 1).padStart(2, "0")}</p>
                <p className="font-display text-base leading-tight mb-1">{t}</p>
                <p className="text-sm text-cream/80">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
