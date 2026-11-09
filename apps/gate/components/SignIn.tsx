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
  if (state === "sent") return <div role="status" className="sf rise" style={{ padding: "14px 16px", borderRadius: 16, fontSize: 15 }}>Check your email. The link signs you in here and on Nights and Artists.</div>;
  return (
    <form onSubmit={submit}>
      <label style={{ display: "block" }}><span className="m">Email</span><input className="fld" type="email" name="email" required autoComplete="email" /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="key" disabled={state === "busy"} style={{ width: "100%", marginTop: 16 }}>{state === "busy" ? "Sending" : "Email me a link"}</button>
    </form>
  );
}
