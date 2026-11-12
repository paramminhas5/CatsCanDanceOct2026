import type { Metadata } from "next";
import MakeParty from "@/components/app/MakeParty";
import { HostApp } from "@/components/app/ui";
import { getMember } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Make a party" };

// Anyone can make a party. Signed out, it is saved on the phone and published after one email (plan 5.4).
export default async function Make() {
  const { user } = await getMember();
  return <HostApp dock={false}><MakeParty signedIn={!!user} /></HostApp>;
}
