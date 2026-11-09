/**
 * What's on on the suite look (board F38-Discover): every night we would go to, by day, with a city
 * and a when filter. Filters live in the URL query and run in the browser, so the list ships in the HTML.
 */
import { useMemo } from "react";
import { useRouter } from "next/router";
import { Pill, SectionHead, Cat, ButtonLink, posterSvg } from "@ccd/ui";
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
        <SectionHead title="What's on" sub={`${events.length} nights we would go to. Picked by people who go out.`} right={ours ? <ButtonLink variant="key" size="s" href={`/nights/${ours.slug}`}>Our next: {ours.title}</ButtonLink> : undefined} />
        <div className="mt-6 flex flex-wrap gap-2">{WHEN.map(([k, l]) => <Pill key={k} href={href({ when: k })} on={k === when}>{l}</Pill>)}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill href={href({ city: "" })} on={!want}>Every city</Pill>
          {cities.map((c) => <Pill key={c} href={href({ city: c })} on={want === c}>{c}</Pill>)}
        </div>
      </section>
      <section className="k-wrap pt-8">
        {list.length === 0 ? (
          <div className="k-surface grid justify-items-start gap-3 rounded-[22px] p-6"><Cat name="dance" height={80} /><b className="text-[18px]">Nothing we would go to{want ? ` in ${want}` : ""} for that.</b><a className="k-btn k-btn--ghost" href="/whats-on">See everything</a></div>
        ) : (
          [...byDay.entries()].map(([d, rows]) => (
            <div key={d} className="mt-10 first:mt-0">
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
    </Shell>
  );
}

const WO_CSS = `
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
