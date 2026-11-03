/** Page frame for the booking pages (requests, thread, receipt, artist desk), plus small shared bits. */
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function DeskShell({ title, eyebrow, heading, children, path, wide }: {
  title: string; eyebrow?: string; heading: React.ReactNode; children: React.ReactNode; path: string; wide?: boolean;
}) {
  return (
    <main className="bg-background text-ink min-h-screen">
      <SEO title={`${title} · Cats Can Dance`} description="Artist booking requests on Cats Can Dance." path={path} noindex />
      <div className="print:hidden"><Nav /></div>
      <section className="bg-electric-blue text-cream pt-28 md:pt-32 pb-8 print:hidden">
        <div className="container">
          {eyebrow && <p className="font-bold text-acid-yellow mb-2">{eyebrow}</p>}
          <h1 className="font-display text-5xl md:text-7xl leading-[0.85] break-words" style={{ filter: "drop-shadow(5px 5px 0 hsl(var(--ink)))" }}>{heading}</h1>
        </div>
      </section>
      <div className={`container py-10 md:py-14 ${wide ? "" : "max-w-5xl"} print:py-0`}>{children}</div>
      <div className="print:hidden"><Footer /></div>
    </main>
  );
}

export function NeedsUpdate({ what, children }: { what: string; children?: React.ReactNode }) {
  return (
    <div className="border-4 border-ink bg-cream chunk-shadow p-5 md:p-6 max-w-2xl">
      <p className="font-display text-2xl leading-tight mb-2">Coming soon, needs database update</p>
      <p className="text-ink/80">{what}</p>
      {children && <div className="mt-4 flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}

export const btn = "inline-block font-display px-5 py-3 border-4 border-ink bg-acid-yellow text-ink hover:bg-ink hover:text-acid-yellow transition-colors disabled:opacity-50";
export const btnAlt = "inline-block font-display px-5 py-3 border-4 border-ink bg-cream text-ink hover:bg-ink hover:text-cream transition-colors disabled:opacity-50";
export const field = "w-full border-4 border-ink bg-cream px-3 py-2.5 text-ink text-base placeholder:text-ink/45 focus:outline-none focus:ring-4 focus:ring-electric-blue/40";

export function SignInNudge() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/join" className={btn}>Join or sign in</Link>
      <Link href="/book" className={btnAlt}>Find an artist</Link>
    </div>
  );
}
