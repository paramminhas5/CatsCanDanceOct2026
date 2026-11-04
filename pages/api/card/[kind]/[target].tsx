/**
 * Share cards. GET /api/card/<kind>/<target>?size=story|link
 *   going    <scene night id | ccd slug>   "I'm going" with the night
 *   night    same data, no "I'm going" (link previews for the night page)
 *   artist   <artist slug>                 "Plays next" with their next gig, or the page card when none
 *   tour     <artist slug>                 "On tour" with upcoming dates
 *   episode  <ccd slug>                    "I was there" (past) or the Episode card (upcoming)
 *   booked   <artist slug>?date=YYYY-MM-DD&city=   "Booked." No names or money, so no key needed.
 * Public data only (published nights, approved artists, CCD events) through the anon key. Edge runtime.
 */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const config = { runtime: "edge" };

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SITE = "catscandance.com";
const C = { cream: "#e8e4dc", ink: "#0b0e1a", red: "#dc2626", acid: "#b6ef36", blue: "#2563eb" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fontCache: Record<string, Promise<ArrayBuffer>> = {};
const font = (name: string, req: NextRequest) =>
  (fontCache[name] ??= fetch(new URL(`/fonts/${name}`, req.nextUrl.origin)).then((r) => r.arrayBuffer()));

async function sb<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch { return null; }
}
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch { return null; }
}

const dateBits = (iso: string | null) => {
  if (!iso) return { day: "", num: "", mon: "", long: "" };
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return { day: DAY[d.getUTCDay()], num: String(d.getUTCDate()), mon: MON[d.getUTCMonth()], long: `${DAY[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}` };
};
/** Artist photos are webp, which the card renderer can't read. The site's image optimiser returns JPEG
 *  when the request does not accept webp, so photos go through it and are inlined as data URIs. */
