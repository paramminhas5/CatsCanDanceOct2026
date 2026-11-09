import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@ccd/ui";
import Thread from "@/components/Thread";
import { isUuid } from "@/lib/db";

export const metadata: Metadata = { title: "Booking", robots: { index: false, follow: false } };

export default async function BookingThread({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string }> }) {
  const { id } = await params;
  const { k } = await searchParams;
  if (!isUuid(id)) notFound();
  return (
    <main className="k-root">
      <section className="k-wrap py-10">
        <Link href="/bookings" className="k-b mb-6 inline-flex items-center gap-1 text-sm"><Icon name="back" size={14} />All bookings</Link>
        <Thread id={id} urlKey={k && isUuid(k) ? k : null} />
      </section>
    </main>
  );
}
