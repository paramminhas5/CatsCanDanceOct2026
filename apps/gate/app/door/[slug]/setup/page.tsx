import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DoorGate from "@/components/DoorGate";
import DoorSetup from "@/components/DoorSetup";

export const metadata: Metadata = { title: "Door setup", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  return <main className="k-root"><section className="k-wrap max-w-[960px] py-12"><h1 className="k-d mb-8 text-[44px] md:text-[56px]">Door setup</h1><DoorGate next={`/door/${slug}/setup`}><DoorSetup slug={slug} /></DoorGate></section></main>;
}
