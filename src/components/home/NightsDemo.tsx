/**
 * Nights on the home: find a night, find your crew, and our own Episodes.
 * The demo on the right plays itself on a loop and every part of it can be clicked:
 * the city chips filter real nights from the gig guide, a night starts the crew demo,
 * the three steps on the left jump to that part. The crew shown is an example; the
 * nights, cities and going counts are real.
 */
import { useOnScreen } from "@/lib/useOnScreen";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import catRight from "@/assets/cat-right.svg";
import catLeft from "@/assets/cat-left.svg";
import { imgUrl } from "@/lib/img";
import type { HomeNight } from "@/lib/home";
import type { CcdEvent } from "@/lib/ccd-db";
import { dayStamp } from "@/lib/find";
import { displayTime, startDate } from "@/lib/nights";
import { loadCrowd, sceneKey, type Crowd } from "@/lib/plans";

type Props = { week: HomeNight[]; next: CcdEvent | null; hasTickets: boolean; today: string };

type Row = { id: string; title: string; venue: string; city: string; day: string; time: string | null; going: number };

const STEPS = ["Find a night", "Pick one", "You're going", "Finding your crew", "Crew matched", "Walk in together", "And then there's ours"];
// [ms from loop start, stage]; the find phase changes city and pick between.
const LOOP = 18000;

const pad = (n: number) => String(n).padStart(2, "0");

