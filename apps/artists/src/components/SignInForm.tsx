"use client";
import { useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";

/** Email in, magic link out. The link lands on /auth/callback, which sets the shared session cookie. */
export default function SignInForm({ next, error, compact = false }: { next: string; error?: string | null; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
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
      if (err) { setState("error"); setMsg("Could not send the link. Try again in a minute."); return; }
      setState("sent");
    } catch {
      setState("error"); setMsg("Could not reach the sign-in service.");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="grid gap-2">
        <p className="display text-2xl">Check your email.</p>
        <p className="text-graphite">The link brings you back here, signed in. It works once and expires in an hour.</p>
        <button type="button" onClick={() => setState("idle")} className="btn btn-quiet btn-sm justify-self-start">Use another email</button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {!compact && <p className="display text-2xl">Email me a link</p>}
      <label className="label">
        Email
        <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@example.com" aria-invalid={!!msg} />
      </label>
      <button disabled={state === "busy"} className="btn btn-primary">{state === "busy" ? "Sending..." : "Send the link"}</button>
      {msg && <p role="alert" className="err">{msg}</p>}
      <p className="hint">By signing in you agree to hear from Cats Can Dance about your bookings. Nothing else.</p>
    </form>
  );
}
