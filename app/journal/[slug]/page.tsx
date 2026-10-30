import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/db";

export const revalidate = 600;
export async function generateStaticParams() { return (await getPosts()).map((p) => ({ slug: p.slug })); }
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getPost(params.slug);
  return p ? { title: p.title, description: (p.excerpt ?? p.tldr ?? "").slice(0, 155) } : { title: "Journal" };
}

export default async function Post({ params }: { params: { slug: string } }) {
  const p = await getPost(params.slug);
  if (!p) notFound();
  const body = Array.isArray(p.body) ? p.body.filter((x) => typeof x === "string") : [];
  const schema = {
    "@context": "https://schema.org", "@type": "Article", headline: p.title,
    author: { "@type": "Organization", name: p.author ?? "Cats Can Dance" },
    mainEntityOfPage: `https://catscandance.com/journal/${p.slug}`,
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="block">
        <div className="wrap">
          <p className="muted" style={{ margin: 0 }}><Link href="/journal">Journal</Link></p>
          <h1 style={{ fontSize: "clamp(32px,6vw,72px)", margin: "14px 0 20px", maxWidth: "20ch" }}>{p.title}</h1>
          {p.tldr && <p className="prose"><b>{p.tldr}</b></p>}
          <div className="prose">{body.map((t, i) => <p key={i}>{t}</p>)}</div>
        </div>
      </section>
    </main>
  );
}
