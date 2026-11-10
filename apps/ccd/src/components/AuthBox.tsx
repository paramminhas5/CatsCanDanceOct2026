/**
 * Sign in on Nights (canvas board SignIn; Param, 10 Nov 2026: email and password with remember me, people
 * don't want to keep signing in). Email and password is the everyday path. "Make an account" checks the email
 * once with a 6-digit code. "Forgot it?" signs in with a code and then sets a new password.
 * The same flow runs in Artists and Host through @ccd/auth.
 */
import { useEffect, useRef, useState } from "react";
import { signInPassword, signUpPassword, sendCode, verifyCode, setPassword } from "@ccd/auth/signin";
import { supabase } from "@/lib/supabase";
import { refreshMe } from "@/lib/plans";

type Mode = "in" | "new" | "code" | "setpw";

export default function AuthBox({ next, onDone, onStart, dark = false, start = "in" }: { next: string; onDone?: () => void; onStart?: () => void; dark?: boolean; start?: Mode }) {
  const [mode, setMode] = useState<Mode>(start);
  const [why, setWhy] = useState<"new" | "forgot">("forgot");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const redirect = typeof window === "undefined" ? next : `${window.location.origin}${next}`;

  useEffect(() => { try { const b = JSON.parse(localStorage.getItem("ccd:buyer") ?? "null"); if (b?.email) setEmail(b.email); } catch { /* no saved buyer */ } }, []);
  useEffect(() => { if (mode === "code") codeRef.current?.focus(); }, [mode]);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const done = async () => { await refreshMe(); if (onDone) onDone(); else window.location.assign(next); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(""); try { await fn(); } finally { setBusy(false); } };

  const signIn = () => run(async () => {
    onStart?.();
    const r = await signInPassword(supabase, email, pw, remember);
    if (!r.ok) { setErr(r.error); return; }
    await done();
  });
  const signUp = () => run(async () => {
    onStart?.();
    const r = await signUpPassword(supabase, email, pw, redirect);
    if (!r.ok) { setErr(r.error); return; }
    if (r.next === "in") { await done(); return; }
    setWhy("new"); setMode("code"); setWait(45);
  });
  const forgot = () => run(async () => {
    const r = await sendCode(supabase, email, redirect);
    if (!r.ok) { setErr(r.error); return; }
    setWhy("forgot"); setCode(""); setMode("code"); setWait(45);
  });
  const check = (c: string) => run(async () => {
    const r = await verifyCode(supabase, email, c, remember);
    if (!r.ok) { setErr(r.error); return; }
    if (why === "forgot") { setPw(""); setMode("setpw"); return; }
    await done();
  });
  const savePw = () => run(async () => {
    const r = await setPassword(supabase, pw);
    if (!r.ok) { setErr(r.error); return; }
    await done();
  });

  const sub = dark ? "text-cream/80" : "text-ink/75";
  const field = "w-full border-4 border-ink bg-white text-ink p-3 text-base";
  const key = "w-full font-display text-lg py-3 border-4 border-ink bg-acid-yellow text-ink disabled:opacity-60";
  const link = `underline min-h-[44px] ${dark ? "text-cream" : "text-ink"}`;

  if (mode === "code") {
    return (
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); check(code); }}>
        <p className="font-display text-xl leading-tight">Check your email.</p>
        <p className={`text-sm ${sub}`}>We sent a 6-digit code to <b>{email}</b>.{why === "forgot" ? " Then you pick a new password." : ""}</p>
        <input ref={codeRef} value={code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" placeholder="000000" aria-label="The code" aria-invalid={!!err}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 8); setCode(v); if (v.length === 6) check(v); }}
          className="w-full border-4 border-ink bg-white text-ink p-3 text-center font-mono text-3xl tracking-[0.5em]" />
        <button disabled={busy || code.length < 6} className={key}>{busy ? "Checking…" : "Continue"}</button>
        <div className={`flex justify-between text-sm ${sub}`}>
          <button type="button" className={link} onClick={() => { setMode("in"); setErr(""); }}>Back</button>
          {wait > 0 ? <span className="self-center">New code in 0:{String(wait).padStart(2, "0")}</span> : <button type="button" className={link} onClick={forgot}>Send a new code</button>}
        </div>
        {err && <p role="alert" className="text-sm font-bold text-magenta">{err}</p>}
      </form>
    );
  }
  if (mode === "setpw") {
    return (
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); savePw(); }}>
        <p className="font-display text-xl leading-tight">You're in. Pick a password.</p>
        <p className={`text-sm ${sub}`}>Next time it's just your email and this.</p>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={8} placeholder="8 characters or more" className={field} aria-label="New password" />
        <button disabled={busy} className={key}>{busy ? "Saving…" : "Save and continue"}</button>
        <button type="button" className={`${link} justify-self-start text-sm`} onClick={() => done()}>Skip for now</button>
        {err && <p role="alert" className="text-sm font-bold text-magenta">{err}</p>}
      </form>
    );
  }
  const isNew = mode === "new";
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (isNew) signUp(); else signIn(); }}>
      <label className="grid gap-1 text-sm font-bold">Email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" className={`${field} font-normal`} />
      </label>
      <label className="grid gap-1 text-sm font-bold">{isNew ? "Pick a password" : "Password"}
        <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={isNew ? "new-password" : "current-password"} minLength={isNew ? 8 : undefined} className={`${field} font-normal`} />
      </label>
      {!isNew && (
        <div className="flex items-center justify-between text-sm">
          <label className="flex min-h-[44px] items-center gap-2 font-bold"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5 accent-[#2563eb]" />Remember me</label>
          <button type="button" className={link} onClick={forgot}>Forgot it?</button>
        </div>
      )}
      <button disabled={busy} className={key}>{busy ? (isNew ? "Making it…" : "Signing in…") : isNew ? "Make my account" : "Sign in"}</button>
      <p className={`text-sm ${sub}`}>
        {isNew ? <>Have one already? <button type="button" className={link} onClick={() => { setMode("in"); setErr(""); }}>Sign in</button></>
          : <>New here? <button type="button" className={link} onClick={() => { setMode("new"); setErr(""); }}>Make an account</button>. One sign-in for Nights, Artists, Host and School.</>}
      </p>
      {err && <p role="alert" className="text-sm font-bold text-magenta">{err}</p>}
    </form>
  );
}
