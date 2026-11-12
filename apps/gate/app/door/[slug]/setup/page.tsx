import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DoorGate from "@/components/DoorGate";
import DoorSetup from "@/components/DoorSetup";
import { HostApp } from "@/components/app/ui";

export const metadata: Metadata = { title: "Door setup", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  return <HostApp tab="door"><DoorGate next={`/door/${slug}/setup`}><DoorSetup slug={slug} /></DoorGate></HostApp>;
}
