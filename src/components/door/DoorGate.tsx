/**
 * Who can open the door: hosts, CCD staff and the owner (migration 054, door_can).
 * Signed out: an email sign-in link that brings them back to this page.
 */
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useMember } from "@/lib/member";
import { sendSignInLink } from "@/lib/plans";

export default function DoorGate({ next, children }: { next: string; children: ReactNode }) {
  const { loading, signedIn, member } = useMember();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const shell = (body: ReactNode) => (
    <div className="min-h-[100dvh] bg-ink text-cream grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <p className="font-display text-acid-yellow text-sm tracking-widest">CCD DOOR</p>
        {body}
      </div>
    </div>
  );

  if (loading) return shell(<p className="font-display text-3xl mt-2">Checking who you are…</p>);
  if (!signedIn) {
    return shell(
      <>
        <h1 className="font-display text-4xl mt-2 leading-none">Sign in to run the door.</h1>
        <p className="mt-3 text-cream/80">We'll email you a link. Open it on this phone.</p>
        <form className="mt-5 space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await sendSignInLink(email.trim(), next); setMsg(r.ok ? "Link sent. Check your email on this phone." : r.error ?? "Could not send the link."); }}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email"
            className="w-full bg-cream text-ink border-4 border-cream p-3 text-lg" />
          <button className="w-full font-display text-xl py-4 bg-acid-yellow text-ink border-4 border-ink">Send link</button>
        </form>
        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </>,
    );
  }
  if (!member || !["host", "staff", "owner"].includes(member.role)) {
    return shell(
      <>
        <h1 className="font-display text-4xl mt-2 leading-none">The door is for hosts and the CCD team.</h1>
        <p className="mt-3 text-cream/80">If you're working a night, ask Param or Satwik to add you as staff.</p>
        <Link href="/me" className="inline-block mt-5 underline">Your account</Link>
      </>,
    );
  }
  return <>{children}</>;
}
