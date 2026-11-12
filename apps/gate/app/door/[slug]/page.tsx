/** The door screen for one night (board H39-Door). Full screen over the site chrome, the dock at the bottom. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DoorGate from "@/components/DoorGate";
import DoorApp from "@/components/door/DoorApp";

export const metadata: Metadata = { title: "The door", robots: { index: false, follow: false } };

export default async function DoorNight({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, overflow: "auto", background: "#050505" }}>
      <DoorGate next={`/door/${slug}`} framed><DoorApp slug={slug} /></DoorGate>
    </div>
  );
}
