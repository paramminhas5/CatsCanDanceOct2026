import type { GetStaticProps } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PageHero from "@/components/PageHero";
import { select } from "@/lib/ccd-db";

type Agency = {
  slug: string; name: string; kind: string | null; city: string | null; cities: string[] | null; country: string | null; founded: number | null;
  founders: string | null; genres: string[] | null; blurb: string | null; website: string | null; instagram: string | null;
};

export const getStaticProps: GetStaticProps<{ agencies: Agency[] }> = async () => {
  const agencies = await select<Agency>(
    "promoters?kind=in.(agency,management,pr,production)&select=slug,name,kind,city,cities,country,founded,founders,genres,blurb,website,instagram&order=name.asc", 600,
  ).catch(() => []);
  return { props: { agencies }, revalidate: 600 };
};

const ext = (s: string | null) => (s ? (/^https?:\/\//i.test(s) ? s : `https://${s}`) : null);

export default function AgenciesPage({ agencies }: { agencies: Agency[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("All");
  const kinds = useMemo(() => Array.from(new Set(agencies.map((a) => a.kind).filter(Boolean) as string[])).sort(), [agencies]);
  const rows = agencies.filter((a) => (kind === "All" || a.kind === kind) && (!q.trim() || `${a.name} ${a.city ?? ""} ${(a.genres ?? []).join(" ")} ${a.blurb ?? ""}`.toLowerCase().includes(q.toLowerCase().trim())));
  return (
    <div className="min-h-screen bg-cream">
      <SEO title="Agencies, management and PR for South Asian electronic music | Cats Can Dance"
        description="Booking agencies, artist management and PR firms working with Indian and South Asian electronic artists. Every entry keeps its sources."
        path="/agencies" keywords="India booking agencies, electronic music management India, South Asian artist agencies" />
      <Nav />
      <PageHero eyebrow="Agencies" title="Who Books And Manages The Scene">
        <p className="text-cream/90 max-w-2xl">Booking agencies, management and PR firms for Indian and South Asian electronic artists. See also <Link href="/promoters" className="underline">promoters</Link> and <Link href="/labels" className="underline">labels</Link>.</p>
      </PageHero>
      <section className="container py-8">
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block font-display text-sm text-ink mb-1">Search</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, city, genre…" className="w-full h-10 px-3 border-4 border-ink bg-cream" />
          </div>
          <div>
            <label className="block font-display text-sm text-ink mb-1">Type</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 px-3 border-4 border-ink bg-cream font-display">
              <option value="All">All types</option>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
        <p className="font-display text-sm text-ink/60 mb-4">Showing {rows.length} of {agencies.length}</p>
        {rows.length === 0 ? (
          <div className="border-4 border-dashed border-ink/40 p-12 text-center"><p className="font-display text-2xl text-ink">No agencies listed yet.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rows.map((a) => (
              <article key={a.slug} className="bg-cream border-4 border-ink chunk-shadow p-5 flex flex-col gap-3">
                <header>
                  <h3 className="font-display text-xl text-ink uppercase leading-tight">{a.name}</h3>
                  <p className="text-xs text-ink/60 mt-1">{[a.kind, a.city ?? a.cities?.[0], a.country].filter(Boolean).join(" · ")}{a.founded ? ` · since ${a.founded}` : ""}</p>
                </header>
                {a.blurb && <p className="text-sm text-ink/80 line-clamp-4">{a.blurb}</p>}
                {a.founders && <p className="text-xs text-ink/70"><b>Founders:</b> {a.founders}</p>}
                <div className="flex flex-wrap gap-2 pt-1 mt-auto">
                  {ext(a.website) && <a href={ext(a.website)!} target="_blank" rel="noreferrer" className="inline-flex items-center min-h-[28px] text-[11px] font-display bg-cream text-ink px-2 py-1 border-2 border-ink">Website ↗</a>}
                  {a.instagram && /^[a-z0-9._]+$/i.test(a.instagram) && <a href={`https://instagram.com/${a.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center min-h-[28px] text-[11px] font-display bg-ink text-cream px-2 py-1 border-2 border-ink">@{a.instagram}</a>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