async function jpeg(src: string | null, origin: string, w = 640): Promise<string | null> {
  if (!src || !/^https?:\/\//.test(src)) return null;
  try {
    const r = await fetch(`${origin}/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=80`, { headers: { Accept: "image/jpeg,image/png;q=0.9" } });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") ?? "image/jpeg";
    if (!/jpe?g|png/.test(type)) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:${type};base64,${btoa(bin)}`;
  } catch { return null; }
}
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const esc = (s: string | null | undefined, n = 60) => (s ?? "").slice(0, n);

type Night = { title: string; venue: string | null; city: string | null; date: string | null; path: string };
type Artist = { slug: string; name: string; photo_url: string | null; based_city: string | null; from_city: string | null; genres: string[] | null };

async function night(target: string): Promise<Night | null> {
  if (isUuid(target)) {
    const r = await sb<any[]>(`scraped_events?select=title,venue,city,event_date&status=eq.published&id=eq.${target}&limit=1`);
    const e = r?.[0];
    return e ? { title: e.title, venue: e.venue, city: e.city, date: e.event_date, path: `/whats-on?n=${target}` } : null;
  }
  const r = await sb<any[]>(`events?select=title,venue,city,event_date,episode_no&slug=eq.${encodeURIComponent(target)}&limit=1`);
  const e = r?.[0];
  return e ? { title: e.episode_no ? `Episode ${e.episode_no}` : e.title, venue: e.venue, city: e.city, date: e.event_date, path: `/nights/${target}` } : null;
}
const artist = async (slug: string) => (await sb<Artist[]>(`artists?select=slug,name,photo_url,based_city,from_city,genres&status=eq.approved&slug=eq.${encodeURIComponent(slug)}&limit=1`))?.[0] ?? null;

/* ---- layout pieces (satori: flex only, explicit display on every multi-child box) ---- */
const Row = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => <div style={{ display: "flex", flexDirection: "row", alignItems: "center", ...style }}>{children}</div>;
const Col = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => <div style={{ display: "flex", flexDirection: "column", ...style }}>{children}</div>;

function Frame({ story, bg, fg, kids, label, url, children }: { story: boolean; bg: string; fg: string; kids?: React.ReactNode; label: string; url: string; children: React.ReactNode }) {
  const pad = story ? 64 : 48;
  return (
    <Col style={{ width: "100%", height: "100%", background: bg, color: fg, fontFamily: "Grotesk", position: "relative", padding: pad, justifyContent: "space-between" }}>
      <Row style={{ justifyContent: "space-between", fontFamily: "Bowlby", fontSize: story ? 26 : 22, letterSpacing: 4, textTransform: "uppercase" }}>
        <span>Cats Can Dance</span><span>{label}</span>
      </Row>
      {children}
      <Row style={{ justifyContent: "space-between", borderTop: `6px solid ${fg}`, paddingTop: 22, fontSize: story ? 30 : 24, fontWeight: 700 }}>
        <span>{SITE}{url}</span>{kids}
      </Row>
    </Col>
  );
}
const DateBox = ({ d, size, fg, bg }: { d: ReturnType<typeof dateBits>; size: number; fg: string; bg: string }) => (
  <Col style={{ width: size, border: `6px solid ${fg}`, background: bg, color: fg, alignItems: "center", padding: `${size * 0.1}px 0`, flexShrink: 0 }}>
    <span style={{ fontSize: size * 0.17, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3 }}>{d.day}</span>
    <span style={{ fontFamily: "Bowlby", fontSize: size * 0.5, lineHeight: 1 }}>{d.num}</span>
    <span style={{ fontSize: size * 0.17, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3 }}>{d.mon}</span>
  </Col>
);
const Sticker = ({ text, bg, fg, size }: { text: string; bg: string; fg: string; size: number }) => (
  <span style={{ display: "flex", alignSelf: "flex-start", fontFamily: "Bowlby", fontSize: size, padding: `${size * 0.4}px ${size * 0.7}px`, background: bg, color: fg, border: `6px solid ${C.ink}`, transform: "rotate(-5deg)", boxShadow: `8px 8px 0 ${C.ink}` }}>{text}</span>
);
const Photo = ({ src, size, fg }: { src: string | null; size: number; fg: string }) =>
  src ? <img src={src} width={size} height={size} style={{ objectFit: "cover", border: `6px solid ${fg}` }} /> : <div style={{ display: "flex", width: size, height: size, border: `6px solid ${fg}`, background: C.blue }} />;

export default async function handler(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const [, , , kind, target] = pathname.split("/");
  const story = (searchParams.get("size") ?? "link") === "story";
  const W = story ? 1080 : 1200, H = story ? 1920 : 630;
  const big = story ? 150 : 96, mid = story ? 54 : 36, small = story ? 36 : 26;

  const [bowlby, grotesk] = await Promise.all([font("BowlbyOne.ttf", req), font("SpaceGrotesk-Bold.ttf", req)]);
  const fonts = [{ name: "Bowlby", data: bowlby, weight: 400 as const }, { name: "Grotesk", data: grotesk, weight: 700 as const }];
  const render = (el: React.ReactElement) =>
    new ImageResponse(el, { width: W, height: H, fonts, headers: { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" } });
  const notFound = () => render(<Frame story={story} bg={C.ink} fg={C.cream} label="" url=""><span style={{ fontFamily: "Bowlby", fontSize: big }}>CATS CAN DANCE</span></Frame>);

  if (kind === "going" || kind === "night") {
    const n = await night(target);
    if (!n) return notFound();
    const d = dateBits(n.date);
    return render(
      <Frame story={story} bg={C.blue} fg={C.cream} label="Nights" url={n.path} kids={kind === "going" ? <Sticker text="Join my crew" bg={C.acid} fg={C.ink} size={small} /> : undefined}>
        <Col style={{ gap: story ? 40 : 20 }}>
          {kind === "going" && <span style={{ fontFamily: "Bowlby", fontSize: big, lineHeight: 0.9, textShadow: `8px 8px 0 ${C.ink}` }}>I'M GOING.</span>}
          <Row style={{ gap: 28, alignItems: "stretch" }}>
            <DateBox d={d} size={story ? 220 : 130} fg={C.ink} bg={C.cream} />
            <Col style={{ justifyContent: "center", gap: 10, flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: "Bowlby", fontSize: mid, lineHeight: 1.05 }}>{esc(n.title, 70)}</span>
              <span style={{ fontSize: small }}>{[n.venue, n.city].filter(Boolean).join(", ")}</span>
            </Col>
          </Row>
        </Col>
      </Frame>,
    );
  }

  if (kind === "artist" || kind === "tour" || kind === "booked") {
    const a = await artist(target);
    if (!a) return notFound();
    const city = a.based_city ?? a.from_city;
    const photo = await jpeg(a.photo_url, req.nextUrl.origin, story ? 640 : 384);

    if (kind === "booked") {
      const d = dateBits(searchParams.get("date"));
      const where = esc(searchParams.get("city"), 40);
      return render(
        <Frame story={story} bg={C.acid} fg={C.ink} label="Bookings" url="/book">
          <Col style={{ gap: story ? 40 : 18 }}>
            <Row style={{ gap: 30 }}>
              <span style={{ fontFamily: "Bowlby", fontSize: big, lineHeight: 0.9 }}>BOOKED.</span>
              <Sticker text="Confirmed" bg={C.cream} fg={C.red} size={small} />
            </Row>
            <Row style={{ gap: 28 }}>
              <Photo src={photo} size={story ? 300 : 170} fg={C.ink} />
              <Col style={{ gap: 8, flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: "Bowlby", fontSize: mid, lineHeight: 1 }}>{esc(a.name, 30)}</span>
                {d.long && <span style={{ fontSize: small }}>{d.long}{where ? ` · ${where}` : ""}</span>}
              </Col>
            </Row>
          </Col>
        </Frame>,
      );
    }

    const up = (await rpc<any[]>("artist_upcoming", { p_slug: a.slug })) ?? [];
    if (kind === "tour") {
      const dates = up.slice(0, story ? 6 : 3);
      return render(
        <Frame story={story} bg={C.cream} fg={C.ink} label="On tour" url={`/artists/${a.slug}`} kids={<Sticker text="Book a date" bg={C.blue} fg={C.cream} size={small} />}>
          <Col style={{ gap: story ? 36 : 16 }}>
            <Row style={{ gap: 28 }}>
              <Photo src={photo} size={story ? 220 : 120} fg={C.ink} />
              <Col style={{ fontFamily: "Bowlby", fontSize: story ? 96 : 64, lineHeight: 0.92, flex: 1, minWidth: 0 }}><span>{esc(a.name, 24).toUpperCase()}</span><span>ON TOUR</span></Col>
            </Row>
            <Col style={{ gap: 10 }}>
              {dates.length ? dates.map((e, i) => {
                const d = dateBits(e.event_date);
                return (
                  <Row key={i} style={{ justifyContent: "space-between", border: `5px solid ${C.ink}`, padding: "12px 18px", fontSize: small, background: i === 0 ? C.acid : C.cream }}>
                    <span style={{ fontFamily: "Bowlby" }}>{esc(e.city, 20)}</span><span>{d.long} · {esc(e.venue, 28)}</span>
                  </Row>
                );
              }) : <span style={{ fontSize: small }}>Dates coming. Ask for one.</span>}
            </Col>
          </Col>
        </Frame>,
      );
    }

    const next = up[0];
    const d = dateBits(next?.event_date ?? null);
    return render(
      <Frame story={story} bg={C.ink} fg={C.cream} label="Artists" url={`/artists/${a.slug}`} kids={next ? <Sticker text="Tickets" bg={C.acid} fg={C.ink} size={small} /> : <Sticker text="Follow" bg={C.acid} fg={C.ink} size={small} />}>
        <Col style={{ gap: story ? 34 : 16 }}>
          <div style={{ display: "flex", flexDirection: story ? "column" : "row", gap: 30, alignItems: story ? "flex-start" : "flex-end" }}>
            <Photo src={photo} size={story ? 640 : 230} fg={C.cream} />
            <Col style={story ? { gap: 14, width: "100%" } : { gap: 12, flex: 1, minWidth: 0 }}>
              {next && <Sticker text="Plays next" bg={C.red} fg={C.cream} size={small} />}
              <span style={{ fontFamily: "Bowlby", fontSize: story ? 100 : 60, lineHeight: 0.92 }}>{esc(a.name, 28).toUpperCase()}</span>
              <span style={{ fontSize: small, opacity: 0.8 }}>{[city, (a.genres ?? []).slice(0, 3).join(", ")].filter(Boolean).join(" · ")}</span>
            </Col>
          </div>
          {next && (
            <Row style={{ gap: 24, border: `6px solid ${C.cream}`, padding: 20 }}>
              <DateBox d={d} size={story ? 170 : 110} fg={C.ink} bg={C.acid} />
              <Col style={{ gap: 6, flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: "Bowlby", fontSize: mid, lineHeight: 1.05 }}>{esc(next.title, 50)}</span>
                <span style={{ fontSize: small }}>{[next.venue, next.city].filter(Boolean).join(", ")}</span>
              </Col>
            </Row>
          )}
        </Col>
      </Frame>,
    );
  }

  if (kind === "episode") {
    const r = await sb<any[]>(`events?select=title,venue,city,event_date,episode_no,lineup&slug=eq.${encodeURIComponent(target)}&limit=1`);
    const e = r?.[0];
    if (!e) return notFound();
    const past = !!e.event_date && e.event_date < new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
    const d = dateBits(e.event_date);
    const ep = e.episode_no ? `EP${String(e.episode_no).padStart(2, "0")}` : "CCD";
    return render(
      <Frame story={story} bg={C.red} fg={C.cream} label="Episodes" url={`/nights/${target}`} kids={past ? undefined : <Sticker text="Tickets" bg={C.acid} fg={C.ink} size={small} />}>
        <Col style={{ gap: story ? 30 : 12 }}>
          <span style={{ fontFamily: "Bowlby", fontSize: story ? 110 : 70, lineHeight: 0.9, textShadow: `8px 8px 0 ${C.ink}` }}>{past ? "I WAS THERE." : "NEXT UP."}</span>
          <span style={{ fontFamily: "Bowlby", fontSize: story ? 260 : 150, lineHeight: 0.85, color: C.ink }}>{ep}</span>
          <span style={{ fontSize: mid, fontWeight: 700 }}>{d.long} · {[e.venue, e.city].filter(Boolean).join(", ")}</span>
          {Array.isArray(e.lineup) && e.lineup.length > 0 && <span style={{ fontSize: small }}>{e.lineup.slice(0, 6).join(" · ")}</span>}
        </Col>
      </Frame>,
    );
  }

  return notFound();
}
