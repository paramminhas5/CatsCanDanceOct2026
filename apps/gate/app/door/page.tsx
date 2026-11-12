import type { Metadata } from "next";
import DoorGate from "@/components/DoorGate";
import DoorNights from "@/components/DoorNights";
import { HostApp, Top } from "@/components/app/ui";
import { DoorDemo } from "@/components/app/Demo";

export const metadata: Metadata = { title: "The door", robots: { index: false } };

export default function Door() {
  return (
    <HostApp tab="door">
      <Top back="/parties" right="Works with no signal" />
      <div style={{ padding: "4px 20px 0" }}>
        <h1 className="d" style={{ fontSize: 36, margin: 0 }}>The door</h1>
        <div className="b" style={{ marginTop: 8 }}>Scan tickets, the guest list and outside tickets. The list lives on the phone and catches up when it can.</div>
      </div>
      <DoorGate next="/door" demo={<DoorDemo />}><DoorNights /></DoorGate>
    </HostApp>
  );
}
