/**
 * One band for CCD.SCHOOL. Its own look (an instrument), one action.
 */
import { SCHOOL_URL } from "@/lib/ccd-db";

const STEPS = 16;

export default function LearnBand() {
  return (
    <section id="learn" className="bg-ink border-b-4 border-ink py-10 md:py-14 text-cream overflow-hidden">
      <div className="container grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-8 items-center">
        <div>
          <p className="font-display text-sm uppercase tracking-[0.2em] mb-2 text-cream/60">Learn · CCD.SCHOOL</p>
          <h2 className="font-display text-4xl sm:text-5xl leading-[0.95] mb-3">You make.</h2>
          <p className="text-cream/80 text-lg max-w-prose">
            Learn to produce, DJ and mix on an instrument that runs in the browser and talks to Ableton. Every lesson adds something real to a track you keep. Free for now.
          </p>
          <a
            href="/school"
            className="inline-block mt-5 bg-cream text-ink font-display text-base px-5 py-3 border-4 border-cream shadow-[6px_6px_0_0_hsl(var(--acid-yellow))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
          >
            Open the school →
          </a>
          <span className="sr-only">{SCHOOL_URL}</span>
        </div>
        {/* step sequencer */}
        <div className="border-4 border-cream/30 p-3 md:p-4 bg-[#0f1322]" aria-hidden>
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-1 md:gap-1.5 mb-1.5 last:mb-0">
              {Array.from({ length: STEPS }).map((_, i) => {
                const on = row === 0 ? i % 4 === 0 : row === 1 ? i % 8 === 4 : i % 2 === 1;
                return (
                  <span
                    key={i}
                    className={`flex-1 aspect-square border-2 border-cream/20 ${on ? (row === 0 ? "bg-magenta" : row === 1 ? "bg-acid-yellow" : "bg-electric-blue") : "bg-transparent"} ${on ? "shadow-[inset_0_0_0_2px_rgba(0,0,0,0.25)]" : ""}`}
                  />
                );
              })}
            </div>
          ))}
          <div className="flex items-center justify-between mt-3 text-[10px] font-semibold uppercase tracking-widest text-cream/50">
            <span>Kick · Snare · Hat</span>
            <span>124 BPM</span>
          </div>
        </div>
      </div>
    </section>
  );
}
