/**
 * School on the home: the real app in a phone frame, cycling its screens, and a
 * lesson that builds a house beat by itself, step by step. Tap any cell to change it.
 * Sound waits for a tap (browsers block audio until then). The cat jumps on every kick.
 */
import { useOnScreen } from "@/lib/useOnScreen";
import { track } from "@/lib/track";
import { useEffect, useRef, useState } from "react";
import catHpDance from "@/assets/cat-headphones-dance.png";
import { imgUrl } from "@/lib/img";
import { SCHOOL_URL } from "@/lib/ccd-db";

type RowKey = "kick" | "clap" | "hat";
const SCREENS = [
  { src: "/img/school/home.webp", l: "welcome", alt: "CCD School welcome screen" },
  { src: "/img/school/learn.webp", l: "lessons", alt: "CCD School lessons" },
  { src: "/img/school/studio.webp", l: "studio", alt: "CCD School studio drum pads" },
  { src: "/img/school/dj.webp", l: "dj", alt: "CCD School DJ decks" },
  { src: "/img/school/gym.webp", l: "practice", alt: "CCD School ear practice" },
];
// One action per beat: add a cell, wait, or clear.
const LESSON: ([RowKey, number] | ["add"] | ["wait"] | ["clear"])[] = [
  ["kick", 0], ["kick", 4], ["kick", 8], ["kick", 12],
  ["clap", 4], ["clap", 12],
  ["hat", 2], ["hat", 6], ["hat", 10], ["hat", 14],
  ["add"], ["wait"], ["wait"], ["wait"], ["wait"], ["wait"], ["wait"], ["clear"],
];
const empty = () => new Array(16).fill(0) as number[];
const STEP_MS = Math.round(60000 / 124 / 4);

