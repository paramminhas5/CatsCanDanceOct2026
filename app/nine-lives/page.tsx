import type { Metadata } from "next";
import Link from "next/link";
import { getNgos } from "@/lib/db";

export const revalidate = 600;
export const metadata: Metadata = {
  title: "Nine Lives: animal welfare groups across India",
  description: "A directory of 100 animal rescue, shelter and welfare organisations in India. Adopt, donate or volunteer.",
};

export default async function NineLives({ searchParams }: { searchParams: { city?: string; focus?: string } }) {
  const all = await getNgos();
  const cities = Array.from(new Set(all.map((n) => n.city).filter(Boolean))).sort() as string[];
  const cats = Array.from(new Set(all.flatMap((n) => n.categories))).sort();
  const city = searchParams.city && cities.includes(searchParams.city) ? searchParams.city : null;
  const cat = searchParams.focus && cats.includes(searchParams.focus) ? searchParams.focus : null;
  const list = all.filter((n) => (!city || n.city === city) && (!cat || n.categories.includes(cat)));
  const q = (c: string | null, f: string | null) => {
    const p = new URLSearchParams();
    if (c) p.set("city", c);
    if (f) p.set("focus", f);
    const s = p.toString();
    return s ? `/nine-lives?${s}` : "/nine-lives";
  };
  const link = (u: string | null) => (u && /^https?:\/\//.test(u) ? u : null);

  return (
    <main>
      <section className="block">
        <div className="wrap">
          <span className="tag">Adopt</span>
          <h1 style={{ fontSize: "clamp(40px,8vw,96px)", marginTop: 14 }}>Nine Lives</h1>
          <p style={{ fontSize: 20, maxWidth: "52ch" }}>
            Great music can make the world better for animals too. These are the groups doing the work. Adopt, donate, volunteer.
          </p>
        </div>
      </section>
      <section className="block">
        <div className="wrap">
          <div className="filters">
            <Link href={q(null, cat)} className={city ? "" : "on"}>All cities</Link>
            {cities.map((c) => <Link key={c} href={q(c, cat)} className={c === city ? "on" : ""}>{c}</Link>)}
          </div>
          <div className="filters">
            <Link href={q(city, null)} className={cat ? "" : "on"}>All types</Link>
            {cats.map((c) => <Link key={c} href={q(city, c)} className={c === cat ? "on" : ""}>{c}</Link>)}
          </div>
          <p className="muted">{list.length} groups</p>
          <div className="grid">
            {list.map((n) => (
              <div key={n.slug} className="card">
                <h3>{n.name}</h3>
                <span className="where">{n.location ?? n.city}</span>
                {n.impact && <p style={{ margin: 0 }}>{n.impact}</p>}
                <div className="chips">{n.categories.slice(0, 3).map((c) => <span key={c} className="chip">{c}</span>)}</div>
                <div className="links">
                  {link(n.website) && <a className="btn sm alt" href={link(n.website)!} target="_blank" rel="noreferrer">Website</a>}
                  {link(n.donation) && <a className="btn sm" href={link(n.donation)!} target="_blank" rel="noreferrer">Donate</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
