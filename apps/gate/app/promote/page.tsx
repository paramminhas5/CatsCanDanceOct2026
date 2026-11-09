import type { Metadata } from "next";
import Promote from "@/components/Promote";
import { HostApp, SignInCard, Top } from "@/components/app/ui";
import { getMember } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "For promoters", description: "Your nights under your own name on Nights, with the door built in. Free for now; later a share of paid tickets only." };

export default async function Page() {
  const { user } = await getMember();
  return (
    <HostApp tab="parties">
      <Top back="/parties" right="Free for now" />
      <div style={{ padding: "4px 20px 0" }}>
        <h1 className="d" style={{ fontSize: 36, margin: 0 }}>For promoters</h1>
        <div className="b" style={{ marginTop: 8 }}>Your nights under your own name on Nights, in your colours, with the door built in. Free for now. Later, 10% of paid ticket sales only.</div>
      </div>
      {user ? <div style={{ padding: "20px 20px 0" }}><Promote /></div> : <SignInCard next="/promote" title="Sign in to apply" line="One email, and you can apply and start making nights." />}
    </HostApp>
  );
}
