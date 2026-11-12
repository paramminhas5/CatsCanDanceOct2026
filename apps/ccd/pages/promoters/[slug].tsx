/**
 * /promoters/<slug>: a promoter's page on CCD, in their look (migration 056). Their nights on CCD, coming up and past,
 * what they are about and where to find them. Pending or hidden promoters 404. Built at request time, cached for a minute.
 */
import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { rpc } from "@/lib/ccd-db";
import { accentOf, nightPath, type Accent } from "@/lib/promoter-look";
import { productLink } from "@ccd/brand";
import { todayIST } from "@/lib/nights";

type P = { id: string; slug: string; name: string; city: string | null; genres: string[] | null; blurb: string | null; tagline: string | null;
  instagram: string | null; website: string | null; accent: Accent; logo_url: string | null; cover_url: string | null };
type N = { slug: string; title: string; date: string | null; event_date: string | null; venue: string | null; city: string | null; poster_url: string | null; lineup: string[] | null };
type S = { id: string; title: string; event_date: string | null; venue: string | null; city: string | null; url: string | null };
type Props = { p: P; nights: N[]; scene: S[] };

const link = (s: string | null, kind: "ig" | "web") => {
  if (!s) return null;
  if (kind === "ig") return `https://instagram.com/${s.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "")}`;
  return /^https?:\/\//.test(s) ? s : `https://${s}`;
};

export default function PromoterPage({ p, nights, scene }: Props) {
  const a = accentOf(p.accent);
  const today = todayIST();
  const upcoming = nights.filter((n) => (n.event_date ?? "") >= today).sort((x, y) => (x.event_date ?? "").localeCompare(y.event_date ?? ""));
  const past = nights.filter((n) => (n.event_date ?? "") < today);
  const ig = link(p.instagram, "ig"), web = link(p.website, "web");
  const card = (n: N) => (
    <li key={n.slug}>
      <Link href={nightPath(n.slug)} className="block border-4 border-ink bg-white hover:-translate-y-0.5 transition-transform h-full">
        {n.poster_url ? <img src={n.poster_url} alt="" className="w-full aspect-[4/5] object-cover border-b-4 border-ink" loading="lazy" />
          : <div className={`w-full aspect-[4/5] ${a.bg} ${a.on} border-b-4 border-ink p-3 flex items-end font-display text-xl md:text-2xl leading-none break-words overflow-hidden`}>{n.title}</div>}
        <div className="p-3">
          <p className="text-sm font-bold">{n.date ?? n.event_date}</p>
          <p className="font-display text-xl leading-tight">{n.title}</p>
          <p className="text-sm text-ink/70">{[n.venue, n.city].filter(Boolean).join(", ")}</p>
        </div>
      </Link>
    </li>
  );
  return (
    <main className="bg-cream text-ink min-h-screen">
      <SEO title={`${p.name}: upcoming nights${p.city ? ` in ${p.city}` : ""} | Cats Can Dance`} description={[p.tagline || p.blurb, upcoming.length + scene.length ? `${upcoming.length + scene.length} upcoming ${upcoming.length + scene.length === 1 ? "night" : "nights"} on Cats Can Dance.` : `${p.name} on Cats Can Dance.`].filter(Boolean).join(" ").slice(0, 300)} path={`/promoters/${p.slug}`}
        image={p.cover_url ?? p.logo_url ?? undefined}
        jsonLd={[{ "@context": "https://schema.org", "@type": "Organization", name: p.name, url: `https://catscandance.com/promoters/${p.slug}`, logo: p.logo_url ?? undefined, sameAs: [ig, web].filter(Boolean) }]} />
      <Nav />
      <section className={`relative ${a.bg} ${a.on} border-b-4 border-ink pt-28 pb-12 overflow-hidden`}>
        {p.cover_url && <img src={p.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
        <div className="relative container max-w-5xl">
          <p className="font-bold text-sm uppercase tracking-wide">Promoter{p.city ? ` · ${p.city}` : ""}</p>
          <div className="mt-3 flex items-end gap-4">
            {p.logo_url && <img src={p.logo_url} alt={`${p.name} logo`} className="w-20 h-20 md:w-28 md:h-28 object-cover border-4 border-ink bg-cream" />}
            <h1 className="font-display text-5xl md:text-7xl leading-[0.9] break-words">{p.name}</h1>
          </div>
          {p.tagline && <p className="mt-4 text-xl font-bold max-w-2xl">{p.tagline}</p>}
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
            {ig && <a href={ig} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border-4 border-ink bg-cream text-ink">Instagram</a>}
            {web && <a href={web} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border-4 border-ink bg-cream text-ink">Website</a>}
          </div>
        </div>
      </section>
      <section className="container max-w-5xl py-12 space-y-12">
        <div>
          <h2 className="font-display text-3xl leading-none">Coming up</h2>
          {upcoming.length ? <ul className="mt-4 grid gap-4 grid-cols-2 md:grid-cols-3">{upcoming.map(card)}</ul> : <p className="mt-3 text-ink/70">Nothing on CCD right now.{scene.length ? " Their other nights are below." : ""}</p>}
        </div>
        {scene.length > 0 && (
          <div>
            <h2 className="font-display text-3xl leading-none">Also on What&apos;s on</h2>
            <p className="text-ink/70 mt-1">Their nights elsewhere that we list.</p>
            <ul className="mt-4 border-t-4 border-ink">
              {scene.map((e) => (
                <li key={e.id} className="border-b-2 border-ink/20">
                  <a href={e.url ?? "/whats-on"} target="_blank" rel="noopener noreferrer" className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 hover:text-electric-blue">
                    <span className="font-bold tabular-nums w-28 shrink-0">{e.event_date}</span>
                    <span className="font-display text-lg leading-tight flex-1 min-w-[200px]">{e.title}</span>
                    <span className="text-sm text-ink/70">{[e.venue, e.city].filter(Boolean).join(", ")}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(p.blurb || (p.genres ?? []).length > 0) && (
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl leading-none">About</h2>
            {p.blurb && <p className="mt-3 text-lg whitespace-pre-line">{p.blurb}</p>}
            {(p.genres ?? []).length > 0 && <p className="mt-3">{(p.genres ?? []).map((g) => <span key={g} className="inline-block mr-2 mb-2 px-2 py-0.5 border-2 border-ink font-bold text-sm">{g}</span>)}</p>}
          </div>
        )}
        {past.length > 0 && (
          <div>
            <h2 className="font-display text-3xl leading-none">Past nights</h2>
            <ul className="mt-4 grid gap-4 grid-cols-2 md:grid-cols-4">{past.slice(0, 12).map(card)}</ul>
          </div>
        )}
        <p className="text-sm text-ink/70 border-t-4 border-ink pt-4">Promoters run their nights with Gate and they show here. <a href={productLink("gate", "/promote")} className="underline font-bold">Run yours</a>.</p>
      </section>
      <Footer />
    </main>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: "blocking" });

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = String(params?.slug ?? "");
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return { notFound: true };
  // promoter_page (migration 057) only answers for promoters that qualify for a page.
  const r = await rpc<any>("promoter_page", { p_slug: slug }).catch(() => null);
  if (!r?.ok) return { notFound: true, revalidate: 60 };
  return { props: { p: r.promoter as P, nights: (r.nights ?? []) as N[], scene: (r.scene ?? []) as S[] }, revalidate: 60 };
};
