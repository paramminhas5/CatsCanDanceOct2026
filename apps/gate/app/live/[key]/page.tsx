/** The venue's live count (no sign-in). door_live returns counts only, never names. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Readout } from "@ccd/ui";
import { rpc } from "@/lib/rpc";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live count", robots: { index: false, follow: false } };
type Live = { ok?: boolean; title?: string; inside?: number; expected?: number; capacity?: number | null };

export default async function LiveCount({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(key)) notFound();
  const d = await rpc<Live>("door_live", { p_key: key });
  if (!d || d.ok === false) notFound();
  return (
    <main className="k-root">
      <meta httpEquiv="refresh" content="30" />
      <section className="k-wrap grid max-w-[760px] gap-8 py-16">
        <span className="k-m" style={{ color: "var(--k-pc)" }}>Live, refreshes every 30 seconds</span>
        <h1 className="k-d text-[44px] md:text-[64px]">{d.title ?? "Tonight"}</h1>
        <div className="k-d text-[120px] leading-none md:text-[180px]">{d.inside ?? 0}</div>
        <Readout cells={[{ value: d.expected, label: "Expected" }, { value: d.capacity, label: "Capacity" }]} />
      </section>
    </main>
  );
}
