/**
 * The four apps. Each card says what the app is; picking one changes the stage, where the app runs on a
 * phone by itself, step by step, like the demos on the live catscandance.com home. Tap a step to jump to
 * it. The stage always fits the screen. Reduced motion shows the steps without the auto-play.
 */
import { useEffect, useRef, useState } from "react";

export type StageApp = {
  key: string; name: string; verb: string; colour: string; ink: string; url: string; line: string;
  headline: string; body: string; primary: { label: string; href: string }; secondary: { label: string; href: string };
  facts: string[]; steps: { shot: string; cap: string }[];
};

const STEP_MS = 2800;

export default function AppStage({ apps }: { apps: StageApp[] }) {
  const [ai, setAi] = useState(0);
  const [si, setSi] = useState(0);
  const [auto, setAuto] = useState(true);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const app = apps[ai];

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(false);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || !seen) return;
    const t = window.setTimeout(() => {
      if (si + 1 < app.steps.length) setSi(si + 1);
      else { setSi(0); setAi((ai + 1) % apps.length); }
    }, STEP_MS);
    return () => window.clearTimeout(t);
  }, [ai, si, auto, seen, app.steps.length, apps.length]);

  const pick = (i: number) => { setAi(i); setSi(0); };
  return (
    <div className="as" ref={ref} style={{ ["--ac" as string]: app.colour, ["--ai" as string]: app.ink }}>
      <div className="as-cards" role="tablist" aria-label="The four apps">
        {apps.map((a, i) => (
          <button key={a.key} type="button" role="tab" aria-selected={i === ai} className={`as-card${i === ai ? " on" : ""}`} onClick={() => { pick(i); setAuto(false); }} style={{ ["--c" as string]: a.colour }}>
            <span className="as-dot" /><span className="as-name">{a.name}</span>
            <b>{a.verb}</b>
            <span className="as-line">{a.line}</span>
            {i === ai && auto && <i className="as-run" key={`${ai}-${si}`} style={{ animationDuration: `${STEP_MS * app.steps.length}ms` }} />}
          </button>
        ))}
      </div>
      <div className="as-stage" role="tabpanel" aria-label={app.name}>
        <div className="as-copy" key={app.key}>
          <span className="as-url">{app.name} <i>/</i> {app.url}</span>
          <h3>{app.headline}</h3>
          <p>{app.body}</p>
          <div className="as-btns">
            <a className="as-key" href={app.primary.href}>{app.primary.label}</a>
            <a className="as-ghost" href={app.secondary.href}>{app.secondary.label}</a>
          </div>
          <ul className="as-facts">{app.facts.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
        <div className="as-demo">
          <div className="as-phone">
            {app.steps.map((s, i) => <img key={s.shot} src={`/shots/${s.shot}.webp`} alt={i === si ? `${app.name}: ${s.cap}` : ""} className={i === si ? "on" : ""} loading={ai === 0 ? "eager" : "lazy"} />)}
          </div>
          <ol className="as-steps">
            {app.steps.map((s, i) => (
              <li key={s.cap}><button type="button" className={i === si ? "on" : i < si ? "done" : ""} onClick={() => { setSi(i); setAuto(false); }}><span>{String(i + 1).padStart(2, "0")}</span>{s.cap}</button></li>
            ))}
          </ol>
          {!auto && <button type="button" className="as-play" onClick={() => setAuto(true)}>Play the demo</button>}
        </div>
      </div>
    </div>
  );
}
