import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PromoterDash from "@/components/PromoterDash";
import NeedSignIn from "@/components/NeedSignIn";
import { getMember } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your promoter page", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  const { user } = await getMember();
  if (!user) return <main className="k-root"><NeedSignIn next={`/promote/${slug}`} title="Sign in" line="Sign in with an email on this promoter's team." /></main>;
  return <main className="k-root"><section className="k-wrap py-12"><PromoterDash slug={slug} /></section></main>;
}
