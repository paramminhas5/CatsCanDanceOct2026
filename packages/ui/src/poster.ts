/**
 * A real poster for a night that has no art of its own, drawn from its data: the date, the lineup set
 * big, the venue and city, in one of the CCD colours with a white cat. Pure SVG markup, so it is sharp
 * at any size, costs nothing and works in every app (inline, or as a data URI for an <img>).
 */

const INKS: { bg: string; ink: string; sub: string }[] = [
  { bg: "#2563EB", ink: "#FFFFFF", sub: "rgba(255,255,255,.72)" },
  { bg: "#B6EF36", ink: "#0A0A0B", sub: "rgba(10,10,11,.66)" },
  { bg: "#FFE600", ink: "#0A0A0B", sub: "rgba(10,10,11,.66)" },
  { bg: "#FF4D8D", ink: "#0A0A0B", sub: "rgba(10,10,11,.66)" },
  { bg: "#DC2626", ink: "#FFFFFF", sub: "rgba(255,255,255,.72)" },
  { bg: "#16161A", ink: "#F2F0EB", sub: "rgba(242,240,235,.6)" },
];

const x = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export type PosterInput = { title: string; lineup?: string[] | null; venue?: string | null; city?: string | null; date?: string | null; time?: string | null; tag?: string | null };

/** Split a name into lines that fit the poster width at a given size. */
function lines(names: string[], max: number): string[] {
  const out: string[] = [];
  for (const n of names) {
    const words = n.toUpperCase().split(/\s+/);
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > max) { if (cur) out.push(cur); cur = w; } else cur = (cur + " " + w).trim();
    }
    if (cur) out.push(cur);
  }
  return out;
}

export function posterSvg(p: PosterInput, opts: { cat?: boolean } = {}): string {
  const c = INKS[hash(p.title + (p.venue ?? "")) % INKS.length];
  const names = (p.lineup ?? []).filter(Boolean).slice(0, 4);
  const big = names.length ? names : [p.title];
  const longest = Math.max(...big.map((n) => n.length));
  const size = longest > 22 ? 40 : longest > 16 ? 50 : longest > 11 ? 62 : 78;
  const ls = lines(big, Math.max(8, Math.floor(560 / (size * 0.62)))).slice(0, 6);
  const d = p.date ? new Date(`${p.date.slice(0, 10)}T00:00:00Z`) : null;
  const day = d ? d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).toUpperCase() : "";
  const num = d ? d.toLocaleDateString("en-GB", { day: "2-digit", timeZone: "UTC" }) : "";
  const mon = d ? d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase() : "";
  const startY = 330 - ((ls.length - 1) * size * 0.95) / 2;
  const showTitle = names.length > 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${x(p.title)}">
<defs><pattern id="g" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="${c.ink}" opacity=".07"/></pattern>
<radialGradient id="l" cx="78%" cy="18%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<rect width="600" height="800" fill="${c.bg}"/><rect width="600" height="800" fill="url(#g)"/><rect width="600" height="800" fill="url(#l)"/>
<text x="40" y="76" font-family="JetBrains Mono, monospace" font-size="22" font-weight="600" letter-spacing="2" fill="${c.ink}">${x(day)}</text>
<text x="40" y="150" font-family="Bricolage Grotesque, Outfit, sans-serif" font-size="88" font-weight="800" letter-spacing="-4" fill="${c.ink}">${x(num)}</text>
<text x="168" y="150" font-family="JetBrains Mono, monospace" font-size="22" font-weight="600" letter-spacing="2" fill="${c.ink}">${x(mon)}</text>
${p.tag ? `<g transform="translate(560 64)"><rect x="-${x(p.tag).length * 13 + 28}" y="-24" width="${x(p.tag).length * 13 + 28}" height="38" rx="19" fill="${c.ink}"/><text x="-14" y="2" text-anchor="end" font-family="Outfit, sans-serif" font-size="18" font-weight="700" fill="${c.bg}">${x(p.tag)}</text></g>` : ""}
${ls.map((l, i) => `<text x="40" y="${(startY + i * size * 0.95).toFixed(0)}" font-family="Bricolage Grotesque, Outfit, sans-serif" font-size="${size}" font-weight="800" letter-spacing="-${(size * 0.04).toFixed(1)}" fill="${c.ink}">${x(l)}</text>`).join("")}
${showTitle ? `<text x="40" y="${(startY + ls.length * size * 0.95 + 18).toFixed(0)}" font-family="Outfit, sans-serif" font-size="24" font-weight="600" fill="${c.sub}">${x(p.title.length > 40 ? `${p.title.slice(0, 38)}…` : p.title)}</text>` : ""}
<line x1="40" y1="680" x2="560" y2="680" stroke="${c.ink}" stroke-opacity=".25" stroke-width="2"/>
<text x="40" y="722" font-family="Outfit, sans-serif" font-size="26" font-weight="700" fill="${c.ink}">${x(p.venue ?? "")}</text>
<text x="40" y="756" font-family="JetBrains Mono, monospace" font-size="18" font-weight="600" letter-spacing="1.5" fill="${c.sub}">${x([(p.city ?? "").toUpperCase(), p.time ? p.time.slice(0, 5) : ""].filter(Boolean).join("  ·  "))}</text>
${opts.cat !== false ? `<image href="/cats/dance.webp" x="440" y="560" width="150" height="150" opacity=".95"/>` : ""}
</svg>`;
}

/** The poster as a data URI, for an <img src>. */
export const posterUri = (p: PosterInput, opts?: { cat?: boolean }) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(posterSvg(p, { cat: false, ...opts }))}`;
