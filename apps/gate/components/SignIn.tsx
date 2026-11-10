"use client";
/**
 * Sign in to Host (canvas board SignIn): email and password with Remember me. "Make an account" checks the
 * email once with a 6-digit code; "Forgot it?" signs in with a code and sets a new password. One sign-in
 * covers every Cats Can Dance app. Shared logic: @ccd/auth signin.ts.
 */
import { useEffect, useRef, useState } from "react";
import { signInPassword, signUpPassword, sendCode, verifyCode, setPassword } from "@ccd/auth";
import { supabase } from "@/lib/supabase/browser";

type Mode = "in" | "new" | "code" | "setpw";
const lnk: React.CSSProperties = { background: "none", border: 0, color: "inherit", minHeight: 44, cursor: "pointer", padding: 0, font: "inherit", textDecoration: "underline" };

export default function SignIn({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("in");
  const [why, setWhy] = useState<"new" | "forgot">("forgot");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const redirect = typeof window === "undefined" ? next : `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  useEffect(() => { if (mode === "code") codeRef.current?.focus(); }, [mode]);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(null); try { await fn(); } finally { setBusy(false); } };
  const done = () => window.location.assign(next);
  const signIn = () => run(async () => { const r = await signInPassword(supabase(), email, pw, remember); if (!r.ok) setErr(r.error); else done(); });
  const signUp = () => run(async () => {
    const r = await signUpPassword(supabase(), email, pw, redirect);
    if (!r.ok) { setErr(r.error); return; }
    if (r.next === "in") done(); else { setWhy("new"); setMode("code"); setWait(45); }
  });
  const forgot = () => run(async () => { const r = await sendCode(supabase(), email, redirect); if (!r.ok) setErr(r.error); else { setWhy("forgot"); setCode(""); setMode("code"); setWait(45); } });
  const check = (c: string) => run(async () => {
    const r = await verifyCode(supabase(), email, c, remember);
    if (!r.ok) { setErr(r.error); return; }
    if (why === "forgot") { setPw(""); setMode("setpw"); } else done();
  });
  const savePw = () => run(async () => { const r = await setPassword(supabase(), pw); if (!r.ok) setErr(r.error); else done(); });

  if (mode === "code") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); check(code); }}>
        <p style={{ margin: "0 0 12px", fontSize: 15 }}>We sent a 6-digit code to <b>{email}</b>.{why === "forgot" ? " Then you pick a new password." : ""}</p>
        <label style={{ display: "block" }}><span className="m">The code</span>
          <input ref={codeRef} className="fld" value={code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" placeholder="000000"
            style={{ textAlign: "center", fontSize: 28, letterSpacing: ".4em", fontFamily: "var(--mono, monospace)" }}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 8); setCode(v); if (v.length === 6) check(v); }} aria-invalid={!!err} />
        </label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="key" disabled={busy || code.length < 6} style={{ width: "100%", marginTop: 16 }}>{busy ? "Checking" : "Continue"}</button>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 14 }}>
          <button type="button" style={lnk} onClick={() => { setMode("in"); setErr(null); }}>Back</button>
          {wait > 0 ? <span className="m" style={{ alignSelf: "center" }}>New code in 0:{String(wait).padStart(2, "0")}</span> : <button type="button" style={lnk} onClick={forgot}>Send a new code</button>}
        </div>
      </form>
    );
  }
  if (mode === "setpw") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); savePw(); }}>
        <p style={{ margin: "0 0 12px", fontSize: 15 }}>You&rsquo;re in. Pick a password, and next time it&rsquo;s just your email and this.</p>
        <label style={{ display: "block" }}><span className="m">New password</span><input className="fld" type="password" minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="8 characters or more" /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="key" disabled={busy} style={{ width: "100%", marginTop: 16 }}>{busy ? "Saving" : "Save and continue"}</button>
        <button type="button" style={{ ...lnk, marginTop: 8, fontSize: 14 }} onClick={done}>Skip for now</button>
      </form>
    );
  }
  const isNew = mode === "new";
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (isNew) signUp(); else signIn(); }}>
      <label style={{ display: "block" }}><span className="m">Email</span><input className="fld" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label style={{ display: "block", marginTop: 12 }}><span className="m">{isNew ? "Pick a password" : "Password"}</span><input className="fld" type="password" required minLength={isNew ? 8 : undefined} autoComplete={isNew ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      {!isNew && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontWeight: 600 }}><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 20, height: 20, accentColor: "#FFE600" }} />Remember me</label>
          <button type="button" style={lnk} onClick={forgot}>Forgot it?</button>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <button className="key" disabled={busy} style={{ width: "100%", marginTop: 12 }}>{busy ? (isNew ? "Making it" : "Signing in") : isNew ? "Make my account" : "Sign in"}</button>
      <p style={{ marginTop: 14, fontSize: 14, opacity: 0.8 }}>
        {isNew ? <>Have one already? <button type="button" style={lnk} onClick={() => { setMode("in"); setErr(null); }}>Sign in</button></>
          : <>New here? <button type="button" style={lnk} onClick={() => { setMode("new"); setErr(null); }}>Make an account</button>. One sign-in for every Cats Can Dance app.</>}
      </p>
    </form>
  );
}
