import type { Metadata } from "next";
import GearForm from "@/components/GearForm";
import { HostApp, Top } from "@/components/app/ui";
import { select } from "@/lib/rpc";

export const metadata: Metadata = { title: "Gear", description: "Decks, sound and lights for your night. Tell us what you need." };

export default async function Gear({ searchParams }: { searchParams: Promise<{ night?: string }> }) {
  const { night = "" } = await searchParams;
  const n = /^[a-z0-9-]{1,120}$/.test(night) ? night : "";
  const [e] = n ? await select<{ title: string; event_date: string | null; city: string | null }>(`events?slug=eq.${n}&select=title,event_date,city&limit=1`, 60) : [];
  return (
    <HostApp tab="parties">
      <Top back={n ? "/parties" : "/"} right="From Gear" />
      <div style={{ padding: "4px 20px 0" }}>
        <h1 className="d" style={{ fontSize: 36, margin: 0 }}>{e ? `Gear for ${e.title}` : "Gear for the night"}</h1>
        <div className="b" style={{ marginTop: 8 }}>Delivered by the evening, set up, and collected the next morning.</div>
      </div>
      <GearForm night={n} title={e?.title} date={e?.event_date ?? undefined} city={e?.city ?? undefined} />
    </HostApp>
  );
}
