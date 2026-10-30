import type { GetStaticProps } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getScenes, type Scene } from "@/lib/ccd-db";

const href = (s: Scene) =>
  s.kind === "city" ? `/scene/${s.slug}` : s.kind === "genre" ? `/genres/${s.slug}` : `/scenes/${s.slug}`;

const groups = [
  { kind: "city", title: "CITY GUIDES", note: "Where to go and what is on, city by city." },
  { kind: "genre", title: "GENRE GUIDES", note: "What it sounds like and who to listen to." },
  { kind: "global", title: "SCENES AROUND THE WORLD", note: "The scenes that shaped the sound." },
];

export const getStaticProps: GetStaticProps<{ scenes: Scene[] }> = async () => {
  let scenes: Scene[] = [];
  try { scenes = await getScenes(); } catch { /* build without data */ }
  return { props: { scenes }, revalidate: 3600 };
};

export default function Guides({ scenes }: { scenes: Scene[] }) {
  return (
    <>
      <SEO title="Guides: city, genre and scene guides | Cats Can Dance" description="City, genre and scene guides for underground dance music, from Bengaluru to Detroit." path="/guides" />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <PageHero eyebrow="READ · GUIDES" title="KNOW THE SCENE." bg="bg-electric-blue" textColor="text-cream" eyebrowColor="text-acid-yellow">
          <p className="text-cream font-medium text-lg max-w-xl">Plain guides to cities, genres and scenes. Read first, then go out.</p>
        </PageHero>
        <section className="container py-6 md:py-8">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Guides" }]} />
        </section>
        {groups.map((g) => {
          const items = scenes.filter((s) => s.kind === g.kind);
          if (!items.length) return null;
          return (
            <section key={g.kind} className="container pb-16">
              <h2 className="font-display text-ink text-3xl md:text-5xl mb-2">{g.title}</h2>
              <p className="font-medium mb-6">{g.note}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((s) => (
                  <Link key={s.slug} href={href(s)} className="border-4 border-ink bg-cream p-5 chunk-shadow hover:-translate-y-1 transition-transform block">
                    <h3 className="font-display text-xl mb-2">{s.name}</h3>
                    {s.tagline && <p className="text-sm">{s.tagline}</p>}
                    <span className="font-display text-sm text-magenta mt-3 inline-block">READ →</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
        <Footer />
      </main>
    </>
  );
}
