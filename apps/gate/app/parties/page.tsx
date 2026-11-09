import type { Metadata } from "next";
import { ButtonLink } from "@ccd/ui";
import Parties from "@/components/Parties";
import NeedSignIn from "@/components/NeedSignIn";
import { getMember } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your parties", robots: { index: false } };

export default async function Page() {
  const { user } = await getMember();
  if (!user) return <main className="k-root"><NeedSignIn next="/parties" title="Your parties" line="Sign in to see your parties, who is coming, and the door." /></main>;
  return (
    <main className="k-root">
      <section className="k-wrap py-12">
        <div className="mb-10 flex flex-wrap items-end gap-4"><h1 className="k-d flex-1 text-[48px] md:text-[64px]">Your parties</h1><ButtonLink variant="key" href="/make">Make a party</ButtonLink></div>
        <Parties />
      </section>
    </main>
  );
}
