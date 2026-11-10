/**
 * The second half of signing in: type the 6-digit code from the email. Replaces "open the link"
 * (Param, 10 Nov 2026: a link every time is annoying). The email still carries a link for the same phone.
 */
import { useEffect, useRef, useState } from "react";
import { sendSignInLink, verifySignInCode } from "@/lib/plans";

export default function SignInCode({
  email, next, onDone, onBack, dark = false,
}: { email: string; next: string; onDone?: () => void; onBack?: () => void; dark?: boolean }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(45);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const go = async (c: string) => {
    if (busy) return;
    setBusy(true); setErr("");
    const r = await verifySignInCode(email, c);
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "That code did not work."); return; }
    if (onDone) onDone(); else window.location.assign(next);
  };
  const again = async () => {
    setErr(""); setWait(45);
    const r = await sendSignInLink(email, next);
    if (!r.ok) setErr(r.error ?? "Could not send a new code.");
  };

  const sub = dark ? "text-cream/80" : "text-ink/75";
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); go(code); }}>
      <p className="font-display text-xl leading-tight">Check your email.</p>
      <p className={`text-sm ${sub}`}>We sent a 6-digit code to <b>{email}</b>. Type it here. On this phone, the link in the email works too.</p>
      <label className="grid gap-1 text-sm font-bold">
        <span className="sr-only">The code</span>
        <input
          ref={ref}
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 8);
            setCode(v);
            if (v.length === 6) go(v);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          placeholder="000000"
          aria-invalid={!!err}
          className="w-full border-4 border-ink bg-white text-ink p-3 text-center font-mono text-3xl tracking-[0.5em]"
        />
      </label>
      <button disabled={busy || code.length < 6} className="font-display px-5 py-3 border-4 border-ink bg-acid-yellow text-ink disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
      <div className={`flex flex-wrap justify-between gap-2 text-sm ${sub}`}>
        {onBack ? <button type="button" onClick={onBack} className="underline min-h-[44px]">Use another email</button> : <span />}
        {wait > 0 ? <span className="self-center">New code in 0:{String(wait).padStart(2, "0")}</span> : <button type="button" onClick={again} className="underline min-h-[44px]">Send a new code</button>}
      </div>
      {err && <p role="alert" className="text-sm font-bold text-magenta">{err}</p>}
    </form>
  );
}
