import type { Metadata } from "next";
import { Cat } from "@ccd/ui";
import SignIn from "@/components/SignIn";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/parties";
  return (
    <main className="k-root">
      <section className="k-wrap grid max-w-[1000px] gap-10 py-16 md:grid-cols-[1fr_420px]">
        <div>
          <h1 className="k-d text-[48px] md:text-[64px]">One link, every product.</h1>
          <p className="k-b mt-4 text-[17px]">We email you a link. Open it and you are signed in on Host, Nights and Artists at once. No password.</p>
          <div className="mt-8"><Cat name="yellow" height={140} /></div>
        </div>
        <div className="k-plinth p-6">
          {sp.error && <p className="k-note k-note--warn mb-4" role="alert">That link did not work. Ask for a new one.</p>}
          <SignIn next={next} />
        </div>
      </section>
    </main>
  );
}