export default function SchoolDemo() {
  const [grid, setGrid] = useState<Record<RowKey, number[]>>({ kick: empty(), clap: empty(), hat: empty() });
  const [step, setStep] = useState(-1);
  const [li, setLi] = useState(0);
  const [last, setLast] = useState("");
  const [sound, setSound] = useState(false);
  const [si, setSi] = useState(0);
  const siHold = useRef(0);
  const ctx = useRef<AudioContext | null>(null);
  const state = useRef({ grid, step, li, sound });
  state.current = { grid, step, li, sound };

  const ac = () => {
    if (ctx.current) return ctx.current;
    try { ctx.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { ctx.current = null; }
    return ctx.current;
  };
  const noise = (c: AudioContext, len: number) => {
    const b = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b; return s;
  };
  const hit = (row: RowKey) => {
    const c = ac(); if (!c) return; const t = c.currentTime;
    if (row === "kick") { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .14); g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(g).connect(c.destination); o.start(t); o.stop(t + .32); }
    if (row === "clap") { const s = noise(c, .25), f = c.createBiquadFilter(), g = c.createGain(); f.type = "bandpass"; f.frequency.value = 1800; g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(.6, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + .18); s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + .25); }
    if (row === "hat") { const s = noise(c, .08), f = c.createBiquadFilter(), g = c.createGain(); f.type = "highpass"; f.frequency.value = 7000; g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t + .06); s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + .08); }
  };

  const secRef = useRef<HTMLElement>(null);
  const visible = useOnScreen(secRef);
  useEffect(() => {
    if (!visible) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setGrid({ kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], clap: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hat: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0] });
      setLi(11);
      return;
    }
    const id = setInterval(() => {
      const s = state.current;
      const st = (s.step + 1) % 16;
      if (s.sound) (["kick", "clap", "hat"] as RowKey[]).forEach((r) => s.grid[r][st] && hit(r));
      setStep(st);
      if (st % 4 !== 0) return;
      const a = LESSON[s.li];
      if (a[0] === "clear") { setGrid({ kick: empty(), clap: empty(), hat: empty() }); setLi(0); setLast(""); return; }
      if (a.length === 2) {
        const [row, i] = a as [RowKey, number];
        setGrid((g) => ({ ...g, [row]: g[row].map((v, k) => (k === i ? 1 : v)) }));
        setLast(row + i);
      } else setLast("");
      setLi(s.li + 1);
    }, STEP_MS);
    const scr = setInterval(() => {
      if (siHold.current > 0) { siHold.current -= 1; return; }
      setSi((i) => (i + 1) % SCREENS.length);
    }, 2600);
    return () => { clearInterval(id); clearInterval(scr); };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (row: RowKey, i: number) => {
    const on = !state.current.grid[row][i];
    if (on && state.current.sound) hit(row);
    setGrid((g) => ({ ...g, [row]: g[row].map((v, k) => (k === i ? (on ? 1 : 0) : v)) }));
    setLast(row + i);
  };
  const toggleSound = () => { const c = ac(); if (c && c.state === "suspended") c.resume(); setSound((v) => !v); };

  const caption = li <= 4 ? "Step 1 · a kick on every beat" : li <= 6 ? "Step 2 · the clap on 2 and 4" : li <= 10 ? "Step 3 · hats in between" : "Done · that is a house beat";
  const has = (r: RowKey) => grid[r].some(Boolean);
  const ROWS: [RowKey, string, string][] = [["kick", "Kick", "bg-magenta border-magenta"], ["clap", "Clap", "bg-acid-yellow border-acid-yellow"], ["hat", "Hat", "bg-electric-blue border-electric-blue"]];
  const labelColor: Record<RowKey, string> = { kick: "text-magenta", clap: "text-acid-yellow", hat: "text-electric-blue" };

  return (
    <section id="school" ref={secRef} className="relative bg-cream bg-grain border-b-4 border-ink py-14 md:py-24 overflow-hidden">
      <div className="container grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 lg:gap-14 items-center">
        {/* The real app */}
        <div className="relative flex flex-col items-center order-2 lg:order-1">
          <div className="relative w-[250px] h-[542px] md:w-[310px] md:h-[672px] border-[6px] border-ink rounded-[40px] overflow-hidden bg-[#d9d6d0] shadow-[14px_14px_0_0_hsl(var(--ink))]">
            {SCREENS.map((s, i) => (
              <img key={s.src} src={s.src} alt={s.alt} loading="lazy"
                className={`absolute inset-0 w-full h-full object-cover object-top transition-[opacity,transform] duration-700 ${i === si ? "opacity-100" : "opacity-0 scale-[1.04]"}`} />
            ))}
          </div>
          <span className="ccd-bob absolute left-0 md:-left-6 top-16 md:top-24 border-[3px] border-ink bg-cream px-3 py-2 text-xs font-bold shadow-[4px_4px_0_0_hsl(var(--ink))]">lesson 4 · clap on 2 and 4</span>
          <span className="ccd-bob absolute right-0 md:-right-6 top-72 border-[3px] border-ink bg-acid-yellow px-3 py-2 text-xs font-bold shadow-[4px_4px_0_0_hsl(var(--ink))] [animation-delay:.6s]">+1 layer to your track</span>
          <span className="ccd-bob hidden md:block absolute -left-4 top-[440px] border-[3px] border-ink bg-ink text-cream px-3 py-2 text-xs font-bold shadow-[4px_4px_0_0_hsl(var(--ink))] [animation-delay:1.1s]">tempo synced to Live</span>
          <div className="flex flex-wrap justify-center gap-1.5 mt-7">
            {SCREENS.map((s, i) => (
              <button key={s.l} type="button" onClick={() => { setSi(i); siHold.current = 3; }}
                className={`font-display text-xs px-3 py-1.5 min-h-[36px] border-2 border-ink transition-colors ${i === si ? "bg-ink text-cream" : "text-ink hover:bg-ink/10"}`}>
                {s.l}
              </button>
            ))}
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="font-display text-magenta text-xs md:text-sm uppercase tracking-[0.2em] mb-3">03 · School</p>
          <h2 className="font-display text-ink text-[2.6rem] sm:text-6xl md:text-7xl leading-[0.92]">Learn it<br />by making it.</h2>
          <p className="text-ink/80 text-base md:text-lg mt-5 mb-7 max-w-[40ch]">Every lesson adds a layer to your own track. Watch one build itself, then tap the grid.</p>

          <div className="relative border-4 border-ink bg-ink text-cream p-3 md:p-6 shadow-[12px_12px_0_0_hsl(var(--ink))]">
            <div className="flex items-center justify-between mb-3 gap-3">
              <span className="inline-flex items-center gap-2 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.14em] text-cream/60">
                <i className="inline-block h-2 w-2 rounded-full bg-magenta ccd-blink" aria-hidden />Lesson 4 · building itself
              </span>
              <button type="button" onClick={toggleSound} aria-pressed={sound}
                className={`font-display text-xs px-3 py-2 border-4 border-ink ${sound ? "bg-acid-yellow text-ink" : "bg-cream text-ink"}`}>
                {sound ? "Sound on" : "Sound off · tap"}
              </button>
            </div>
            <p className="font-display text-base md:text-lg mb-3">{caption}</p>
            <div className="border-4 border-cream/25 bg-[#0f1322] p-2 md:p-4">
              {ROWS.map(([row, label, onCls]) => (
                <div key={row} className="flex items-center gap-2 md:gap-3 mb-2.5 md:mb-2 last:mb-0">
                  <span className={`w-8 md:w-10 text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${labelColor[row]}`}>{label}</span>
                  <div className="flex-1 grid grid-cols-8 gap-[4px] md:flex md:gap-1.5">
                    {grid[row].map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => tap(row, i)}
                        aria-label={`${label} step ${i + 1}`}
                        aria-pressed={!!v}
                        className={`relative flex-1 aspect-square border-2 transition-transform hover:scale-110 ${v ? onCls : "border-cream/20"} ${i === step ? "outline outline-[3px] outline-cream outline-offset-1 brightness-150" : ""} ${last === row + i ? "ccd-cell-new" : ""}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 gap-3">
              <div className="flex gap-1" aria-hidden>
                {([["kick", "bg-magenta"], ["clap", "bg-acid-yellow"], ["hat", "bg-electric-blue"], ["bass", ""]] as [string, string][]).map(([l, bg]) => (
                  <span key={l} className={`block w-10 md:w-12 h-7 border-2 border-cream/30 px-1 text-[8px] md:text-[9px] font-bold uppercase text-ink transition-colors duration-500 ${l !== "bass" && has(l as RowKey) ? bg : ""}`}>{l}</span>
                ))}
              </div>
              {li > 10 && <span className="ccd-pop bg-acid-yellow text-ink border-2 border-ink px-2.5 py-1 text-[10px] md:text-[11px] font-bold uppercase tracking-wider">Added to my first track</span>}
            </div>
            <img
              src={imgUrl(catHpDance)}
              alt=""
              aria-hidden
              className={`ccd-react absolute -right-2 md:-right-16 -top-[88px] md:-top-28 w-16 md:w-36 drop-shadow-[5px_5px_0_hsl(var(--ink))] transition-transform duration-75 ${step >= 0 && grid.kick[step] ? "-translate-y-4 scale-105 -rotate-3" : ""}`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-5 mt-9">
            <a href={SCHOOL_URL} onClick={() => track("open_school")} className="bg-magenta text-cream font-display px-5 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform">Open the school</a>
            <span className="text-sm font-semibold text-ink/70">Free for now · reads your Ableton Set</span>
          </div>
        </div>
      </div>
    </section>
  );
}
