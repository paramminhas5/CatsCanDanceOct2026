import type { Metadata } from "next";
import Guests from "@/components/app/Guests";
import { HostApp } from "@/components/app/ui";
import { getMember } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Who's coming", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ night?: string }> }) {
  const { night = "" } = await searchParams;
  const { user } = await getMember();
  return (
    <HostApp tab="guests">
      <Guests night={/^[a-z0-9-]{1,120}$/.test(night) ? night : ""} signedIn={!!user} />
    </HostApp>
  );
}
