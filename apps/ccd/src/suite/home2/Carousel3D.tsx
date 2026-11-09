/**
 * This week as a 3D carousel: the nights' posters on a ring that turns on drag, swipe, the arrows or a
 * sideways trackpad scroll, and drifts slowly on its own. The poster in front can be flipped for the
 * lineup, the venue and the way in. Reduced motion stops the drift and the tilt.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type RingNight = {
  key: string; title: string; href: string; external: boolean; img: string | null; poster: string;
  day: string; venue: string; city: string; lineup: string[]; tag: string | null; when: string;
};

export default function Carousel3D({ nights, allHref, allLabel }: { nights: RingNight[]; allHref: string; allLabel: string }) {
  const n = nights.length;
  const step = 360 / Math.max(n, 1);
  const [angle, setAngle] = useState(0);
  const [snap, setSnap] = useState(true);
  const [flipped, setFlipped] = useState<string | null>(null);
  const [w, setW] = useState(280);
  const drag = useRef<{ x: number; a: number; moved: boolean } | null>(null);
  const hover = useRef(false);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fit = () => setW(window.innerWidth < 640 ? 210 : window.innerWidth < 1100 ? 250 : 290);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // A slow drift when nobody is touching it.
  useEffect(() => {
    let raf = 0, last = performance.now();
    const tick = (t: number) => {
      const dt = t - last; last = t;
      if (!drag.current && !hover.current && !flipped && !reduce.current && document.visibilityState === "visible") {
        setSnap(false);
        setAngle((a) => a - dt * 0.006);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [flipped]);

  const front = n ? (((Math.round(-angle / step) % n) + n) % n) : 0;
  const goTo = useCallback((i: number) => {
    setSnap(true);
    setAngle((a) => {
      const cur = Math.round(-a / step);
      const curIdx = ((cur % n) + n) % n;
      let d = i - curIdx;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      return -(cur + d) * step;
    });
  }, [n, step]);
  const nudge = (d: number) => { setFlipped(null); goTo((front + d + n) % n); };

  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, a: angle, moved: false }; setSnap(false); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    setAngle(d.a + dx * 0.32);
  };
  const onUp = () => {
    const d = drag.current; drag.current = null;
    if (d?.moved) { setFlipped(null); setSnap(true); setAngle((a) => Math.round(a / step) * step); }
  };
  const onWheel = (e: React.WheelEvent) => {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!dx) return;
    setSnap(false); setFlipped(null);
    setAngle((a) => a - dx * 0.15);
    window.clearTimeout((onWheel as unknown as { t?: number }).t);
    (onWheel as unknown as { t?: number }).t = window.setTimeout(() => { setSnap(true); setAngle((a) => Math.round(a / step) * step); }, 160);
  };

  if (!n) return null;
  const gap = 34;
  const radius = Math.max(w * 1.1, (w + gap) / (2 * Math.tan(Math.PI / n)));
  const cur = nights[front];
  return (
    <div className="c3">
      <div className="c3-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}
        onMouseEnter={() => { hover.current = true; setSnap(true); setAngle((a) => Math.round(a / step) * step); }} onMouseLeave={() => { hover.current = false; }}
        style={{ ["--w" as string]: `${w}px`, height: w * 1.33 + 120 }} aria-roledescription="carousel" aria-label="This week's nights">
        <div className="c3-ring" style={{ transform: `translateZ(${-radius}px) rotateY(${angle}deg)`, transition: snap ? "transform .7s cubic-bezier(.2,.8,.2,1)" : "none" }}>
          {nights.map((x, i) => {
            const rel = ((((i * step + angle) % 360) + 540) % 360) - 180; // -180..180, 0 = in front
            const isFront = i === front;
            return (
              <div key={x.key} className={`c3-card${isFront ? " front" : ""}${flipped === x.key ? " flip" : ""}`}
                style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)`, ["--o" as string]: Math.max(0.18, 1 - Math.abs(rel) / 150) } as React.CSSProperties}
                aria-hidden={!isFront}>
                <button type="button" className="c3-face" tabIndex={isFront ? 0 : -1} aria-label={isFront ? `${x.title}, ${x.when}. Show details` : `Turn to ${x.title}`}
                  onClick={() => { if (drag.current?.moved) return; if (isFront) { setSnap(true); setAngle((a) => Math.round(a / step) * step); setFlipped(flipped === x.key ? null : x.key); } else { setFlipped(null); goTo(i); } }}>
                  <span className="c3-front">
                    {x.img ? <img src={x.img} alt="" loading="lazy" draggable={false} /> : <span className="c3-made" dangerouslySetInnerHTML={{ __html: x.poster }} />}
                    {x.tag && <span className="c3-tag">{x.tag}</span>}
                    <span className="c3-day">{x.day}</span>
                  </span>
                  <span className="c3-back">
                    <span className="c3-kick">{x.when}</span>
                    <b>{x.title}</b>
                    {x.lineup.length > 0 && <span className="c3-line">{x.lineup.slice(0, 5).join(", ")}</span>}
                    <span className="c3-where">{[x.venue, x.city].filter(Boolean).join(", ")}</span>
                    <span className="c3-go">Get in</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="c3-floor" aria-hidden="true" />
      </div>
      <div className="c3-bar">
        <button type="button" className="c3-arrow" onClick={() => nudge(-1)} aria-label="Previous night"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></button>
        <div className="c3-now" aria-live="polite">
          <span className="c3-kick">{cur.when}{cur.tag ? ` · ${cur.tag}` : ""}</span>
          <b>{cur.title}</b>
          <span>{[cur.venue, cur.city].filter(Boolean).join(", ")}</span>
        </div>
        <a className="c3-cta" href={cur.href} target={cur.external ? "_blank" : undefined} rel={cur.external ? "noopener" : undefined}>Get in</a>
        <button type="button" className="c3-arrow" onClick={() => nudge(1)} aria-label="Next night"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg></button>
      </div>
      <div className="c3-all"><a href={allHref}>{allLabel}</a></div>
      <ul className="sr-only">{nights.map((x) => <li key={x.key}><a href={x.href}>{x.title}, {x.when}, {x.venue}</a></li>)}</ul>
    </div>
  );
}
