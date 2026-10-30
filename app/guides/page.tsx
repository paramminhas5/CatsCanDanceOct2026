import type { Metadata } from "next";
import Link from "next/link";
import { getScenes } from "@/lib/db";

export const revalidate = 600;
export const metadata: Metadata = { title: "Guides: Indian cities and dance music genres", description: "Short guides to the scenes and sounds behind the nights we list." };

export default async function Guides() {
  const scenes = await getScenes();
  const groups: [string, string][] = [["city", "Cities"], ["genre", "Genres"], ["global", "Where it came from"]];
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <h1 style={{ fontSize: "clamp(40px,8vw,96px)" }}>Guides</h1>
        </div>
      </section>
      {groups.map(([k, label]) => (
        <section className="block" key={k}>
          <div className="wrap">
            <div className="head"><h2>{label}</h2></div>
            <div className="grid">
              {scenes.filter((s) => s.kind === k).map((s) => (
                <Link key={s.slug} href={`/guides/${s.kind}/${s.slug}`} className="card">
                  <h3>{s.name}</h3>
                  {s.tagline && <p style={{ margin: 0 }}>{s.tagline}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
