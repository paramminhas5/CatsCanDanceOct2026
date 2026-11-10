/**
 * Asks for an email sign-in link, then renders the page. The server decides what the person can see.
 * Light (cream) for public tools like /promote; the door uses its own dark gate.
 */
import { useState, type ReactNode } from "react";
import { useMember } from "@/lib/member";
import { sendSignInLink } from "@/lib/plans";
import SignInCode from "@/components/SignInCode";

export default function SignInGate({ next, title, line, children }: { next: string; title: string; line: string; children: ReactNode }) {
  const { loading, signedIn } = useMember();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  if (loading) return <p className="py-10 text-ink/70">Checking who you are…</p>;
  if (signedIn) return <>{children}</>;
  return (
    <div className="max-w-md border-4 border-ink bg-cream p-5 chunk-shadow">
      <h2 className="font-display text-3xl leading-none">{title}</h2>
      <p className="mt-3 text-ink/80">{line}</p>
      {sent ? <div className="mt-4"><SignInCode email={email.trim()} next={next} onBack={() => setSent(false)} /></div> : <>
      <form className="mt-4 space-y-3" onSubmit={async (e) => { e.preventDefault(); setMsg(""); const r = await sendSignInLink(email.trim(), next); if (r.ok) setSent(true); else setMsg(r.error ?? "Could not send the code."); }}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email"
          className="w-full border-4 border-ink bg-white p-3 text-lg" />
        <button className="w-full font-display text-xl py-3 bg-acid-yellow border-4 border-ink">Email me a code</button>
      </form>
      {msg && <p className="mt-3 text-sm font-bold">{msg}</p>}
      </>}
    </div>
  );
}
