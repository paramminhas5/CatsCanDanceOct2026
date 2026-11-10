/**
 * What's on (v3 canvas board WhatsOn; earlier F38-Discover): posters first, by day, with a day strip,
 * a when and a city filter, and three moving moments at the end instead of a list of features.
 * Filters live in the URL query and run in the browser, so the list ships in the HTML.
 */
import { useMemo } from "react";
import { useRouter } from "next/router";
import { Pill, Cat, ButtonLink, posterSvg } from "@ccd/ui";
import type { FindProps } from "@/pages/Discover";
import Shell from "@/suite/Shell";
import { dayLabel, city } from "@/suite/bits";

const WHEN = [["all", "Everything"], ["tonight", "Tonight"], ["weekend", "This weekend"], ["week", "Next 7 days"]] as const;
const add = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export default function WhatsOnSuite({ events, ours, updated }: FindProps) {
  const { query } = useRouter();
  const when = (typeof query.when === "string" && WHEN.some(([k]) => k === query.when) ? query.when : "all") as (typeof WHEN)[number][0];
  const want = typeof query.city === "string" ? query.city : "";
  const cities = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of events) { const k = city(e.city); if (k) c.set(k, (c.get(k) ?? 0) + 1); }
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  }, [events]);
  const list = events.filter((e) => {
    const d = e.event_date ?? "";
    if (want && city(e.city) !== want) return false;
    if (when === "tonight") return d === updated;
    if (when === "week") return d >= updated && d <= add(updated, 7);
    if (when === "weekend") { const dow = new Date(`${d}T00:00:00Z`).getUTCDay(); return d >= updated && d <= add(updated, 7) && (dow === 5 || dow === 6 || dow === 0); }
    return true;
  });
  const byDay = new Map<string, typeof list>();
  for (const e of list) { const k = e.event_date ?? "later"; byDay.set(k, [...(byDay.get(k) ?? []), e]); }
  const href = (q: Record<string, string>) => {
    const p = new URLSearchParams(Object.entries({ when, city: want, ...q }).filter(([, v]) => v && v !== "all") as [string, string][]);
    return `/whats-on${p.size ? `?${p}` : ""}`;
  };
  return (
    <Shell title="What's on: the nights worth going to | Cats Can Dance" description="Every night we would go to in India this week, by day. Tickets and guest lists with each night.">
      <style dangerouslySetInnerHTML={{ __html: WO_CSS }} />
      <section className="k-wrap pt-10">
        <div className="wo-hero">
          <h1>What's on.</h1>
          <p>Only nights with someone you can trust behind them: a real lineup, a real promoter, a room that cares. {events.length} right now.</p>
          {ours && <ButtonLink variant="key" size="s" href={`/nights/${ours.slug}`}>Ours: {ours.title}</ButtonLink>}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">{WHEN.map(([k, l]) => <Pill key={k} href={href({ when: k })} on={k === when}>{l}</Pill>)}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill href={href({ city: "" })} on={!want}>Every city</Pill>
          {cities.map((c) => <Pill key={c} href={href({ city: c })} on={want === c}>{c}</Pill>)}
        </div>
      </section>
      {byDay.size > 1 && (
        <nav className="k-wrap wo-days" aria-label="Jump to a day">
          {[...byDay.entries()].map(([d, rows]) => {
            const lab = d === updated ? "Tonight" : d === "later" ? "Later" : new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
            const num = d === "later" ? "" : String(Number(d.slice(8, 10)));
            return <a key={d} href={`#d-${d}`} className={d === updated ? "on" : undefined}><span>{lab}</span><b>{num || "·"}</b><em>{rows.length}</em></a>;
          })}
        </nav>
      )}
      <section className="k-wrap pt-8">
        {list.length === 0 ? (
          <div className="k-surface grid justify-items-start gap-3 rounded-[22px] p-6"><Cat name="dance" height={80} /><b className="text-[18px]">Nothing we would go to{want ? ` in ${want}` : ""} for that.</b><a className="k-btn k-btn--ghost" href="/whats-on">See everything</a></div>
        ) : (
          [...byDay.entries()].map(([d, rows]) => (
            <div key={d} id={`d-${d}`} className="mt-10 first:mt-0 wo-block">
              <h2 className="wo-day">{d === updated ? "Tonight" : dayLabel(d)}<span>{rows.length} {rows.length === 1 ? "night" : "nights"}</span></h2>
              <ul className="wo-grid">
                {rows.map((e) => {
                  const lineup = (e.lineup ?? []).filter(Boolean);
                  const names = lineup.length ? lineup : e.artists.map((x) => x.name);
                  const href = e.night_key ? `/nights/${e.night_key}` : e.ticket_url ?? e.url;
                  return (
                    <li key={e.id} className="wo-card">
                      <a href={href} target={e.night_key ? undefined : "_blank"} rel="noopener">
                        <span className="wo-poster">
                          {e.image_url ? <img src={e.image_url} alt="" loading="lazy" /> : <span className="wo-made" dangerouslySetInnerHTML={{ __html: posterSvg({ title: e.title, lineup: names, venue: e.venue, city: city(e.city), date: e.event_date, time: e.event_time }) }} />}
                          {(e.featured || e.presenter) && <span className="wo-tag">{e.presenter ? `By ${e.presenter}` : "Our pick"}</span>}
                          <span className="wo-go">{e.night_key ? "Get in" : "Tickets"}</span>
                        </span>
                        <b>{e.title}</b>
                        {names.length > 0 && <span className="wo-line">{names.slice(0, 4).join(", ")}</span>}
                        <span className="wo-meta">{[e.event_time?.slice(0, 5), e.venue, city(e.city)].filter(Boolean).join(" · ")}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
      <section className="k-wrap wo-moments" aria-label="Going out with Cats Can Dance">
        <h2>Going out, the way it should feel.</h2>
        <div className="wo-mgrid">
          <div className="wo-m">
            <div className="wo-crew" aria-hidden="true">
              <i style={{ left: "41%", top: 70, background: "#2563eb", color: "#fff", ["--fx" as string]: "0px", ["--fy" as string]: "0px" }}>You</i>
              <i style={{ left: "14%", top: 20, background: "#b6ef36", ["--fx" as string]: "-80px", ["--fy" as string]: "-40px", animationDelay: ".5s" }}>A</i>
              <i style={{ left: "66%", top: 18, background: "#ffe600", ["--fx" as string]: "80px", ["--fy" as string]: "-40px", animationDelay: "1s" }}>R</i>
              <i style={{ left: "10%", top: 128, background: "#ff4d8d", ["--fx" as string]: "-90px", ["--fy" as string]: "40px", animationDelay: "1.5s" }}>S</i>
              <i style={{ left: "70%", top: 130, background: "#f2efe7", ["--fx" as string]: "90px", ["--fy" as string]: "40px", animationDelay: "2s" }}>K</i>
            </div>
            <b>Nobody goes alone.</b>
            <span>Tap “find a crew” and meet 3 to 6 people going to the same night.</span>
            <em>Example crew</em>
          </div>
          <div className="wo-m">
            <div className="wo-door" aria-hidden="true"><div className="wo-qr"><i /><span><svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#0a0a0c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></span></div></div>
            <b>Green and you're in.</b>
            <span>One code for every ticket, even the one you bought on District.</span>
          </div>
          <div className="wo-m">
            <div className="wo-stubs" aria-hidden="true">
              {list.filter((e) => e.image_url).slice(0, 3).map((e, i) => (
                <span key={e.id} className={i === 2 ? "drop" : undefined} style={{ left: `${8 + i * 22}%`, top: i === 2 ? 0 : 16 - i * 6, transform: i === 2 ? undefined : `rotate(${i ? -2 : -10}deg)` }}>
                  <img src={e.image_url as string} alt="" loading="lazy" /><em>{(e.title ?? "").slice(0, 18).toUpperCase()}</em>
                </span>
              ))}
            </div>
            <b>Every night, kept.</b>
            <span>The morning after, the stub lands on your page with the lineup and your crew.</span>
          </div>
        </div>
      </section>
    </Shell>
  );
}

const WO_CSS = `
.wo-hero{display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:16px 32px}
.wo-hero h1{margin:0;font-family:var(--k-display);font-weight:800;font-size:clamp(56px,8vw,104px);letter-spacing:-.03em;line-height:.9}
.wo-hero p{margin:0;max-width:44ch;color:var(--k-t2);font-size:18px;line-height:1.5;flex:1 1 320px}
.wo-days{display:flex;gap:10px;overflow-x:auto;padding-top:22px;padding-bottom:6px;scrollbar-width:none}
.wo-days a{flex-shrink:0;display:grid;grid-template-columns:auto auto;align-items:baseline;gap:0 8px;min-width:84px;padding:12px 16px;border-radius:16px;background:var(--k-raised);color:var(--k-tx);text-decoration:none}
.wo-days a span{grid-column:1/-1;font:500 11px var(--k-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--k-t2)}
.wo-days a b{font-size:22px}
.wo-days a em{font-style:normal;font-size:12px;color:var(--k-t3)}
.wo-days a.on{background:var(--k-paper);color:var(--k-ink)}.wo-days a.on span,.wo-days a.on em{color:#5d5a52}
.wo-block{scroll-margin-top:140px}
.wo-moments{padding-top:120px;padding-bottom:40px}
.wo-moments h2{margin:0 0 28px;font-family:var(--k-display);font-weight:800;font-size:clamp(36px,4.4vw,56px);letter-spacing:-.025em;line-height:.95}
.wo-mgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media (max-width:900px){.wo-mgrid{grid-template-columns:1fr}}
.wo-m{position:relative;display:flex;flex-direction:column;gap:8px;padding:28px;border-radius:28px;background:var(--k-raised);overflow:hidden}
.wo-m b{font-family:var(--k-display);font-size:30px;font-weight:800;letter-spacing:-.02em}
.wo-m>span{color:var(--k-t2);line-height:1.45}
.wo-m>em{font:500 11px var(--k-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--k-example);font-style:normal}
.wo-crew,.wo-door,.wo-stubs{position:relative;height:210px;margin-bottom:12px}
.wo-crew i{position:absolute;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font:700 20px var(--k-ui);font-style:normal;color:#0a0a0c;animation:wo-join 6s infinite both}
@keyframes wo-join{0%{opacity:0;transform:translate(var(--fx),var(--fy)) scale(.6)}15%,85%{opacity:1;transform:none}100%{opacity:0;transform:scale(.9)}}
.wo-door{display:grid;place-items:center}
.wo-qr{position:relative;width:150px;height:150px;border-radius:18px;background:repeating-conic-gradient(#0a0a0c 0 25%,#f2efe7 0 50%) 0 0/30px 30px;box-shadow:0 0 0 10px #f2efe7;overflow:hidden}
.wo-qr i{position:absolute;left:0;right:0;height:3px;background:#2563eb;box-shadow:0 0 18px #2563eb;animation:wo-scan 4s infinite}
@keyframes wo-scan{0%{top:0}40%{top:146px}41%,100%{top:0;opacity:0}}
.wo-qr span{position:absolute;inset:0;background:#22c55e;display:grid;place-items:center;opacity:0;animation:wo-green 4s infinite}
@keyframes wo-green{0%,42%{opacity:0}46%,80%{opacity:1}90%,100%{opacity:0}}
.wo-stubs>span{position:absolute;width:150px;height:200px;border-radius:14px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.5);background:var(--k-paper)}
.wo-stubs img{display:block;width:100%;height:150px;object-fit:cover}
.wo-stubs em{display:block;padding:8px 10px;font:600 11px var(--k-mono);font-style:normal;color:#0a0a0c;border-top:2px dashed #0a0a0c;white-space:nowrap;overflow:hidden}
.wo-stubs .drop{animation:wo-drop 6s infinite both}
@keyframes wo-drop{0%,10%{transform:translateY(-260px) rotate(-8deg);opacity:0}30%,90%{transform:translateY(0) rotate(6deg);opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.wo-moments *{animation:none !important}}
.wo-day{display:flex;align-items:baseline;gap:12px;font-family:var(--font-bricolage),sans-serif;font-size:clamp(28px,3vw,40px);letter-spacing:-.03em;margin:0}
.wo-day span{font-family:var(--font-mono),monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--k-t3)}
.wo-grid{list-style:none;margin:18px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px 22px}
@media (max-width:1100px){.wo-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:760px){.wo-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 14px}}
.wo-card a{display:block;color:inherit;text-decoration:none}
.wo-poster{position:relative;display:block;aspect-ratio:4/5;border-radius:18px;overflow:hidden;background:#16161a;box-shadow:0 24px 40px -24px #000,inset 0 0 0 1px rgba(255,255,255,.06);transition:transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .45s}
.wo-card a:hover .wo-poster{transform:translateY(-6px) rotate(-.6deg);box-shadow:0 34px 50px -24px #000,0 0 0 2px var(--k-pc)}
.wo-poster img,.wo-made svg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.wo-poster::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.14),transparent 30%);pointer-events:none}
.wo-tag{position:absolute;left:10px;top:10px;height:26px;padding:0 10px;display:inline-flex;align-items:center;border-radius:13px;background:rgba(10,10,11,.6);backdrop-filter:blur(8px);font-size:12px;font-weight:700;color:#fff}
.wo-go{position:absolute;right:10px;bottom:10px;height:34px;padding:0 14px;display:inline-flex;align-items:center;border-radius:17px;background:var(--k-pc);color:#fff;font-size:13px;font-weight:700;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s}
.wo-card a:hover .wo-go,.wo-card a:focus-visible .wo-go{opacity:1;transform:none}
@media (hover:none){.wo-go{opacity:1;transform:none}}
.wo-card b{display:block;margin-top:12px;font-size:17px;font-weight:600;line-height:1.2}
.wo-line{display:block;margin-top:4px;font-size:14px;color:var(--k-tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wo-meta{display:block;margin-top:2px;font-size:13px;color:var(--k-t2)}
`;
