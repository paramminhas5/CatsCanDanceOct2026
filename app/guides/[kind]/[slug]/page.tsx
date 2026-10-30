import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getScene, getScenes } from "@/lib/db";

export const revalidate = 600;
export async function generateStaticParams() { return (await getScenes()).map((s) => ({ kind: s.kind, slug: s.slug })); }
export async function generateMetadata({ params }: { params: { kind: string; slug: string } }): Promise<Metadata> {
  const s = await getScene(params.kind, params.slug);
  if (!s) return { title: "Guide" };
  const d = typeof s.data.description === "string" ? s.data.description : s.tagline ?? "";
  return { title: `${s.name}: ${s.kind === "city" ? "underground scene guide" : "genre guide"}`, description: d.slice(0, 155) };
}

export default async function Guide({ params }: { params: { kind: string; slug: string } }) {
  const s = await getScene(params.kind, params.slug);
  if (!s) notFound();
  const desc = typeof s.data.description === "string" ? s.data.description : null;
  const venues = Array.isArray(s.data.keyVenues) ? (s.data.keyVenues as unknown[]).filter((v): v is string => typeof v === "string") : [];
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <p className="muted" style={{ margin: 0 }}><Link href="/guides">Guides</Link></p>
          <h1 style={{ fontSize: "clamp(40px,8vw,96px)", margin: "14px 0" }}>{s.name}</h1>
          {s.tagline && <p style={{ fontSize: 22, fontWeight: 700 }}>{s.tagline}</p>}
          {desc && <p className="prose">{desc}</p>}
          {venues.length > 0 && (
            <>
              <h3 style={{ margin: "24px 0 10px" }}>Key venues</h3>
              <div className="chips">{venues.map((v) => <span key={v} className="chip">{v}</span>)}</div>
            </>
          )}
          {s.kind === "city" && <div className="btns"><Link href={`/prowl?city=${encodeURIComponent(s.name)}#scene`} className="btn">See what&apos;s on in {s.name}</Link></div>}
        </div>
      </section>
    </main>
  );
}
