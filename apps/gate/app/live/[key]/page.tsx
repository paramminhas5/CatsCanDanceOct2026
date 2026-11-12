/** The venue's live count (no sign-in). door_live returns counts only, never names. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gls, HostApp, Top } from "@/components/app/ui";
import { rpc } from "@/lib/rpc";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live count", robots: { index: false, follow: false } };
type Live = { ok?: boolean; title?: string; inside?: number; expected?: number; capacity?: number | null };

export default async function LiveCount({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(key)) notFound();
  const d = await rpc<Live>("door_live", { p_key: key });
  if (!d || d.ok === false) notFound();
  const pct = d.capacity ? Math.min(100, Math.round(((d.inside ?? 0) / d.capacity) * 100)) : null;
  return (
    <HostApp dock={false}>
      <meta httpEquiv="refresh" content="30" />
      <Top right="Live, every 30 seconds" />
      <div style={{ padding: "10px 20px 0", textAlign: "center" }}>
        <div className="m" style={{ color: "rgba(255,255,255,.75)" }}>{d.title ?? "Tonight"}</div>
        <div className="d door-count" style={{ fontSize: 140, lineHeight: 0.95, marginTop: 10 }}>{d.inside ?? 0}</div>
        <div className="b">inside{d.expected ? ` of ${d.expected} expected` : ""}</div>
        {pct !== null && <div style={{ margin: "18px auto 0", width: 220, height: 6, borderRadius: 3, background: "rgba(255,255,255,.12)", overflow: "hidden" }}><i style={{ display: "block", height: 6, width: `${pct}%`, background: pct >= 95 ? "#FF5A5F" : pct >= 80 ? "#FFB020" : "var(--pc)" }} /></div>}
        <div style={{ marginTop: 26 }}><Gls cells={[{ label: "Inside", value: d.inside ?? 0 }, { label: "Expected", value: d.expected ?? "–" }, { label: "Room for", value: d.capacity ?? "Open" }]} /></div>
      </div>
    </HostApp>
  );
}
