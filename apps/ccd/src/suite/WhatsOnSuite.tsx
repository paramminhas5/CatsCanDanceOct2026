/**
 * What's on v3.1 (canvas board WhatsOn v2; Param, 10 Nov 2026: "the filters can be better, tonight, this week,
 * city filters, and the layout as well, the posters could be smaller"). A sticky filter bar (when, city, search,
 * posters or list), nights grouped by day with the date pinned on the left, small posters, and the three
 * moments of going out at the end. When and city live in the URL; the list ships in the HTML.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Cat, ButtonLink, posterSvg } from "@ccd/ui";
import type { FindProps } from "@/pages/Discover";
import Shell from "@/suite/Shell";
import { city } from "@/suite/bits";

const WHEN = [["tonight", "Tonight"], ["weekend", "This weekend"], ["week", "This week"], ["all", "Everything"]] as const;
type When = (typeof WHEN)[number][0];
const add = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const HEAD: Record<When, string> = { tonight: "Tonight.", weekend: "This weekend.", week: "This week.", all: "Everything on." };

export default function WhatsOnSuite({ events, ours, updated }: FindProps) {
  const router = useRouter();
  const { query } = router;
  const when = (typeof query.when === "string" && WHEN.some(([k]) => k === query.when) ? query.when : "week") as When;
  const want = typeof query.city === "string" ? query.city : "";
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  // The filter bar sticks just under the suite nav, whatever height the nav is at this width.
  useEffect(() => {
    const fit = () => {
      const nav = document.querySelector(".k-nav") as HTMLElement | null;
      const bar = document.querySelector(".wo-bar") as HTMLElement | null;
      const h = nav?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--wo-top", `${h}px`);
      document.documentElement.style.setProperty("--wo-bar", `${bar?.offsetHeight ?? 0}px`);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const inWhen = (w: When, d: string) => {
    if (w === "tonight") return d === updated;
    if (w === "week") return d >= updated && d <= add(updated, 7);
    if (w === "weekend") { const dow = new Date(`${d}T00:00:00Z`).getUTCDay(); return d >= updated && d <= add(updated, 7) && (dow === 5 || dow === 6 || dow === 0); }
    return true;
  };
  const needle = q.trim().toLowerCase();
  const matches = (e: (typeof events)[number]) => !needle || [e.title, e.venue, ...(e.lineup ?? []), ...e.artists.map((x) => x.name), e.presenter].filter(Boolean).join(" ").toLowerCase().includes(needle);
  const cities = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of events) { const k = city(e.city); if (k) c.set(k, (c.get(k) ?? 0) + 1); }
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  }, [events]);
  const count = (w: When, c: string) => events.filter((e) => inWhen(w, e.event_date ?? "") && (!c || city(e.city) === c) && matches(e)).length;
  const list = events.filter((e) => inWhen(when, e.event_date ?? "") && (!want || city(e.city) === want) && matches(e));
  const byDay = new Map<string, typeof list>();
  for (const e of list) { const k = e.event_date ?? "later"; byDay.set(k, [...(byDay.get(k) ?? []), e]); }
  const go = (o: { when?: string; city?: string }) => {
    const next = { when, city: want, ...o };
    const p = new URLSearchParams(Object.entries(next).filter(([k, v]) => v && !(k === "when" && v === "week")) as [string, string][]);
    void router.replace(`/whats-on${p.size ? `?${p}` : ""}`, undefined, { shallow: true, scroll: false });
  };
  return (
    <Shell title="What's on: the nights worth going to | Cats Can Dance" description="Every night worth going to this week, by day. Tickets, guest lists and crews with each night.">
      <style dangerouslySetInnerHTML={{ __html: WO_CSS }} />
      <div className="wo-bar">
        <div className="k-wrap wo-bar-in">
          <div className="wo-seg" role="group" aria-label="When">
            {WHEN.map(([k, l]) => <button key={k} type="button" aria-pressed={k === when} onClick={() => go({ when: k })}>{l}<em>{count(k, want)}</em></button>)}
          </div>
          <div className="wo-chips" role="group" aria-label="City">
            <button type="button" aria-pressed={!want} onClick={() => go({ city: "" })}>Every city<em>{count(when, "")}</em></button>
            {cities.map((c) => <button key={c} type="button" aria-pressed={want === c} onClick={() => go({ city: c })}>{c}<em>{count(when, c)}</em></button>)}
          </div>
          <div className="wo-tools">
            <label className="wo-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg><span className="sr-only">Search</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Artist, venue, promoter" /></label>
            <div className="wo-view" role="group" aria-label="View">
              <button type="button" aria-pressed={view === "grid"} aria-label="Posters" onClick={() => setView("grid")}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="10" rx="2" /><rect x="13" y="3" width="8" height="10" rx="2" /><rect x="3" y="15" width="8" height="6" rx="2" /><rect x="13" y="15" width="8" height="6" rx="2" /></svg></button>
              <button type="button" aria-pressed={view === "list"} aria-label="List" onClick={() => setView("list")}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            </div>
          </div>
        </div>
      </div>
      <section className="k-wrap wo-hero">
        <div><span className="wo-eye">{want || "India"} · {list.length} {list.length === 1 ? "night" : "nights"}</span><h1>{HEAD[when]}</h1></div>
        <div className="wo-hero-r">
          <p>Every night here has someone you can trust behind it. Tap a poster to get in, or grab a crew and go together.</p>
          {ours && <ButtonLink variant="key" size="s" href={`/nights/${ours.slug}`}>Ours: {ours.title}</ButtonLink>}
        </div>
      </section>
      <section className="k-wrap wo-days-list">
        {list.length === 0 ? (
          <div className="wo-empty"><Cat name="dance" height={84} /><div><b>{when === "tonight" ? "Nothing tonight we would send you to." : "Nothing here for that."}</b><p>{when !== "week" ? <button type="button" className="wo-link" onClick={() => go({ when: "week" })}>See this week</button> : <button type="button" className="wo-link" onClick={() => { setQ(""); go({ city: "" }); }}>Clear the filters</button>}</p></div></div>
        ) : (
          [...byDay.entries()].map(([d, rows]) => {
            const dt = new Date(`${d}T00:00:00Z`);
            return (
              <div key={d} id={`d-${d}`} className="wo-day">
                <div className="wo-dcol"><span>{d === updated ? "Tonight" : d === "later" ? "Later" : dt.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" })}</span><b>{d === "later" ? "·" : dt.getUTCDate()}</b><em>{rows.length} {rows.length === 1 ? "night" : "nights"}</em></div>
                <ul className={view === "grid" ? "wo-grid" : "wo-list"}>
                  {rows.map((e) => {
                    const lineup = (e.lineup ?? []).filter(Boolean);
                    const names = lineup.length ? lineup : e.artists.map((x) => x.name);
                    const href = e.night_key ? `/nights/${e.night_key}` : e.ticket_url ?? e.url;
                    const art = e.image_url ? <img src={e.image_url} alt="" loading="lazy" /> : <span className="wo-made" dangerouslySetInnerHTML={{ __html: posterSvg({ title: e.title, lineup: names, venue: e.venue, city: city(e.city), date: e.event_date, time: e.event_time }) }} />;
                    const meta = [e.event_time?.slice(0, 5), e.venue].filter(Boolean).join(" · ");
                    return (
                      <li key={e.id}>
                        <a href={href} target={e.night_key ? undefined : "_blank"} rel="noopener" className="wo-card">
                          <span className="wo-poster">{art}{(e.featured || e.presenter) && <span className="wo-tag">{e.presenter ? `By ${e.presenter}` : "Our pick"}</span>}{view === "grid" && <span className="wo-go">Get in</span>}</span>
                          <span className="wo-txt"><b>{e.title}</b><span className="wo-meta">{meta}{view === "list" && city(e.city) ? ` · ${city(e.city)}` : ""}</span>{view === "list" && names.length > 0 && <span className="wo-line">{names.slice(0, 5).join(", ")}</span>}</span>
                          {view === "list" && <span className="wo-go2">Get in</span>}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </section>
      <section className="k-wrap wo-moments" aria-label="Going out with Cats Can Dance">
        <h2>The bit after you tap Get in.</h2>
        <div className="wo-mgrid">
          <div className="wo-m">
            <div className="wo-crewbox" aria-hidden="true">
              <div className="wo-crew">
                <div className="wo-crew-top"><span>Your crew</span><span className="wo-ex">Example</span></div>
                <div className="wo-faces"><i style={{ background: "#2563eb", color: "#fff" }}>You</i><i style={{ background: "#b6ef36", animationDelay: ".3s" }}>AK</i><i style={{ background: "#ffe600", animationDelay: ".6s" }}>RS</i><i style={{ background: "#ff4d8d", animationDelay: ".9s" }}>PM</i><i style={{ background: "#0a0a0c", color: "#f2efe7", animationDelay: "1.2s" }}>+1</i></div>
                <b>Meet 9:15 pm · a cafe near the venue</b>
                <span>Matched on: house, dancing early, no VIP</span>
              </div>
            </div>
            <b>Going solo? Not for long.</b>
            <span>Tap “I'm going alone” and we put you in a crew of 3 to 6 going to the same night. You meet first and walk in together.</span>
          </div>
          <div className="wo-m">
            <div className="wo-door" aria-hidden="true"><div className="wo-qr"><i /><span><svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#0a0a0c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></span></div></div>
            <b>Green and you're in.</b>
            <span>One code for every ticket, even the one you bought on District. It scans in a basement with no signal.</span>
          </div>
          <div className="wo-m">
            <div className="wo-stubs" aria-hidden="true">
              {events.filter((e) => e.image_url).slice(0, 3).map((e, i) => (
                <span key={e.id} className={i === 2 ? "drop" : undefined} style={{ left: `${6 + i * 24}%`, top: i === 2 ? 6 : 30 - i * 12, transform: i === 2 ? undefined : `rotate(${i ? -2 : -10}deg)` }}>
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
.wo-bar{position:sticky;top:var(--wo-top,0px);z-index:30;background:rgba(10,10,11,.92);backdrop-filter:blur(16px);border-top:1px solid var(--k-hair);border-bottom:1px solid var(--k-hair)}
.wo-bar-in{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding-top:10px;padding-bottom:10px}
.wo-seg{display:flex;gap:4px;padding:5px;border-radius:999px;background:var(--k-raised);overflow-x:auto;scrollbar-width:none;max-width:100%}
.wo-seg button,.wo-chips button{appearance:none;border:0;cursor:pointer;display:flex;align-items:center;gap:8px;white-space:nowrap;font:700 15px var(--k-ui);transition:background .2s,color .2s}
.wo-seg button{min-height:44px;padding:0 16px;border-radius:999px;background:transparent;color:var(--k-t2)}
.wo-seg button em,.wo-chips button em{font-style:normal;font:600 11px var(--k-mono);padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.08)}
.wo-seg button[aria-pressed=true]{background:#2563eb;color:#fff}.wo-seg button[aria-pressed=true] em{background:rgba(255,255,255,.2)}
.wo-chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;max-width:100%}
.wo-chips button{min-height:40px;padding:0 14px;border-radius:999px;background:transparent;color:var(--k-t2);box-shadow:inset 0 0 0 1px var(--k-hair2);font-size:14px;font-weight:600}
.wo-chips button[aria-pressed=true]{background:var(--k-paper);color:var(--k-ink);box-shadow:none}.wo-chips button[aria-pressed=true] em{background:rgba(0,0,0,.1)}
.wo-tools{margin-left:auto;display:flex;gap:10px;align-items:center}
@media (max-width:900px){.wo-tools{margin-left:0;width:100%}.wo-search{flex:1}.wo-search input{width:100% !important}}
.wo-search{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:999px;background:var(--k-raised);color:var(--k-t3)}
.wo-search input{background:transparent;border:0;outline:none;color:var(--k-tx);font:500 14px var(--k-ui);width:190px}
.wo-view{display:flex;padding:3px;border-radius:14px;background:var(--k-raised)}
.wo-view button{appearance:none;border:0;cursor:pointer;width:44px;height:40px;border-radius:12px;background:transparent;color:var(--k-t3);display:grid;place-items:center}
.wo-view button[aria-pressed=true]{background:#1f1f24;color:var(--k-tx)}
.wo-hero{display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:16px 32px;padding-top:44px;padding-bottom:12px}
.wo-eye{font:500 12px var(--k-mono);letter-spacing:.08em;text-transform:uppercase;color:#2563eb}
.wo-hero h1{margin:10px 0 0;font-family:var(--k-display);font-weight:800;font-size:clamp(56px,8vw,96px);letter-spacing:-.03em;line-height:.9}
.wo-hero-r{display:flex;flex-direction:column;gap:12px;align-items:flex-start;max-width:44ch}
.wo-hero-r p{margin:0;color:var(--k-t2);font-size:17px;line-height:1.5}
.wo-days-list{display:flex;flex-direction:column;gap:30px;padding-top:12px;padding-bottom:40px}
.wo-day{display:grid;grid-template-columns:140px minmax(0,1fr);gap:24px;padding-top:22px;border-top:1px solid var(--k-hair);scroll-margin-top:calc(var(--wo-top,0px) + var(--wo-bar,0px) + 10px)}
.wo-dcol{position:sticky;top:calc(var(--wo-top,0px) + var(--wo-bar,0px) + 20px);align-self:start;display:flex;flex-direction:column;gap:2px}
.wo-dcol span{font:500 11px var(--k-mono);letter-spacing:.08em;text-transform:uppercase;color:#2563eb}
.wo-dcol b{font-family:var(--k-display);font-weight:800;font-size:64px;line-height:1;letter-spacing:-.03em}
.wo-dcol em{font-style:normal;font:500 11px var(--k-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--k-t3)}
@media (max-width:900px){.wo-day{grid-template-columns:1fr;gap:12px}.wo-dcol{position:static;flex-direction:row;align-items:baseline;gap:10px}.wo-dcol b{font-size:40px}}
.wo-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:18px 14px}
@media (max-width:1200px){.wo-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:700px){.wo-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.wo-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.wo-card{display:flex;flex-direction:column;gap:8px;color:inherit;text-decoration:none;animation:wo-in .4s var(--k-ease) both}
@keyframes wo-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.wo-poster{position:relative;display:block;aspect-ratio:4/5;border-radius:14px;overflow:hidden;background:#16161a}
.wo-poster img,.wo-made svg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:transform .45s var(--k-ease)}
.wo-card:hover .wo-poster img{transform:scale(1.06)}
.wo-tag{position:absolute;left:8px;top:8px;padding:5px 9px;border-radius:999px;background:rgba(10,10,11,.72);font:600 10px var(--k-mono);letter-spacing:.06em;text-transform:uppercase;color:#fff}
.wo-go{position:absolute;right:8px;bottom:8px;padding:7px 11px;border-radius:999px;background:#2563eb;color:#fff;font:700 12px var(--k-ui);opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s}
.wo-card:hover .wo-go,.wo-card:focus-visible .wo-go{opacity:1;transform:none}
@media (hover:none){.wo-go{opacity:1;transform:none}}
.wo-txt{display:flex;flex-direction:column;gap:3px;min-width:0}
.wo-txt b{font-size:14px;line-height:1.25}
.wo-meta{font-size:12px;color:var(--k-t3)}
.wo-line{font-size:13px;color:var(--k-t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wo-list .wo-card{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:16px;align-items:center;padding:10px;border-radius:16px}
.wo-list .wo-card:hover{background:var(--k-raised)}
.wo-list .wo-poster{width:64px;height:80px;aspect-ratio:auto;border-radius:10px}
.wo-list .wo-tag{display:none}
.wo-list .wo-txt b{font-size:17px}.wo-list .wo-meta{font-size:14px}
.wo-go2{padding:9px 14px;border-radius:999px;background:#2563eb;color:#fff;font:700 13px var(--k-ui)}
.wo-empty{display:flex;gap:20px;align-items:center;padding:24px;border-radius:22px;background:var(--k-raised)}
.wo-empty b{font-family:var(--k-display);font-size:28px;font-weight:800}
.wo-empty p{margin:8px 0 0}
.wo-link{appearance:none;border:0;cursor:pointer;background:none;color:var(--k-tx);font:600 15px var(--k-ui);text-decoration:underline;min-height:44px;padding:0}
.wo-moments{padding-top:80px;padding-bottom:40px}
.wo-moments h2{margin:0 0 28px;font-family:var(--k-display);font-weight:800;font-size:clamp(36px,4.4vw,56px);letter-spacing:-.025em;line-height:.95}
.wo-mgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media (max-width:900px){.wo-mgrid{grid-template-columns:1fr}}
.wo-m{position:relative;display:flex;flex-direction:column;gap:8px;padding:28px;border-radius:28px;background:var(--k-raised);overflow:hidden}
.wo-m>b{font-family:var(--k-display);font-size:30px;font-weight:800;letter-spacing:-.02em}
.wo-m>span{color:var(--k-t2);line-height:1.45}
.wo-crewbox,.wo-door,.wo-stubs{position:relative;height:230px;margin-bottom:12px}
.wo-crewbox{display:grid;place-items:center}
.wo-crew{width:min(270px,100%);border-radius:20px;background:var(--k-paper);color:var(--k-ink);padding:16px;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 40px rgba(0,0,0,.4);transform:rotate(-2deg)}
.wo-crew-top{display:flex;justify-content:space-between;font:600 11px var(--k-mono);letter-spacing:.08em;text-transform:uppercase}
.wo-ex{color:#b36b00}
.wo-faces{display:flex}
.wo-faces i{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font:700 14px var(--k-ui);font-style:normal;color:#0a0a0c;box-shadow:0 0 0 3px var(--k-paper);animation:wo-join 4s infinite both}
.wo-faces i+i{margin-left:-10px}
@keyframes wo-join{0%{transform:scale(0)}12%,100%{transform:scale(1)}}
.wo-crew b{font-size:15px}.wo-crew>span{font-size:13px;opacity:.7}
.wo-door{display:grid;place-items:center}
.wo-qr{position:relative;width:150px;height:150px;border-radius:18px;background:repeating-conic-gradient(#0a0a0c 0 25%,#f2efe7 0 50%) 0 0/30px 30px;box-shadow:0 0 0 10px #f2efe7;overflow:hidden}
.wo-qr i{position:absolute;left:0;right:0;height:3px;background:#2563eb;box-shadow:0 0 18px #2563eb;animation:wo-scan 4s infinite}
@keyframes wo-scan{0%{top:0}40%{top:146px}41%,100%{top:0;opacity:0}}
.wo-qr span{position:absolute;inset:0;background:#22c55e;display:grid;place-items:center;opacity:0;animation:wo-green 4s infinite}
@keyframes wo-green{0%,42%{opacity:0}46%,80%{opacity:1}90%,100%{opacity:0}}
.wo-stubs>span{position:absolute;width:140px;border-radius:12px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.5);background:var(--k-paper)}
.wo-stubs img{display:block;width:100%;height:130px;object-fit:cover}
.wo-stubs em{display:block;padding:8px 10px;font:600 10px var(--k-mono);font-style:normal;color:#0a0a0c;border-top:2px dashed #0a0a0c;white-space:nowrap;overflow:hidden}
.wo-stubs .drop{animation:wo-drop 6s infinite both}
@keyframes wo-drop{0%,10%{transform:translateY(-240px) rotate(-8deg);opacity:0}30%,90%{transform:translateY(0) rotate(6deg);opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.wo-moments *,.wo-card{animation:none !important}}
`;
