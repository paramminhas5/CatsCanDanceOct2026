import type { Metadata } from "next";
import MakeParty from "@/components/app/MakeParty";
import { HostApp, SignInCard, Top } from "@/components/app/ui";
import { getMember } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Make a party" };

export default async function Make() {
  const { user } = await getMember();
  return (
    <HostApp dock={false}>
      {user ? <MakeParty /> : <><Top back="/" right="Takes 2 minutes" /><SignInCard next="/make" title="Make a party" line="Sign in first. One email, and the same sign-in works on Nights and Artists." /></>}
    </HostApp>
  );
}
