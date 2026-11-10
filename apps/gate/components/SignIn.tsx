"use client";
/**
 * Sign in with a 6-digit code from your email. One sign-in covers every Cats Can Dance product.
 * The email also carries a link, for the same phone.
 */
import { useEffect, useRef, useState } from "react";
import { sendSignInLink, verifySignInCode } from "@/lib/member";

export default function SignIn({ next }: { next: string }) {
  const [state, setState] = useState<"idle" | "busy" | "code">("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (state === "code") codeRef.current?.focus(); }, [state]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const em = (e ? String(new FormData(e.currentTarget).get("email") ?? "") : email).trim().toLowerCase();
    setEmail(em); setState("busy"); setErr(null);
    const r = await sendSignInLink(em, next);
    if (r.ok) { setState("code"); setWait(45); } else { setErr(r.error ?? "Could not send."); setState(e ? "idle" : "code"); }
  };
  const verify = async (c: string) => {
    setErr(null);
    const r = await verifySignInCode(email, c);
    if (r.ok) window.location.assign(next); else setErr(r.error ?? "That code did not work.");
  };

  if (state === "code") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); verify(code); }}>
        <p style={{ margin: "0 0 12px", fontSize: 15 }}>We sent a 6-digit code to <b>{email}</b>. It signs you in here and on Nights and Artists.</p>
        <label style={{ display: "block" }}><span className="m">The code</span>
          <input ref={codeRef} className="fld" value={code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" placeholder="000000"
            style={{ textAlign: "center", fontSize: 28, letterSpacing: ".4em", fontFamily: "var(--mono, monospace)" }}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 8); setCode(v); if (v.length === 6) verify(v); }} aria-invalid={!!err} />
        </label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="key" disabled={code.length < 6} style={{ width: "100%", marginTop: 16 }}>Sign in</button>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 14 }}>
          <button type="button" className="m" onClick={() => { setState("idle"); setCode(""); setErr(null); }} style={{ background: "none", border: 0, color: "inherit", minHeight: 44, cursor: "pointer" }}>Use another email</button>
          {wait > 0 ? <span className="m" style={{ alignSelf: "center" }}>New code in 0:{String(wait).padStart(2, "0")}</span>
            : <button type="button" className="m" onClick={() => send()} style={{ background: "none", border: 0, color: "inherit", minHeight: 44, cursor: "pointer" }}>Send a new code</button>}
        </div>
      </form>
    );
  }
  return (
    <form onSubmit={send}>
      <label style={{ display: "block" }}><span className="m">Email</span><input className="fld" type="email" name="email" required autoComplete="email" defaultValue={email} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="key" disabled={state === "busy"} style={{ width: "100%", marginTop: 16 }}>{state === "busy" ? "Sending" : "Email me a code"}</button>
    </form>
  );
}
