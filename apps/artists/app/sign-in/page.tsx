import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SignInForm from "@/components/SignInForm";
import { getMember } from "@/lib/auth";
import { NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/bookings";
  const member = await getMember();
  if (member) redirect(next);
  return (
    <main className="wrap grid gap-10 py-14 md:grid-cols-[1fr_420px] md:items-start md:py-20">
      <div className="fade-up grid gap-4">
        <p className="kicker">Sign in</p>
        <h1 className="display text-4xl md:text-6xl">One link, every <span className="mark">Cats Can Dance</span> product.</h1>
        <p className="max-w-[48ch] text-graphite">We email you a link. Open it and you are signed in on {NAME}, Nights and Gate at once. No password.</p>
        <ul className="grid gap-2 text-sm text-graphite">
          <li>Artists: answer booking requests, mark your calendar, set your rates.</li>
          <li>Promoters: see every request you sent and every reply.</li>
          <li>Fans: follow artists and hear when they announce a show.</li>
        </ul>
      </div>
      <div className="card fade-up-2 p-6 md:p-8">
        <SignInForm next={next} error={sp.error ?? null} />
      </div>
    </main>
  );
}
