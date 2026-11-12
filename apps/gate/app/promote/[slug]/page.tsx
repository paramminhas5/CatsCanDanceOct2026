import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PromoterDash from "@/components/PromoterDash";
import { HostApp, SignInCard, Top } from "@/components/app/ui";
import { getMember } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your promoter page", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  const { user } = await getMember();
  return (
    <HostApp tab="parties">
      <Top back="/parties" right="Promoter" />
      {user ? <div style={{ padding: "4px 20px 0" }}><PromoterDash slug={slug} /></div> : <SignInCard next={`/promote/${slug}`} title="Sign in" line="Sign in with an email on this promoter's team." />}
    </HostApp>
  );
}
