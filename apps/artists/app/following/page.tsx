import type { Metadata } from "next";
import { ButtonLink } from "@ccd/ui";
import FollowingList from "@/components/FollowingList";
import { getMember } from "@/lib/auth";

export const metadata: Metadata = { title: "Following", robots: { index: false } };

export default async function Following() {
  const m = await getMember();
  return (
    <main className="k-root">
      <section className="k-wrap py-12">
        <h1 className="k-d text-[48px] md:text-[64px]">Following</h1>
        <p className="k-b mb-8 mt-3 text-[17px]">The artists you follow. You hear first when they release something or play your city.</p>
        {m ? <FollowingList /> : <ButtonLink variant="key" size="l" href="/sign-in?next=/following">Sign in to see who you follow</ButtonLink>}
      </section>
    </main>
  );
}
