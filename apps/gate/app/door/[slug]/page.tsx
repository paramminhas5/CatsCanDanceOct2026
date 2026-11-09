/** The door screen for one night (board H39-Door). Full screen over the site chrome, thumb tabs at the bottom. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DoorGate from "@/components/DoorGate";
import DoorApp from "@/components/door/DoorApp";

export const metadata: Metadata = { title: "The door", robots: { index: false, follow: false } };

export default async function DoorNight({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  return (
    <div className="fixed inset-0 z-[60] overflow-auto" style={{ background: "#0a0a0b" }}>
      <DoorGate next={`/door/${slug}`}><DoorApp slug={slug} /></DoorGate>
    </div>
  );
}
