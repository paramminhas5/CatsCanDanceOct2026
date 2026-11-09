import type { Metadata } from "next";
import { Cat } from "@ccd/ui";
import GearForm from "@/components/GearForm";

export const metadata: Metadata = { title: "Gear", description: "Decks, sound and lights for your night. Tell us what you need." };

export default async function Gear({ searchParams }: { searchParams: Promise<{ night?: string }> }) {
  const { night = "" } = await searchParams;
  const n = /^[a-z0-9-]{1,120}$/.test(night) ? night : "";
  return (
    <main className="k-root">
      <section className="k-wrap grid gap-12 py-12 md:grid-cols-[1fr_560px]">
        <div>
          <h1 className="k-d text-[48px] md:text-[72px]">Gear for the night</h1>
          <p className="k-b mt-4 max-w-[520px] text-[18px]">Decks, sound and lights. Tell us what you need and when. We reply with what is free and the price, delivered, set up and collected.</p>
          <div className="mt-8"><Cat name="yellow" height={160} /></div>
        </div>
        <div className="k-plinth p-6 md:p-8"><GearForm night={n} /></div>
      </section>
    </main>
  );
}