function useCountdown(ms: number | null) {
  const [t, setT] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (ms == null) return;
    const calc = () => {
      const diff = ms - Date.now();
      if (diff <= 0) return setT(null);
      const s = Math.floor(diff / 1000);
      setT({ d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

const Star = ({ style }: { style: React.CSSProperties }) => (
  <svg className="ccd-star" style={style} viewBox="0 0 100 100" aria-hidden>
    <path d="M50 2 L60 38 L98 40 L68 62 L80 98 L50 76 L20 98 L32 62 L2 40 L40 38 Z" fill="currentColor" stroke="hsl(var(--ink))" strokeWidth="6" />
  </svg>
);

const Av = ({ children, me, className = "" }: { children: React.ReactNode; me?: boolean; className?: string }) => (
  <span className={`inline-grid place-items-center h-9 min-w-9 md:h-10 md:min-w-10 px-2.5 border-[3px] border-ink font-display text-xs md:text-sm ${me ? "bg-acid-yellow" : "bg-cream"} text-ink ${className}`}>{children}</span>
);

export default function NightsDemo({ week, next, hasTickets, today }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 30%"] });
  const peekX = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-120%", "0%"]);
  const peekR = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-20, 0]);

  // Real nights for the list, real going counts.
  const [crowd, setCrowd] = useState<Record<string, Crowd>>({});
  useEffect(() => {
    if (week.length) loadCrowd(week.map((e) => sceneKey(e.id))).then(setCrowd).catch(() => {});
  }, [week]);
  const rows: Row[] = useMemo(
    () =>
      week.map((e) => ({
        id: e.id,
        title: e.title,
        venue: e.venue ?? "",
        city: e.city ?? "",
        day: dayStamp(e.event_date, today).label,
        time: displayTime(e.event_time),
        going: crowd[sceneKey(e.id)]?.going ?? 0,
      })),
    [week, crowd, today],
  );
  const cities = useMemo(() => {
    const count = new Map<string, number>();
    rows.forEach((r) => r.city && count.set(r.city, (count.get(r.city) ?? 0) + 1));
    return ["All", ...Array.from(count.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c)];
  }, [rows]);
  // The night the demo picks: a featured one in the second city if it has one, else the first.
  const demoCity = cities[1] ?? "All";
  const demoNight = useMemo(
    () => rows.find((r, i) => r.city === demoCity && week[i]?.featured) ?? rows.find((r) => r.city === demoCity) ?? rows[0] ?? null,
    [rows, demoCity, week],
  );

  const [stage, setStage] = useState(0);
  const [city, setCity] = useState("All");
  const [picked, setPicked] = useState<Row | null>(null);
  const [checked, setChecked] = useState(3);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const run = useCallback(
    (from: number, night?: Row | null) => {
      clear();
      const n = night ?? demoNight;
      const plan: [number, () => void][] = [
        [0, () => { setStage(0); setCity("All"); setPicked(null); setChecked(3); }],
        [1300, () => setCity(n?.city || "All")],
        [2700, () => setPicked(n)],
        [3700, () => setStage(1)],
        [5500, () => setStage(2)],
        [6600, () => setStage(3)],
        [8100, () => setStage(4)],
        [9000, () => setChecked(4)],
        [9800, () => setChecked(5)],
        [10700, () => setStage(5)],
        [13200, () => setStage(6)],
      ];
      // Jumping in: apply everything up to `from` now, schedule the rest.
      plan.slice(0, from + 1).forEach(([, f]) => f());
      if (night) { setCity(night.city || "All"); setPicked(night); }
      const start = plan[from][0];
      plan.slice(from + 1).forEach(([t, f]) => timers.current.push(setTimeout(f, t - start)));
      timers.current.push(setTimeout(() => run(0), LOOP - start));
    },
    [demoNight],
  );

  const visible = useOnScreen(ref);
  useEffect(() => {
    if (!demoNight) return;
    if (reduce) { setStage(4); setPicked(demoNight); setChecked(5); return; }
    if (!visible) { clear(); return; }
    run(0);
    return clear;
  }, [demoNight, reduce, run, visible]);

  const pickCity = (c: string) => {
    clear();
    setStage(0); setCity(c); setPicked(null);
    timers.current.push(setTimeout(() => run(0), 7000));
  };

  const start = next ? startDate(next, next.start_time) : null;
  const cd = useCountdown(start ? start.getTime() : null);
  const list = rows.filter((r) => city === "All" || r.city === city).slice(0, 5);
  const night = picked ?? demoNight;
  const catCls = ["ccd-cat-0", "ccd-cat-0", "ccd-cat-1", "ccd-cat-0", "ccd-cat-2", "ccd-cat-3", "ccd-cat-3"][stage];
  const pillars = [
    { n: "01", t: "Find a night", s: "Every underground night in India worth going to, checked by hand.", on: stage <= 1, go: () => run(0) },
    { n: "02", t: "Find your crew", s: "Say you're going. We match you with 3 to 6 people from your city.", on: stage >= 2 && stage <= 5, go: () => run(4, picked) },
    { n: "03", t: "Our nights", s: "CCD Episodes. Small rooms, big sound. The ones you don't miss.", on: stage === 6, go: () => run(10, picked) },
  ];

  if (!rows.length && !next) return null;

  return (
    <section id="nights-product" ref={ref} className="relative bg-electric-blue text-cream border-b-4 border-ink py-14 md:py-24 overflow-hidden">
      <motion.div style={{ x: peekX, rotate: peekR }} className="hidden md:block absolute -left-8 -bottom-5 w-52 z-[1] pointer-events-none" aria-hidden>
        <img src={imgUrl(catLeft)} alt="" className="wiggle w-full drop-shadow-[6px_6px_0_hsl(var(--ink))]" />
      </motion.div>

      <div className="container relative z-[2] grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-14 items-center">
        <div>
          <p className="font-display text-acid-yellow text-xs md:text-sm uppercase tracking-[0.2em] mb-3">01 · Nights</p>
          <h2 className="font-display text-[2.6rem] sm:text-6xl md:text-7xl leading-[0.92] drop-shadow-[6px_6px_0_hsl(var(--ink))]">
            Find a night.<br />Find your crew.
          </h2>
          <p className="text-cream/90 text-base md:text-lg mt-5 mb-7 max-w-[34ch]">And when it's one of ours, you already know.</p>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
            {pillars.map((p) => (
              <button
                key={p.n}
                type="button"
                onClick={p.go}
                className={`flex items-start gap-4 w-full text-left px-4 py-3.5 border-[3px] transition-all duration-300 ${
                  p.on ? "bg-acid-yellow text-ink border-ink md:translate-x-2 shadow-[5px_5px_0_0_hsl(var(--ink))]" : "border-cream/40 text-cream hover:border-cream"
                }`}
              >
                <span className="font-display text-xs opacity-70 pt-1">{p.n}</span>
                <span className="min-w-0">
                  <span className="block font-display text-lg md:text-xl leading-none">{p.t}</span>
                  <span className="block text-sm mt-1 opacity-85">{p.s}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-5 mt-8">
            <Link href="/whats-on" className="bg-acid-yellow text-ink font-display px-5 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform">Find a night</Link>
            {next && <Link href={`/nights/${next.slug}`} className="font-bold underline underline-offset-4 decoration-2">{next.episode_no ? `Episode ${next.episode_no}` : next.title} →</Link>}
          </div>
        </div>

        {/* The demo */}
        <div className="relative border-4 border-ink bg-ink text-cream p-4 md:p-6 shadow-[8px_8px_0_0_hsl(var(--ink))] md:shadow-[12px_12px_0_0_hsl(var(--ink))] min-h-[380px] md:min-h-[440px]">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-2 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.14em] text-cream/60">
              <i className="inline-block h-2 w-2 rounded-full bg-magenta ccd-blink" aria-hidden />
              How it works · plays on its own, tap anything
            </span>
            <span className="font-display text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-acid-yellow">{STEPS[stage]}</span>
          </div>
          <div className="flex gap-1.5 mb-4" aria-hidden>
            {STEPS.map((_, k) => (
              <span key={k} className="flex-1 h-1.5 transition-colors duration-500" style={{ background: k <= stage ? (k === 6 ? "hsl(var(--magenta))" : "hsl(var(--acid-yellow))") : "rgba(232,228,220,.15)" }} />
            ))}
          </div>

          {stage === 0 && (
            <div className="ccd-rise">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {cities.map((c) => (
                  <button key={c} type="button" onClick={() => pickCity(c)}
                    className={`font-display text-xs px-3 py-1.5 border-2 transition-colors ${c === city ? "bg-acid-yellow text-ink border-acid-yellow" : "border-cream/40 text-cream hover:border-cream"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
                {list.map((r) => {
                  const on = picked?.id === r.id;
                  return (
                    <button key={r.id} type="button" onClick={() => run(3, r)}
                      className={`relative flex items-center gap-3 w-full px-3 py-2.5 border-[3px] text-left transition-all duration-300 ${on ? "border-acid-yellow md:translate-x-1.5 bg-[#16203a]" : "bg-[#121a2e] border-cream/30 hover:border-cream"}`}>
                      <span className="w-12 md:w-16 shrink-0 text-center font-display text-[10px] md:text-[11px] uppercase tracking-wide text-acid-yellow">{r.day === "Tomorrow" ? "Tmrw" : r.day}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-display text-sm md:text-base leading-tight truncate">{r.title}</span>
                        <span className="block text-xs text-cream/70 truncate">{[r.venue, r.city].filter(Boolean).join(" · ")}</span>
                      </span>
                      {r.going > 0 && <span className="hidden sm:inline text-xs text-acid-yellow whitespace-nowrap">{r.going} going</span>}
                      {on && <span className="ccd-tap right-10 top-1.5" aria-hidden />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-cream/65">Checked by hand. Every night has an artist or promoter we trust behind it.</p>
            </div>
          )}

          {stage >= 1 && stage <= 5 && night && (
            <div className="border-4 border-cream/25 bg-[#0f1322] p-4 md:p-5 ccd-rise">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-cream/60 mb-1">{night.day}{night.time ? ` · ${night.time}` : ""}</p>
                  <p className="font-display text-xl md:text-3xl leading-none mb-1">{night.title}</p>
                  <p className="text-sm text-cream/75">{[night.venue, night.city].filter(Boolean).join(", ")}</p>
                </div>
                <div className="relative shrink-0">
                  {stage === 1 ? (
                    <>
                      <button type="button" onClick={() => run(4, picked)} className="ccd-pulse bg-acid-yellow text-ink font-display text-sm md:text-base px-4 py-3 border-4 border-ink">I'm going</button>
                      <span className="ccd-tap left-8 top-0.5" aria-hidden />
                    </>
                  ) : (
                    <span className="ccd-pop inline-block bg-electric-blue text-cream font-display text-sm md:text-base px-4 py-3 border-4 border-ink">Going ✓</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex gap-1.5">
                  <Av>A</Av><Av>R</Av><Av>S</Av>
                  {stage >= 2 && <Av me className="ccd-pop">You</Av>}
                </div>
                <span className="text-sm text-cream/85"><b className="font-display font-normal text-acid-yellow text-xl">{night.going + (stage >= 2 ? 1 : 0)}</b> going</span>
              </div>
            </div>
          )}

          {stage === 3 && night && (
            <div className="ccd-rise mt-3 p-3 md:p-4 border-2 border-dashed border-cream/40">
              <p className="text-sm text-cream/85 mb-2">Matching you with people from {night.city || "your city"} going to the same night…</p>
              <div className="h-2 bg-cream/15"><div className="ccd-sweep h-2 bg-acid-yellow" /></div>
            </div>
          )}

          {(stage === 4 || stage === 5) && (
            <div className="ccd-rise mt-3 border-4 border-acid-yellow bg-cream text-ink p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-lg md:text-2xl">Your crew · 5 people</span>
                <span className="ccd-pop bg-acid-yellow border-2 border-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">Matched</span>
              </div>
              <div className="flex gap-1.5 mb-3">
                <Av className="ccd-pop ccd-d1">A</Av><Av className="ccd-pop ccd-d2">R</Av><Av className="ccd-pop ccd-d3">S</Av><Av className="ccd-pop ccd-d4">M</Av><Av me className="ccd-pop ccd-d5">You</Av>
              </div>
              <p className="text-sm leading-relaxed"><b>Meet</b> near the venue before doors · <b>Captain</b> picked from the crew · WhatsApp group opens · tickets <b className="font-display font-normal">{checked}</b> of 5 checked</p>
            </div>
          )}

          {stage === 5 && (
            <div className="ccd-rise relative mt-3 flex items-center gap-4 border-4 border-cream bg-electric-blue text-cream p-4">
              <div className="flex-1">
                <span className="block font-display text-xl md:text-2xl leading-none">Walk in together.</span>
                <span className="text-xs md:text-sm opacity-90">Crew entry list goes to partner venues · one door time</span>
              </div>
              <Star style={{ left: "30%", top: 6, ["--x" as any]: "-70px", ["--y" as any]: "-90px", color: "hsl(var(--acid-yellow))" }} />
              <Star style={{ left: "55%", top: 6, ["--x" as any]: "40px", ["--y" as any]: "-110px", color: "hsl(var(--cream))", animationDelay: ".1s" }} />
              <Star style={{ left: "70%", top: 6, ["--x" as any]: "110px", ["--y" as any]: "-70px", color: "hsl(var(--magenta))", animationDelay: ".2s" }} />
            </div>
          )}

          {stage === 6 && next && (
            <div className="ccd-rise border-4 border-cream bg-magenta text-cream overflow-hidden">
              <div className="p-4 md:p-6">
                <p className="font-display text-[11px] uppercase tracking-[0.2em] opacity-85 mb-1">And then there's ours</p>
                <p className="font-display text-3xl md:text-5xl leading-[0.92] mb-2 drop-shadow-[4px_4px_0_hsl(var(--ink))]">{next.episode_no ? `Episode ${next.episode_no}` : next.title}</p>
                <p className="text-sm mb-4">{[next.date, next.venue, next.city].filter(Boolean).join(" · ")}</p>
                {cd && (
                  <div className="flex gap-2 mb-5">
                    {[[cd.d, "days"], [cd.h, "hrs"], [cd.m, "min"], [cd.s, "sec"]].map(([v, l], i) => (
                      <span key={l as string} className={`flex-1 border-2 ${i === 3 ? "border-acid-yellow" : "border-cream/50"} px-1 py-1.5 text-center text-[9px] uppercase tracking-widest`}>
                        <b className={`block font-display font-normal text-2xl leading-none tracking-normal ${i === 3 ? "text-acid-yellow" : ""}`}>{pad(v as number)}</b>{l}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={hasTickets ? `/tickets/${next.slug}` : `/nights/${next.slug}`} className="bg-cream text-ink font-display px-4 py-2.5 border-4 border-ink shadow-[4px_4px_0_0_hsl(var(--ink))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform">
                    {hasTickets ? "Get tickets" : "See the night"}
                  </Link>
                  <button type="button" onClick={() => run(0)} className="bg-ink text-cream font-display text-sm px-4 py-2.5 border-4 border-ink">Watch again</button>
                </div>
              </div>
            </div>
          )}

          <img
            src={imgUrl(catRight)}
            alt=""
            aria-hidden
            className={`ccd-react absolute w-28 md:w-36 -right-5 md:-right-14 -bottom-14 md:-bottom-8 z-[6] pointer-events-none drop-shadow-[5px_5px_0_hsl(var(--ink))] transition-transform duration-500 ${catCls}`}
          />
        </div>
      </div>
    </section>
  );
}
