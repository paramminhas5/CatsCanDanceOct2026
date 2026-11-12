"use client";
/**
 * Sign in to Artists (canvas board SignIn): email and password with Remember me. "Make an account" checks the
 * email once with a 6-digit code; "Forgot it?" signs in with a code and sets a new password. The browser
 * client sets the shared .catscandance.com cookie, so one sign-in covers every app. Logic: @ccd/auth signin.ts.
 */
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";
import { signInPassword, signUpPassword, sendCode, verifyCode, setPassword } from "@ccd/auth";

type Mode = "in" | "new" | "code" | "setpw";

export default function SignInForm({ next, error, compact = false }: { next: string; error?: string | null; compact?: boolean }) {
  const [mode, setMode] = useState<Mode>("in");
  const [why, setWhy] = useState<"new" | "forgot">("forgot");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [msg, setMsg] = useState(error === "link" ? "That link did not work. Sign in below, or tap Forgot it for a code." : error === "missing" ? "Sign in below." : "");
  const codeRef = useRef<HTMLInputElement>(null);
  const redirect = typeof window === "undefined" ? next : `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  useEffect(() => { if (mode === "code") codeRef.current?.focus(); }, [mode]);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const sb = () => supabaseBrowser();
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } finally { setBusy(false); } };
  const done = () => window.location.assign(next);
  const signIn = () => run(async () => { const r = await signInPassword(sb(), email, pw, remember); if (!r.ok) setMsg(r.error); else done(); });
  const signUp = () => run(async () => {
    const r = await signUpPassword(sb(), email, pw, redirect);
    if (!r.ok) { setMsg(r.error); return; }
    if (r.next === "in") done(); else { setWhy("new"); setMode("code"); setWait(45); }
  });
  const forgot = () => run(async () => { const r = await sendCode(sb(), email, redirect); if (!r.ok) setMsg(r.error); else { setWhy("forgot"); setCode(""); setMode("code"); setWait(45); } });
  const check = (c: string) => run(async () => {
    const r = await verifyCode(sb(), email, c, remember);
    if (!r.ok) { setMsg(r.error); return; }
    if (why === "forgot") { setPw(""); setMode("setpw"); } else done();
  });
  const savePw = () => run(async () => { const r = await setPassword(sb(), pw); if (!r.ok) setMsg(r.error); else done(); });

  if (mode === "code") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); check(code); }} className="grid gap-3" noValidate>
        <p className="display text-2xl">Check your email.</p>
        <p className="text-graphite">We sent a 6-digit code to <b>{email.trim()}</b>.{why === "forgot" ? " Then you pick a new password." : ""}</p>
        <label className="label">
          The code
          <input ref={codeRef} value={code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" placeholder="000000"
            onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 8); setCode(v); if (v.length === 6) check(v); }}
            className="field text-center font-mono text-2xl tracking-[0.4em]" aria-invalid={!!msg} />
        </label>
        <button disabled={busy || code.length < 6} className="btn btn-primary">{busy ? "Checking..." : "Continue"}</button>
        {msg && <p role="alert" className="err">{msg}</p>}
        <div className="flex justify-between text-sm">
          <button type="button" onClick={() => { setMode("in"); setMsg(""); }} className="btn btn-quiet btn-sm">Back</button>
          {wait > 0 ? <span className="hint self-center">New code in 0:{String(wait).padStart(2, "0")}</span> : <button type="button" onClick={forgot} className="btn btn-quiet btn-sm">Send a new code</button>}
        </div>
      </form>
    );
  }
  if (mode === "setpw") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); savePw(); }} className="grid gap-3" noValidate>
        <p className="display text-2xl">You&rsquo;re in. Pick a password.</p>
        <p className="text-graphite">Next time it&rsquo;s just your email and this.</p>
        <label className="label">New password<input type="password" minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="field" placeholder="8 characters or more" /></label>
        <button disabled={busy} className="btn btn-primary">{busy ? "Saving..." : "Save and continue"}</button>
        <button type="button" onClick={done} className="btn btn-quiet btn-sm justify-self-start">Skip for now</button>
        {msg && <p role="alert" className="err">{msg}</p>}
      </form>
    );
  }
  const isNew = mode === "new";
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (isNew) signUp(); else signIn(); }} noValidate className="grid gap-4">
      {!compact && <p className="display text-2xl">{isNew ? "Make your account" : "Sign in"}</p>}
      <label className="label">Email<input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@example.com" aria-invalid={!!msg} /></label>
      <label className="label">{isNew ? "Pick a password" : "Password"}<input type="password" required minLength={isNew ? 8 : undefined} autoComplete={isNew ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} className="field" /></label>
      {!isNew && (
        <div className="flex items-center justify-between text-sm">
          <label className="flex min-h-[44px] items-center gap-2 font-semibold"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5 accent-[#b6ef36]" />Remember me</label>
          <button type="button" onClick={forgot} className="btn btn-quiet btn-sm">Forgot it?</button>
        </div>
      )}
      <button disabled={busy} className="btn btn-primary">{busy ? (isNew ? "Making it..." : "Signing in...") : isNew ? "Make my account" : "Sign in"}</button>
      {msg && <p role="alert" className="err">{msg}</p>}
      <p className="hint">
        {isNew ? <>Have one already? <button type="button" className="underline" onClick={() => { setMode("in"); setMsg(""); }}>Sign in</button></>
          : <>New here? <button type="button" className="underline" onClick={() => { setMode("new"); setMsg(""); }}>Make an account</button>. One sign-in for every Cats Can Dance app.</>}
      </p>
    </form>
  );
}
