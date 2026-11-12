/**
 * Asks the person to sign in (email and password, or a code), then renders the page. The server decides what the person can see.
 * Light (cream) for public tools like /promote; the door uses its own dark gate.
 */
import type { ReactNode } from "react";
import { useMember } from "@/lib/member";
import AuthBox from "@/components/AuthBox";

export default function SignInGate({ next, title, line, children }: { next: string; title: string; line: string; children: ReactNode }) {
  const { loading, signedIn } = useMember();
  if (loading) return <p className="py-10 text-ink/70">Checking who you are…</p>;
  if (signedIn) return <>{children}</>;
  return (
    <div className="max-w-md border-4 border-ink bg-cream p-5 chunk-shadow">
      <h2 className="font-display text-3xl leading-none">{title}</h2>
      <p className="mt-3 text-ink/80">{line}</p>
      <div className="mt-4"><AuthBox next={next} /></div>
    </div>
  );
}
