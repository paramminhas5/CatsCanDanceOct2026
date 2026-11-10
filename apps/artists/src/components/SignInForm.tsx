"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";

/**
 * Email in, 6-digit code out (Param, 10 Nov 2026: no link every time). The code signs in right here; the
 * browser client sets the shared .catscandance.com cookie. The email still has a link that lands on /auth/callback.
 */
export default function SignInForm({ next, error, compact = false }: { next: string; error?: string | null; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state === "sent") codeRef.current?.focus(); }, [state]);
  const [msg, setMsg] = useState(error === "link" ? "That link did not work. Ask for a new one." : error === "missing" ? "Open the link from your email to sign in." : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { setMsg("Enter a valid email."); return; }
    setState("busy"); setMsg("");
    try {
      const { error: err } = await supabaseBrowser().auth.signInWithOtp({
        email: em,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (err) { setState("error"); setMsg("Could not send the code. Try again in a minute."); return; }
      setState("sent"); setCode("");
    } catch {
      setState("error"); setMsg("Could not reach the sign-in service.");
    }
  }

  async function verify(c: string) {
    if (checking) return;
    setChecking(true); setMsg("");
    const { error: err } = await supabaseBrowser().auth.verifyOtp({ email: email.trim().toLowerCase(), token: c, type: "email" });
    setChecking(false);
    if (err) { setMsg(/expired/i.test(err.message) ? "That code has expired. Send a new one." : "That code did not work. Check it and try again."); return; }
    window.location.assign(next);
  }

  if (state === "sent") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); verify(code); }} className="grid gap-3" noValidate>
        <p className="display text-2xl">Check your email.</p>
        <p className="text-graphite">We sent a 6-digit code to <b>{email.trim()}</b>. Type it here. The link in the email works too, on this device.</p>
        <label className="label">
          The code
          <input ref={codeRef} value={code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" placeholder="000000"
            onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 8); setCode(v); if (v.length === 6) verify(v); }}
            className="field text-center font-mono text-2xl tracking-[0.4em]" aria-invalid={!!msg} />
        </label>
        <button disabled={checking || code.length < 6} className="btn btn-primary">{checking ? "Signing in..." : "Sign in"}</button>
        {msg && <p role="alert" className="err">{msg}</p>}
        <button type="button" onClick={() => { setState("idle"); setMsg(""); }} className="btn btn-quiet btn-sm justify-self-start">Use another email</button>
      </form>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {!compact && <p className="display text-2xl">Email me a code</p>}
      <label className="label">
        Email
        <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@example.com" aria-invalid={!!msg} />
      </label>
      <button disabled={state === "busy"} className="btn btn-primary">{state === "busy" ? "Sending..." : "Email me a code"}</button>
      {msg && <p role="alert" className="err">{msg}</p>}
      <p className="hint">By signing in you agree to hear from Cats Can Dance about your bookings. Nothing else.</p>
    </form>
  );
}
