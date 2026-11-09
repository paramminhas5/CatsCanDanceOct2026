/**
 * What's on on the suite look (board F38-Discover): every night we would go to, by day, with a city
 * and a when filter. Filters live in the URL query and run in the browser, so the list ships in the HTML.
 */
import { useMemo } from "react";
import { useRouter } from "next/router";
import { Pill, SectionHead, Tag, Cat, ButtonLink } from "@ccd/ui";
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
              <h2 className="k-m !text-[var(--k-tx)]">{d === updated ? "Tonight" : dayLabel(d)}</h2>
              <ul className="mt-2 list-none p-0">
                {rows.map((e) => (
                  <li key={e.id}>
                    <a className="k-li" href={e.night_key ? `/nights/${e.night_key}` : e.ticket_url ?? e.url} target={e.night_key ? undefined : "_blank"} rel="noopener">
                      <span className="min-w-0 flex-1">
                        <b>{e.title}</b>
                        <small>{[e.event_time?.slice(0, 5), e.venue, city(e.city), e.presenter ? `by ${e.presenter}` : null].filter(Boolean).join(" · ")}</small>
                        {e.artists.length > 0 && <small style={{ color: "var(--k-tx)" }}>{e.artists.map((a) => a.name).join(", ")}</small>}
                      </span>
                      {e.featured && <Tag>Our pick</Tag>}
                      <span className="text-sm font-semibold" style={{ color: "var(--k-pc)" }}>{e.night_key ? "Get in" : "Tickets"}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </Shell>
  );
}
