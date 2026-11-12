import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DoorGate from "@/components/DoorGate";
import Report from "@/components/Report";
import { HostApp } from "@/components/app/ui";

export const metadata: Metadata = { title: "How it went", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  return <HostApp tab="parties"><DoorGate next={`/door/${slug}/report`}><Report slug={slug} /></DoorGate></HostApp>;
}
