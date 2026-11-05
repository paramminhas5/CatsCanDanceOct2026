import type { GetStaticProps } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PageHero from "@/components/PageHero";
import { select } from "@/lib/ccd-db";

type Label = {
  slug: string; name: string; city: string | null; country: string | null; founded: number | null;
  genres: string[]; description: string | null; website: string | null; instagram: string | null; bandcamp: string | null;
};

export const getStaticProps: GetStaticProps<{ labels: Label[] }> = async () => {
  // Tolerant: the labels table arrives with migration 046; until then the page shows its empty state.
  const labels = await select<Label>("labels?select=slug,name,city,country,founded,genres,description,website,instagram,bandcamp&order=name.asc", 600).catch(() => []);
  return { props: { labels }, revalidate: 600 };
};

export default function LabelsPage({ labels }: { labels: Label[] }) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("All");
  const cities = useMemo(() => Array.from(new Set(labels.map((l) => l.city).filter(Boolean) as string[])).sort(), [labels]);
  const rows = labels.filter((l) => (city === "All" || l.city === city) && (!q.trim() || `${l.name} ${l.genres.join(" ")} ${l.description ?? ""}`.toLowerCase().includes(q.toLowerCase().trim())));
  return (
    <div className="min-h-screen bg-cream">
      <SEO title="Indian electronic music labels | Cats Can Dance" description="Record labels from India and the South Asian diaspora, with where they are based, who runs them and what they release. Every fact has a source."
        path="/labels" keywords="Indian record labels, India electronic music labels, South Asian techno house labels" />
      <Nav />
      <PageHero eyebrow="Labels" title="Labels From India And The Diaspora">
        <p className="text-cream/90 max-w-2xl">Record labels, netlabels and collectives putting out South Asian electronic music. Each entry keeps the pages it came from.</p>
      </PageHero>
      <section className="container py-8">
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block font-display text-sm text-ink mb-1">Search</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, genre…" className="w-full h-10 px-3 border-4 border-ink bg-cream" />
          </div>
          <div>
            <label className="block font-display text-sm text-ink mb-1">City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="h-10 px-3 border-4 border-ink bg-cream font-display max-w-[200px]">
              <option value="All">All cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <p className="font-display text-sm text-ink/60 mb-4">Showing {rows.length} of {labels.length}</p>
        {rows.length === 0 ? (
          <div className="border-4 border-dashed border-ink/40 p-12 text-center"><p className="font-display text-2xl text-ink">No labels listed yet.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rows.map((l) => (
              <article key={l.slug} className="bg-cream border-4 border-ink chunk-shadow p-5 flex flex-col gap-3">
                <header>
                  <Link href={`/labels/${l.slug}`}><h3 className="font-display text-xl text-ink uppercase leading-tight hover:text-magenta transition-colors">{l.name}</h3></Link>
                  <p className="text-xs text-ink/60 mt-1">{[l.city, l.country].filter(Boolean).join(", ")}{l.founded ? ` · since ${l.founded}` : ""}</p>
                </header>
                {l.description && <p className="text-sm text-ink/80 line-clamp-3">{l.description}</p>}
                {l.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {l.genres.slice(0, 4).map((g) => <span key={g} className="text-[10px] font-display uppercase bg-acid-yellow text-ink px-2 py-0.5 border-2 border-ink">{g}</span>)}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
