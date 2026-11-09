import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DoorGate from "@/components/DoorGate";
import Report from "@/components/Report";

export const metadata: Metadata = { title: "Report", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  return <main className="k-root"><section className="k-wrap py-12"><DoorGate next={`/door/${slug}/report`}><Report slug={slug} /></DoorGate></section></main>;
}
