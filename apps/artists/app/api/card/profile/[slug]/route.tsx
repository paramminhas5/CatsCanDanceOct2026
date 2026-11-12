/**
 * The artist's profile card: their eras and their records on one image, made to be shared.
 * GET /api/card/profile/<slug>?size=story|link   (story 1080x1920, link 1200x630 for previews)
 * Public data only (an approved artist's page). Covers come from Deezer; nothing is invented, and a
 * part with no data is left out. Plan ccd/v2-plan.md 5.3.
 */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getArtistPage } from "@/lib/artist-page";
import { coverUrl, type Era } from "@/lib/artist-v2";
import { isSlug } from "@/lib/db";

export const revalidate = 3600;

const fonts: Record<string, Promise<ArrayBuffer>> = {};
const font = (file: string, origin: string) => (fonts[file] ??= fetch(new URL(`/fonts/${file}`, origin)).then((r) => r.arrayBuffer()));

const TX = "#F2F0EB", T2 = "rgba(242,240,235,.62)", BG = "#0A0A0B";
const yearsOf = (e: Era) => (e.to == null ? `${e.from} to now` : e.from === e.to ? String(e.from) : `${e.from} to ${e.to}`);

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!isSlug(slug)) return new Response("Not found", { status: 404 });
  const p = await getArtistPage(slug);
  if (!p) return new Response("Not found", { status: 404 });
  const story = req.nextUrl.searchParams.get("size") !== "link";
  const origin = req.nextUrl.origin;
  const { a, counts } = p;
  const now = new Date().getUTCFullYear();
  const eras = a.eraReal ? a.eras.slice(-5) : [];
  const accent = eras.at(-1)?.accent ?? "#B6EF36";
  // One record from each era first (albums and EPs before singles), then the newest others; no repeated art.
  const want = story ? 4 : 3;
  const seen = new Set<string>();
  const pickFrom = (list: typeof a.releases) => list.filter((r) => r.albumId && !seen.has(r.albumId)).sort((x, y) => Number(["album", "ep"].includes(y.type)) - Number(["album", "ep"].includes(x.type)))[0];
  const chosen: typeof a.releases = [];
  for (const e of eras) {
    const r = pickFrom(a.releases.filter((x) => !x.undated && Math.floor(x.y) >= e.from && Math.floor(x.y) <= (e.to ?? 9999)));
    if (r) { chosen.push(r); seen.add(r.albumId!); }
  }
  for (const r of a.releases) { if (chosen.length >= want) break; if (r.albumId && !seen.has(r.albumId)) { chosen.push(r); seen.add(r.albumId); } }
  const covers = chosen.slice(-want).sort((x, y) => (x.undated ? 9999 : x.y) - (y.undated ? 9999 : y.y)).map((r) => coverUrl(r.albumId, "big")!);
  const since = a.releases.filter((r) => !r.undated).map((r) => Math.floor(r.y)).sort((x, y) => x - y)[0];
  const line = [a.city?.split(",")[0], a.genres[0], since ? `since ${since}` : null].filter(Boolean).join("  ·  ");
  const stats = [[counts.records, "records"], [counts.shows, "shows"], [counts.cities, "cities"]].filter(([n]) => Number(n) > 0) as [number, string][];
  const nameSize = (base: number) => (p.name.length > 18 ? base * 0.58 : p.name.length > 12 ? base * 0.74 : base);
  const span = eras.length ? Math.max(1, (eras.at(-1)!.to ?? now) - eras[0].from + 1) : 1;
  const [bric, mono, out6, out5] = await Promise.all([font("Bricolage-800.woff", origin), font("JetBrainsMono-600.woff", origin), font("Outfit-600.woff", origin), font("Outfit-500.woff", origin)]);
  const W = story ? 1080 : 1200, H = story ? 1920 : 630;

  const fan = (size: number, box: number) => (
    <div style={{ position: "relative", display: "flex", width: box, height: size + 40 }}>
      {covers.map((c, i) => {
        const n = covers.length;
        const step = n > 1 ? (box - size) / (n - 1) : 0;
        const rot = (i - (n - 1) / 2) * (story ? 5 : 6);
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={c} src={c} width={size} height={size} alt="" style={{ position: "absolute", left: i * step, top: 20 + Math.abs(i - (n - 1) / 2) * 14, borderRadius: 10, transform: `rotate(${rot}deg)`, boxShadow: "0 30px 60px rgba(0,0,0,.6)" }} />
        );
      })}
    </div>
  );

  const bands = (h: number, label: boolean) => (
    <div style={{ display: "flex", width: "100%", height: h, borderRadius: h / 2, overflow: "hidden" }}>
      {eras.map((e) => (
        <div key={e.id} style={{ display: "flex", alignItems: "center", paddingLeft: label ? 18 : 0, flexGrow: Math.max(1, (e.to ?? now) - e.from + 1) / span, flexBasis: 0, background: e.accent, color: BG, fontFamily: "Outfit", fontSize: 22, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap" }}>
          {label && Math.max(1, (e.to ?? now) - e.from + 1) / span >= 0.24 ? e.label : null}
        </div>
      ))}
    </div>
  );

  const body = story ? (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: BG, color: TX, padding: "84px 80px 80px", fontFamily: "Outfit", backgroundImage: `radial-gradient(90% 45% at 70% 8%, ${accent}55, transparent 70%)` }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Mono", fontSize: 24, letterSpacing: 3, color: T2 }}>
        <span>ARTISTS · CATS CAN DANCE</span><span>{eras.length ? `${eras.length} ERAS` : ""}</span>
      </div>
      <div style={{ display: "flex", fontFamily: "Bric", fontSize: nameSize(150), lineHeight: 0.92, letterSpacing: -6, marginTop: 70 }}>{p.name}</div>
      {line && <div style={{ display: "flex", fontSize: 36, color: T2, marginTop: 22 }}>{line}</div>}
      {covers.length > 0 && <div style={{ display: "flex", marginTop: 70 }}>{fan(450, 920)}</div>}
      <div style={{ flex: 1, display: "flex" }} />
      {eras.length > 1 ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Mono", fontSize: 22, letterSpacing: 3, color: T2, marginBottom: 18 }}>THE ERAS</div>
          {eras.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 22, padding: "16px 0", borderTop: "2px solid rgba(255,255,255,.08)" }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: e.accent, display: "flex" }} />
              <div style={{ display: "flex", flex: 1, fontSize: 40, fontWeight: 600 }}>{e.label}</div>
              <div style={{ display: "flex", fontFamily: "Mono", fontSize: 24, color: T2 }}>{yearsOf(e)}</div>
            </div>
          ))}
          <div style={{ display: "flex", marginTop: 18 }}>{bands(16, false)}</div>
        </div>
      ) : null}
      {stats.length > 0 && (
        <div style={{ display: "flex", gap: 56, marginTop: 52 }}>
          {stats.map(([n, l]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: "Bric", fontSize: 88, letterSpacing: -3, lineHeight: 1 }}>{n}</span>
              <span style={{ fontSize: 28, color: T2 }}>{l}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 56, paddingTop: 30, borderTop: "2px solid rgba(255,255,255,.12)" }}>
        <span style={{ fontSize: 30, fontWeight: 600 }}>Listen, follow, book</span>
        <span style={{ fontFamily: "Mono", fontSize: 24, color: accent }}>artists.catscandance.com/{slug}</span>
      </div>
    </div>
  ) : (
    <div style={{ width: W, height: H, display: "flex", background: BG, color: TX, padding: 56, fontFamily: "Outfit", backgroundImage: `radial-gradient(70% 90% at 85% 10%, ${accent}50, transparent 70%)` }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 30 }}>
        <span style={{ fontFamily: "Mono", fontSize: 18, letterSpacing: 3, color: T2 }}>ARTISTS · CATS CAN DANCE</span>
        <div style={{ display: "flex", fontFamily: "Bric", fontSize: nameSize(96), lineHeight: 0.92, letterSpacing: -4, marginTop: 34 }}>{p.name}</div>
        {line && <div style={{ display: "flex", fontSize: 26, color: T2, marginTop: 14 }}>{line}</div>}
        <div style={{ flex: 1, display: "flex" }} />
        {eras.length > 1 && <div style={{ display: "flex", marginBottom: 26 }}>{bands(40, true)}</div>}
        {stats.length > 0 && (
          <div style={{ display: "flex", gap: 40 }}>
            {stats.map(([n, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: "Bric", fontSize: 54, letterSpacing: -2 }}>{n}</span><span style={{ fontSize: 22, color: T2 }}>{l}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {covers.length > 0 && <div style={{ display: "flex", alignItems: "center" }}>{fan(300, 440)}</div>}
    </div>
  );

  return new ImageResponse(body, {
    width: W,
    height: H,
    fonts: [
      { name: "Bric", data: bric, weight: 800, style: "normal" },
      { name: "Mono", data: mono, weight: 600, style: "normal" },
      { name: "Outfit", data: out6, weight: 600, style: "normal" },
      { name: "Outfit", data: out5, weight: 500, style: "normal" },
    ],
    headers: { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
