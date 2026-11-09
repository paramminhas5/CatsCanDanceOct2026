import type { Metadata } from "next";
import Promote from "@/components/Promote";
import NeedSignIn from "@/components/NeedSignIn";
import { getMember } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "For promoters", description: "Your nights under your own name on Nights, with the door built in. Free for now; later a share of paid tickets only." };

export default async function Page() {
  const { user } = await getMember();
  return (
    <main className="k-root">
      <section className="k-wrap grid max-w-[960px] gap-8 py-12">
        <div>
          <h1 className="k-d text-[48px] md:text-[64px]">For promoters</h1>
          <p className="k-b mt-3 text-[17px]">Your nights under your own name on Nights, in your colours, with the door built in. Free for now. Later, 10% of paid ticket sales only.</p>
        </div>
        {user ? <Promote /> : <NeedSignIn next="/promote" title="Sign in to apply" line="One email, and you can apply and start making nights." />}
      </section>
    </main>
  );
}
