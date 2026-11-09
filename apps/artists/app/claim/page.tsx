/**
 * Claim your page, or add an artist who is missing. Writes through submit_artist (anon SECURITY DEFINER,
 * honeypot and throttle in the database). CCD checks each claim before it goes live.
 */
import type { Metadata } from "next";
import { ButtonLink, Cat } from "@ccd/ui";
import ClaimForm from "@/components/ClaimForm";
import { Tick } from "@/components/bits";

export const metadata: Metadata = { title: "Claim your page", description: "Claim your artist page on Cats Can Dance: set your rates, your dates and your shop." };

export default async function Claim({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const { a } = await searchParams;
  const slug = a && /^[a-z0-9-]{1,80}$/.test(a) ? a : "";
  return (
    <main className="k-root">
      <section className="k-wrap grid gap-12 py-12 md:grid-cols-[1fr_520px]">
        <div>
          <h1 className="k-d text-[52px] md:text-[80px]">Your page is probably already here.</h1>
          <p className="k-b mt-5 max-w-[560px] text-[18px]">We make pages from the nights we list. Claim yours and you can answer bookings, post a tour, set your rates and see where your fans are.</p>
          <ul className="mt-6 max-w-[560px] list-none p-0"><Tick>Free to claim</Tick><Tick>We check it is you, usually within a day</Tick><Tick>Your bio, links and facts stay as they are until you change them</Tick></ul>
          <div className="mt-8 flex items-center gap-4"><ButtonLink href="/artists">Find your page</ButtonLink><Cat name="lime" height={80} /></div>
        </div>
        <div className="k-plinth p-6 md:p-8"><ClaimForm slug={slug} /></div>
      </section>
    </main>
  );
}
