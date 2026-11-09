import type { Metadata } from "next";
import MakeParty from "@/components/MakeParty";
import NeedSignIn from "@/components/NeedSignIn";
import { getMember } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Make a party" };

export default async function Make() {
  const { user } = await getMember();
  if (!user) return <main className="k-root"><NeedSignIn next="/make" title="Make a party" line="Sign in first. It takes one email, and the same sign-in works on Nights and Artists." /></main>;
  return (
    <main className="k-root">
      <section className="k-wrap grid max-w-[900px] gap-8 py-12">
        <div>
          <h1 className="k-d text-[48px] md:text-[64px]">Make a party</h1>
          <p className="k-b mt-3 text-[17px]">Two minutes. You can change anything later.</p>
        </div>
        <MakeParty />
      </section>
    </main>
  );
}
