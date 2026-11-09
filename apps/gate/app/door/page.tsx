import type { Metadata } from "next";
import DoorGate from "@/components/DoorGate";
import DoorNights from "@/components/DoorNights";

export const metadata: Metadata = { title: "The door", robots: { index: false } };

export default function Door() {
  return (
    <main className="k-root">
      <section className="k-wrap max-w-[860px] py-12">
        <h1 className="k-d text-[48px] md:text-[64px]">The door</h1>
        <p className="k-b mb-8 mt-3 text-[17px]">Scan tickets and the guest list. Works with no signal: the list lives on the phone and catches up when it can.</p>
        <DoorGate next="/door"><DoorNights /></DoorGate>
      </section>
    </main>
  );
}
