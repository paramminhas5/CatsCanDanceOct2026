/**
 * The artist side of the app (boards F38-A-Today, Tour, Bookings, Contract, Fans, Page). Same app,
 * artist mode: an Artist tag and a lime ring. Signed-out visitors get one clear way in.
 */
import type { Metadata } from "next";
import { ButtonLink, Cat, Tag } from "@ccd/ui";
import { getMember, firstName } from "@/lib/auth";
import MeTabs from "@/components/MeTabs";

export const metadata: Metadata = { title: "Your page", robots: { index: false, follow: false } };

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const member = await getMember();
  if (!member) {
    return (
      <main className="k-root">
        <section className="k-wrap grid max-w-[760px] justify-items-start gap-5 py-20">
          <Cat name="lime" height={96} />
          <h1 className="k-d text-[48px] md:text-[64px]">Run your career from here.</h1>
          <p className="k-b text-[18px]">Sign in with the email on your page to answer bookings, post a tour and see your fans. No page yet? Claim it first.</p>
          <div className="flex flex-wrap gap-3"><ButtonLink variant="key" size="l" href="/sign-in?next=/me">Sign in</ButtonLink><ButtonLink size="l" href="/claim">Claim your page</ButtonLink></div>
        </section>
      </main>
    );
  }
  return (
    <main className="k-root">
      <section className="k-wrap pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full font-bold text-[#0a0a0b] ring" style={{ background: "var(--k-pc)", boxShadow: "0 0 0 2.5px #0a0a0b, 0 0 0 5px var(--k-pc)" }} aria-hidden="true">{(firstName(member) ?? "?").charAt(0).toUpperCase()}</span>
          <span className="text-[15px] font-semibold">{firstName(member)}</span>
          <Tag>Artist</Tag>
        </div>
        <div className="mt-6"><MeTabs /></div>
      </section>
      <section className="k-wrap pb-10 pt-8">{children}</section>
    </main>
  );
}
