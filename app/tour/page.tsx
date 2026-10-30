import type { Metadata } from "next";
import Link from "next/link";
import { getTouring, getPromoters, fmtDate } from "@/lib/db";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Tour: which artists are touring where in India",
  description: "See who is passing through your city and when. Artists post their dates, promoters book them.",
};

export default async function TourPage() {
  const [dates, promoters] = await Promise.all([getTouring(), getPromoters()]);
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <span className="tag">Tour</span>
          <h1 style={{ fontSize: "clamp(40px,8vw,96px)", marginTop: 14 }}>Tour</h1>
          <p style={{ fontSize: 20, maxWidth: "52ch" }}>
            Artists post the cities and dates they are free. Promoters see who is coming through and book them.
          </p>
          <div className="btns"><Link href="/tour/post" className="btn">Post tour dates</Link></div>
        </div>
      </section>
      <section className="block">
        <div className="wrap">
          <div className="head"><h2>Coming through</h2></div>
          {dates.length ? (
            <div style={{ borderTop: "3px solid var(--ink)" }}>
              {dates.map((d) => (
                <div key={d.id} className="tour-row">
                  <b>{fmtDate(d.from_date)} to {fmtDate(d.to_date)}</b>
                  <span><b>{d.artist_name}</b> · {d.city}</span>
                  <span>
                    {d.note && <span className="muted">{d.note} </span>}
                    <Link href={`/litter/${d.artist_slug}#book`}>Book</Link>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No dates posted yet. Artists, <Link href="/tour/post">post yours</Link>.</p>
          )}
        </div>
      </section>
      {promoters.length > 0 && (
        <section className="block">
          <div className="wrap">
            <div className="head"><h2>Promoters</h2><span className="muted">Who books in India</span></div>
            <div className="grid">
              {promoters.map((p) => (
                <div key={p.slug} className="card">
                  <h3>{p.name}</h3>
                  <span className="where">{p.city}</span>
                  {p.blurb && <p style={{ margin: 0 }}>{p.blurb}</p>}
                  <div className="chips">{p.genres.slice(0, 4).map((g) => <span key={g} className="chip">{g}</span>)}</div>
                  <div className="links">
                    {p.instagram && <a className="btn sm alt" href={p.instagram.startsWith("http") ? p.instagram : `https://instagram.com/${p.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">Instagram</a>}
                    {p.website && <a className="btn sm alt" href={p.website} target="_blank" rel="noreferrer">Website</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
