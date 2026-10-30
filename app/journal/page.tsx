import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/db";

export const revalidate = 600;
export const metadata: Metadata = { title: "Journal: guides to the Indian underground", description: "Plain guides to finding and enjoying electronic music events in India." };

export default async function Journal() {
  const posts = await getPosts();
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <h1 style={{ fontSize: "clamp(40px,8vw,96px)" }}>Journal</h1>
          <p style={{ fontSize: 20, maxWidth: "50ch" }}>Guides to the scene, written by people who go out.</p>
        </div>
      </section>
      <section className="block">
        <div className="wrap">
          <div className="grid">
            {posts.map((p) => (
              <Link key={p.slug} href={`/journal/${p.slug}`} className="card">
                {p.category && <span className="when">{p.category}</span>}
                <h3>{p.title}</h3>
                {p.excerpt && <p style={{ margin: 0 }}>{p.excerpt}</p>}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
