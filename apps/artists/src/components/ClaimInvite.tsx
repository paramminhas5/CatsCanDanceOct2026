"use client";
/** Reads the invite (claim_invite_info) and claims it for the signed-in member (claim_with_invite). */
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";

type Info = { ok?: boolean; slug?: string; name?: string; valid?: boolean; reason?: "used" | "expired" | "owned" | null };

export default function ClaimInvite({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.rpc("claim_invite_info", { p_token: token }).then(({ data }) => setInfo((data as Info) ?? { ok: false }));
    sb.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, [token]);
  const claim = async () => {
    const { data, error } = await supabaseBrowser().rpc("claim_with_invite", { p_token: token });
    const d = data as { ok?: boolean; error?: string; slug?: string } | null;
    if (error || !d?.ok) { setErr(d?.error ?? error?.message ?? "Could not claim. Ask us for a new link."); return; }
    setDone(d.slug ?? info?.slug ?? "");
  };
  if (!info) return <p className="k-b" aria-busy="true">Checking the link</p>;
  if (!info.ok || !info.valid) {
    return <div className="grid gap-3"><h1 className="k-d text-[44px]">{info.reason === "owned" ? "This page already has an owner." : "This link has been used or has run out."}</h1><p className="k-b">Write to hello@catscandance.com and we will send a new one.</p></div>;
  }
  if (done !== null) {
    return <div className="grid gap-4" role="status"><h1 className="k-d text-[44px]">It is yours.</h1><p className="k-b">Set your rates and dates, and answer bookings.</p><Link className="k-btn k-btn--key self-start" href="/me">Open your page</Link></div>;
  }
  return (
    <div className="grid gap-4">
      <span className="k-m">Claim invite</span>
      <h1 className="k-d text-[44px] md:text-[64px]">{info.name ?? "Your page"}</h1>
      <p className="k-b">Claim this page to answer bookings, post tours and see your fans. Sign in with your email first.</p>
      {err && <p className="k-note k-note--warn" role="alert">{err}</p>}
      {signedIn ? <button className="k-btn k-btn--key k-btn--l self-start" onClick={claim}>Claim it</button> : <Link className="k-btn k-btn--key k-btn--l self-start" href={`/sign-in?next=/claim/${token}`}>Sign in to claim</Link>}
    </div>
  );
}
