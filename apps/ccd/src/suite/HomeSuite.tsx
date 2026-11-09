/**
 * catscandance.com, built from the board W39-Home (scroll version): find a night, find your crew,
 * come to ours. The four product doors dissolve the stage (pure CSS), this week rides a pinned
 * horizontal rail, and our nights show the real Episode posters. Data from getHomeData.
 */
import { Board, boardVars, esc, h2, safeUrl } from "@ccd/ui";
import FitWidth from "@ccd/ui/FitWidth";
import { parts } from "@ccd/ui/boards/home";
import { PRODUCTS, productUrl } from "@ccd/brand";
import type { HomeData } from "@/lib/home";
import Shell from "@/suite/Shell";
import { dayLabel, city } from "@/suite/bits";

const C = PRODUCTS.ccd.colour;
const POSTER = ["#2563EB", "#B6EF36", "#FFE600", "#FF4D8D"];

export default function HomeSuite(d: HomeData) {
  const next = d.next;
  const nextBtn = next ? `<a class="ghost" href="/nights/${esc(next.slug)}" style="height: 56px; padding: 0 24px; font-size: 16px">${esc(next.title)}, ${esc(dayLabel(next.event_date ?? next.date))}</a>` : "";
  const cards = d.week.slice(0, 8).map((n, i) => {
    const bg = POSTER[i % POSTER.length];
    const ink = i % 4 === 1 || i % 4 === 2 ? "#0A0A0B" : "#FFFFFF";
    return `<a href="${safeUrl(n.ticket_url ?? n.url)}" target="_blank" rel="noopener" class="lk" style="width: 420px; flex: none"><div style="position: relative; width: 420px; height: 300px; border-radius: 20px; overflow: hidden; background: radial-gradient(90% 120% at 80% 20%, color-mix(in srgb, ${bg} 80%, #fff), ${bg} 55%, color-mix(in srgb, ${bg} 70%, #000)); color: ${ink}"><span class="d" style="position: absolute; left: 24px; bottom: 20px; right: 24px; font-size: 46px; line-height: .92; color: ${ink}">${esc(city(n.city) || n.venue || "")}</span><span class="m" style="position: absolute; left: 24px; top: 22px; color: ${ink}; opacity: .8">${esc(n.venue ?? "")}</span></div><div class="row" style="gap: 8px; margin-top: 14px"><span class="pill">${esc(dayLabel(n.event_date))}</span></div><div class="d" style="font-size: 30px; margin-top: 10px">${esc(n.title)}</div><div class="b" style="margin-top: 4px">${esc(n.artists.map((a) => a.name).join(", ") || [n.venue, city(n.city)].filter(Boolean).join(", "))}</div></a>`;
  }).join("");
  const where = d.weekCities.length === 1 ? ` in ${esc(d.weekCities[0])}` : "";
  const week = d.week.length
    ? `<section class="hx" style="padding: 150px 0 0; height: 1400px"><div style="position: sticky; top: 120px"><div style="padding: 0 64px">${h2(`This week${where}`, "Nights we would go to. Tickets and guest lists are with each night.", `<a href="/whats-on" class="lk row" style="gap: 6px; font-size: 16px; font-weight: 600">All ${d.weekCount} nights</a>`)}</div><div style="overflow: hidden; margin-top: 36px"><div class="rail row" style="gap: 24px; padding: 0 64px; align-items: flex-start; width: max-content">${cards}</div></div></div></section>`
    : "";
  const posters = d.past.filter((e) => e.poster_url).slice(0, 4);
  const ours = `<section style="padding: 150px 64px 0"><div style="display: grid; grid-template-columns: 380px 1fr; gap: 56px; align-items: end"><div class="rvl"><div class="d" style="font-size: 64px">Our nights</div><div class="b" style="font-size: 18px; margin-top: 16px">About once a month we throw our own.${next ? ` ${esc(next.title)} is ${esc(dayLabel(next.event_date ?? next.date))}${next.venue ? ` at ${esc(next.venue)}` : ""}.` : ""}</div><div style="margin-top: 26px">${next ? `<a class="key hero-key" href="/nights/${esc(next.slug)}">${d.nextHasTickets ? `${esc(next.title)} tickets` : `See ${esc(next.title)}`}</a>` : `<a class="key hero-key" href="/nights">Past Episodes</a>`}</div></div><div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px">${posters.map((e) => `<a href="/nights/${esc(e.slug)}" class="rvs" style="display: block; border-radius: 12px; overflow: hidden; aspect-ratio: 3/4"><img class="ph" src="${safeUrl(e.poster_url)}" alt="${esc(e.title)}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block"></a>`).join("")}</div></div></section>`;
  return (
    <Shell title="Cats Can Dance: find a night, find your crew, come to ours" description="The nights worth going to in India, picked by people who go out. Follow artists, throw a party, or learn to make the music.">
      <Board parts={parts} vars={boardVars(C, "#FFFFFF")} slots={{ WEEK: week, OURS: ours }}
        tokens={{ WEEKCOUNT: String(d.weekCount), NEXTBTN: nextBtn, ARTISTS: productUrl("artists"), HOST: productUrl("gate"), SCHOOL: productUrl("school") }} />
      <FitWidth />
    </Shell>
  );
}
