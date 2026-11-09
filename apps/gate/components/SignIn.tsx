"use client";
/** Email link sign-in. One sign-in covers every Cats Can Dance product. */
import { useState } from "react";
import { sendSignInLink } from "@/lib/member";

export default function SignIn({ next }: { next: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setState("busy"); setErr(null);
    const r = await sendSignInLink(email, next);
    if (r.ok) setState("sent"); else { setErr(r.error ?? "Could not send."); setState("idle"); }
  };
  if (state === "sent") return <p role="status" className="k-note">Check your email. The link signs you in here and on Nights and Artists.</p>;
  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="k-label">Email<input className="k-field" type="email" name="email" required autoComplete="email" /></label>
      {err && <p className="k-note k-note--warn m-0" role="alert">{err}</p>}
      <button className="k-btn k-btn--key k-btn--l" disabled={state === "busy"}>{state === "busy" ? "Sending" : "Email me a link"}</button>
    </form>
  );
}
