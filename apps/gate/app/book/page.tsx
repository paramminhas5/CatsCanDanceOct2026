/**
 * Book artists for a party (board H39-BookArtists). Artists open to bookings, with their own fee floor,
 * minus anyone with a known gig or a day marked booked on that date. "Ask" opens the booking desk on
 * Artists with the artist, date and city filled in; the thread, contract and set times follow there.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { productLink } from "@ccd/brand";
import { HostApp, Top, dayShort } from "@/components/app/ui";
import { select, rpc } from "@/lib/rpc";

export const metadata: Metadata = { title: "Book artists", robots: { index: false } };
export const revalidate = 300;

type Act = "dj" | "live" | "vj" | "band";
type A = { slug: string; name: string; based_city: string | null; genres: string[] | null; photo_url: string | null; bio: string | null; members: string | null; fee_min_inr: number | string | null; rank: number | null };
const ACTS: [Act | "", string][] = [["", "Everyone"], ["dj", "DJs"], ["live", "Live"], ["vj", "VJs"], ["band", "Bands"]];
const LABEL: Record<Act, string> = { dj: "DJ", live: "Live act", vj: "VJ", band: "Band" };

/** Same rule the booking desk on Artists uses when an artist has not set their acts. */
function inferActs(genres: string[], bio: string | null, members: string | null): Act[] {
  const t = `${genres.join(" ")} ${bio ?? ""}`.toLowerCase();
  const out = new Set<Act>();
  if (/\bvj\b|\bvjing\b|visual artist|audio-?visual/.test(t)) out.add("vj");
  if (/\bband\b|\bquartet\b|\btrio\b|\bfive-piece\b|\bfour-piece\b|\bdrummer\b|\bguitarist\b|\bvocalist\b/.test(t) && !/\bdj\b/.test(t)) out.add("band");
  if (/live (set|act|show|electronic|electronica|performance|pa)\b|live electronica|\bhardware\b|\bmodular\b|drum machines|live looping/.test(t)) out.add("live");
  if (/\bdj\b|dj set|\bselector\b|\bb2b\b|\bdjs\b/.test(t) || out.size === 0) out.add("dj");
  if (members && /\+|,|\band\b/.test(members) && out.has("band")) out.add("band");
  return [...out];
}
const fee = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L` : `₹${Math.round(n / 1000)}k`);
const iso = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "");

export default async function Book({ searchParams }: { searchParams: Promise<{ night?: string; date?: string; city?: string; act?: string }> }) {
  const sp = await searchParams;
  const act = (ACTS.some(([k]) => k === sp.act) ? sp.act : "") as Act | "";
  let title = "", date = iso(sp.date), city = (sp.city ?? "").slice(0, 60), venue = "";
  const night = sp.night && /^[a-z0-9-]{1,120}$/.test(sp.night) ? sp.night : "";
  if (night) {
    const [e] = await select<{ title: string; event_date: string | null; city: string | null; venue: string | null }>(`events?slug=eq.${night}&select=title,event_date,city,venue&limit=1`, 60);
    if (e) { title = e.title; date = e.event_date ?? date; city = e.city ?? city; venue = e.venue ?? ""; }
  }
  const [rows, settings, gigs, avail] = await Promise.all([
    select<A>("artists?status=eq.approved&open_to_bookings=is.true&select=slug,name,based_city,genres,photo_url,bio,members,fee_min_inr,rank&order=rank.asc.nullslast,name.asc&limit=400"),
    rpc<{ artist_slug: string; act_types: string[] | null }[]>("booking_settings_public", {}, 300).catch(() => null),
    date ? select<{ artist_slug: string }>(`artist_gigs?verified=is.true&event_date=eq.${date}&select=artist_slug`) : Promise.resolve([] as { artist_slug: string }[]),
    date ? rpc<{ artist_slug: string; state: string }[]>("artist_availability_public", { p_from: date, p_to: date }, 300).catch(() => null) : Promise.resolve(null),
  ]);
  const own = new Map((settings ?? []).map((s) => [s.artist_slug, (s.act_types ?? []).filter(Boolean) as Act[]]));
  const busy = new Set([...gigs.map((g) => g.artist_slug), ...(avail ?? []).filter((a) => a.state !== "open").map((a) => a.artist_slug)]);
  const openThatDay = new Set((avail ?? []).filter((a) => a.state === "open").map((a) => a.artist_slug));
  const list = rows
    .filter((a) => !busy.has(a.slug))
    .map((a) => ({ ...a, acts: own.get(a.slug)?.length ? own.get(a.slug)! : inferActs(a.genres ?? [], a.bio, a.members), fee: Number(a.fee_min_inr) > 0 ? Number(a.fee_min_inr) : null }))
    .filter((a) => !act || a.acts.includes(act) || (act === "live" && a.acts.includes("band")))
    .sort((a, b) => Number(openThatDay.has(b.slug)) - Number(openThatDay.has(a.slug)) || Number(!!b.fee) - Number(!!a.fee) || (a.rank ?? 999) - (b.rank ?? 999))
    .slice(0, 30);
  const q = (v: string) => { const u = new URLSearchParams(); if (night) u.set("night", night); else { if (date) u.set("date", date); if (city) u.set("city", city); } if (v) u.set("act", v); const s = u.toString(); return s ? `/book?${s}` : "/book"; };
  const ask = (slug: string) => productLink("artists", `/book?a=${slug}${date ? `&date=${date}` : ""}${city ? `&city=${encodeURIComponent(city)}` : ""}`);
  return (
    <HostApp tab="book">
      <Top back="/parties" right="From Artists" />
      <div style={{ padding: "4px 20px 0" }}>
        <h1 className="d" style={{ fontSize: 36, margin: 0 }}>{title ? `Book for ${title}` : "Book artists"}</h1>
        <div className="b" style={{ marginTop: 8 }}>
          {date ? `${dayShort(date)}${venue ? ` at ${venue}` : city ? ` in ${city}` : ""}. Anyone with a known gig that night is left out.` : "Pick a date to see who is free that night."}
        </div>
      </div>
      {!night && (
        <form action="/book" className="row" style={{ gap: 8, padding: "12px 20px 0" }}>
          <input className="fld" type="date" name="date" required aria-label="Date" defaultValue={date} style={{ flex: 1, marginTop: 0 }} />
          <input className="fld" name="city" placeholder="City" aria-label="City" defaultValue={city} style={{ width: 120, marginTop: 0 }} />
          {act && <input type="hidden" name="act" value={act} />}
          <button className="pill lg on" style={{ height: 50 }}>Go</button>
        </form>
      )}
      <div className="row" style={{ gap: 6, padding: "14px 20px 0", overflowX: "auto" }}>
        {ACTS.map(([k, l]) => <Link key={k} href={q(k)} className={`pill lg${act === k ? " on" : ""}`} scroll={false}>{l}</Link>)}
      </div>
      <div style={{ padding: "8px 20px 0" }}>
        {list.length === 0 && <p className="b" style={{ padding: "14px 0" }}>Nobody matches. Try everyone, or another date.</p>}
        {list.map((a) => (
          <div key={a.slug} className="rw rise" style={{ padding: "12px 0" }}>
            <a href={productLink("artists", `/${a.slug}`)} style={{ flex: "none", width: 52, height: 52, borderRadius: 14, overflow: "hidden", background: "#16161A", display: "grid", placeItems: "center" }}>
              {a.photo_url ? <img className="ph" src={a.photo_url} alt="" loading="lazy" style={{ width: 52, height: 52, objectFit: "cover" }} /> : <img src="/cats/lime.webp" alt="" style={{ height: 34, opacity: 0.6 }} />}
            </a>
            <a href={productLink("artists", `/${a.slug}`)} style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{a.name}</span>
              <span className="b" style={{ display: "block", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {[a.acts.map((x) => LABEL[x]).join(" and "), (a.genres ?? [])[0]?.toLowerCase()].filter(Boolean).join(", ")}{a.fee ? ` · from ${fee(a.fee)}` : ""}{openThatDay.has(a.slug) ? " · free that night" : ""}
              </span>
            </a>
            <a className="pill" href={ask(a.slug)} style={{ height: 32 }}>Ask</a>
          </div>
        ))}
        {list.length > 0 && <div className="hl" />}
      </div>
      <div className="b" style={{ fontSize: 13, padding: "12px 20px 0" }}>The ask goes to the artist. Fee, set times and the rest follow in the same thread on Artists.</div>
    </HostApp>
  );
}
