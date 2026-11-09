import type { Metadata } from "next";
import PartiesHome from "@/components/app/PartiesHome";
import { HostApp, HostTop, SignInCard } from "@/components/app/ui";
import { getMember } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your parties", robots: { index: false } };

export default async function Page() {
  const { user } = await getMember();
  return (
    <HostApp tab="parties">
      <HostTop />
      {user ? <PartiesHome /> : <SignInCard next="/parties" title="Your parties" line="Sign in to see your parties, who is coming and the door. One email, the same sign-in as Nights and Artists." />}
    </HostApp>
  );
}
