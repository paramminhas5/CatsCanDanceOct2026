import type { Metadata } from "next";
import PartiesHome from "@/components/app/PartiesHome";
import { HostApp, HostTop } from "@/components/app/ui";
import { PartiesDemo } from "@/components/app/Demo";
import { getMember } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your parties", robots: { index: false } };

export default async function Page() {
  const { user } = await getMember();
  return (
    <HostApp tab="parties">
      <HostTop />
      {user ? <PartiesHome /> : <PartiesDemo />}
    </HostApp>
  );
}
