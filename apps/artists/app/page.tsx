/**
 * The Artists front page, built from the board W39-Artists (scroll version). The switch at the top
 * dissolves the stage and every section between fans and artists (pure CSS, no JavaScript); ?side=artists
 * opens on the artist side. The artist grid, playing soon and new music are real data.
 */
import { Board, boardVars, esc, h2, safeUrl, keyLink } from "@ccd/ui";
import FitWidth from "@ccd/ui/FitWidth";
import { parts } from "@ccd/ui/boards/artists";
import { PRODUCTS, productUrl } from "@ccd/brand";
import { coverUrl } from "@/lib/artist-v2";
import { getFront } from "@/lib/front";
import { dayParts } from "@/lib/artist-page";

export const revalidate = 300;

const C = PRODUCTS.artists.colour;
const play = `<span style="position: absolute; right: 14px; bottom: 14px; width: 52px; height: 52px; border-radius: 26px; background: ${C}; color: #0A0A0B; display: flex; align-items: center; justify-content: center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>`;
const photo = (src: string | null, h: number) =>
  src ? `<img class="ph" src="${safeUrl(src)}" alt="" loading="lazy" style="width: 100%; height: ${h}px; border-radius: 0px; object-fit: cover; display: block">`
      : `<div style="width: 100%; height: ${h}px; display: grid; place-items: center; background: #16161A"><img src="/cats/lime.webp" alt="" style="height: 110px; opacity: .55"></div>`;

export default async function Front({ searchParams }: { searchParams: Promise<{ side?: string }> }) {
  const sp = await searchParams;
  const artistSide = sp.side === "artists";
  const f = await getFront();
  const pills = ["Everyone", "DJs", "Live acts", "VJs", "Photographers"]
    .map((t, i) => `<a class="pill lg ${i === 0 ? "on" : ""}" href="/artists${i ? `?act=${["", "dj", "live", "vj", "photo"][i]}` : ""}">${t}</a>`).join("");
  const grid =
    `<section style="padding: 130px 64px 0">${h2("All artists", "DJs, live acts, VJs and photographers. Follow them to hear about new music and dates.", keyLink("/artists", `See all ${f.count}`))}` +
    `<div class="row" style="gap: 8px; margin-top: 26px">${pills}</div>` +
    `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-top: 28px">` +
    f.start.map((a) => `<a href="/${esc(a.slug)}" class="lk rvs"><div style="border-radius: 18px; overflow: hidden">${photo(a.photo, 300)}</div><div style="font-size: 17px; font-weight: 600; margin-top: 12px">${esc(a.name)}</div><div class="b" style="font-size: 14px">${esc(a.line)}</div></a>`).join("") +
    `</div></section>`;
  const near = f.nights.length
    ? `<section style="padding: 130px 64px 0">${h2("Playing near you", "Artists from here on nights coming up. Follow them and you hear first.")}<div style="margin-top: 28px">` +
      f.nights.map((n) => {
        const d = dayParts(n.day);
        return `<a href="${safeUrl(n.url)}" target="_blank" rel="noopener" class="rw rv" style="padding: 18px 0; display: grid; grid-template-columns: 140px 1fr 1fr 180px; gap: 24px"><span class="m" style="color: var(--tx); font-size: 13px">${esc(d.day.toUpperCase())}</span><span style="font-size: 20px; font-weight: 600">${n.artists.map((a) => esc(a.name)).join(", ")}</span><span class="b">${esc([n.venue, n.city].filter(Boolean).join(", "))}</span><span style="text-align: right; font-size: 15px; font-weight: 600">Tickets</span></a>`;
      }).join("") + `<div class="hl"></div></div></section>`
    : "";
  const music = f.releases.length
    ? `<section id="music" style="padding: 130px 64px 0; scroll-margin-top: 140px">${h2("New music", "Play it here, buy it from the artist.")}<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-top: 28px">` +
      f.releases.map((r) => `<a href="/${esc(r.slug)}/music" class="lk rvs"><div style="position: relative"><div class="cover" style="width: 100%; aspect-ratio: 1; border-radius: 16px; overflow: hidden; position: relative">${r.albumId ? `<img class="ph" src="${safeUrl(coverUrl(r.albumId, "big"))}" alt="" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block">` : ""}</div>${play}</div><div style="font-size: 16px; font-weight: 600; margin-top: 12px">${esc(r.title)}</div><div class="b" style="font-size: 14px">${esc(r.artist)}, ${esc(r.type)}</div></a>`).join("") +
      `</div></section>`
    : "";
  // The app's own links, one row per side. It sits inside the board so the same switch changes it.
  const row = (items: [string, string][], cta: [string, string]) =>
    `<div class="af-row">${items.map(([h, l]) => `<a href="${h}">${l}</a>`).join("")}<span style="flex: 1"></span><a class="af-cta" href="${cta[0]}">${cta[1]}</a></div>`;
  const subnav =
    `<nav class="af-sub" aria-label="Artists">` +
    `<div class="mode mode-fan">${row([["/artists", "All artists"], ["/artists?mode=book", "Book an artist"], ["/tour", "On tour"], ["/following", "Following"], ["#music", "New music"]], ["/artists?mode=book", "Book an artist"])}</div>` +
    `<div class="mode mode-art">${row([["/claim", "Claim your page"], ["/me", "Your page"], ["/bookings", "Bookings"], ["/me/tour", "Post a tour"], ["/me/fans", "Your fans"]], ["/claim", "Claim your page"])}</div>` +
    `</nav>`;
  const before = (
    <>
      <style>{`.swr{position:absolute;opacity:0;pointer-events:none}#m-fan:checked~.v4 .mode-fan,#m-art:checked~.v4 .mode-art{display:block;animation:s-in .6s ease both}#m-fan:checked~.v4 .lb-fan,#m-art:checked~.v4 .lb-art{background:#F2F0EB;color:#0A0A0B}.v4 .seg2 label{cursor:pointer}.v4 .af-sub{position:sticky;top:64px;z-index:40;background:rgba(10,10,11,.86);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.08)}.v4 .af-row{display:flex;align-items:center;gap:26px;height:56px;padding:0 64px;font-size:15px;font-weight:600}.v4 .af-row a{color:rgba(242,240,235,.72);text-decoration:none}.v4 .af-row a:hover{color:#F2F0EB}.v4 .af-row .af-cta{height:38px;padding:0 16px;border-radius:19px;display:inline-flex;align-items:center;background:#B6EF36;color:#0A0A0B}`}</style>
      <input className="swr" type="radio" name="mode" id="m-fan" defaultChecked={!artistSide} aria-label="For fans and promoters" />
      <input className="swr" type="radio" name="mode" id="m-art" defaultChecked={artistSide} aria-label="For artists" />
    </>
  );
  return (
    <>
      <Board parts={[subnav, ...parts]} vars={boardVars(C)} before={before} slots={{ GRID: grid, NEAR: near, MUSIC: music }} tokens={{ COUNT: String(f.count), NIGHTS: productUrl("ccd") }} />
      <FitWidth />
    </>
  );
}
