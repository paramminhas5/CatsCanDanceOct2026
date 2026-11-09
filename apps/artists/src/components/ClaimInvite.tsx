"use client";
/** Reads the invite (claim_invite_info) and claims it for the signed-in member (claim_with_invite). */
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";
import ShareProfile from "@/components/ShareProfile";

const GETS = [
  ["Fans", "See who follows you and where they are, and pin up to three fan notes"],
  ["Your story", "Fix a fact, add an era, change your photo and links"],
  ["Dates", "Post a tour or open dates; promoters in each city see them"],
  ["Bookings", "Take asks with your rate and answer in the app or on WhatsApp"],
  ["Your shop", "Sell records and merch from your page (coming next)"],
] as const;

type Info = { ok?: boolean; slug?: string; name?: string; valid?: boolean; reason?: "used" | "expired" | "owned" | null };

export default function ClaimInvite({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.rpc("claim_invite_info", { p_token: token }).then(({ data }: { data: unknown }) => setInfo((data as Info) ?? { ok: false }));
    sb.auth.getUser().then(({ data }: { data: { user: unknown } }) => setSignedIn(!!data.user));
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
    const slug = done || info.slug || "";
    return (
      <div className="cl-grid" role="status">
        {slug && <Card slug={slug} name={info.name ?? ""} />}
        <div className="grid content-start gap-4">
          <span className="k-m">Done</span>
          <h1 className="k-d text-[44px] md:text-[64px]">It is yours. Share it.</h1>
          <p className="k-b text-[17px]">Your eras and records on one card, ready for your story. The link opens your page.</p>
          <div className="flex flex-wrap gap-3">{slug && <ShareProfile slug={slug} name={info.name ?? ""} owner />}<Link className="k-btn k-btn--key k-btn--l" href="/me">Open your side</Link></div>
        </div>
      </div>
    );
  }
  return (
    <div className="cl-grid">
      {info.slug && <Card slug={info.slug} name={info.name ?? ""} />}
      <div className="grid content-start gap-4">
        <span className="k-m">Your page is ready</span>
        <h1 className="k-d text-[44px] md:text-[72px]">{info.name ?? "Your page"}</h1>
        <p className="k-b text-[17px]">We built it from your releases, your shows and what has been written about you. Every fact has a source. Claim it and it is yours to run.</p>
        <ul className="cl-gets list-none p-0">{GETS.map(([k, v]) => <li key={k}><b>{k}</b><span className="k-b">{v}</span></li>)}</ul>
        {err && <p className="k-note k-note--warn" role="alert">{err}</p>}
        <div className="flex flex-wrap gap-3">
          {signedIn ? <button className="k-btn k-btn--key k-btn--l" onClick={claim}>Claim it</button> : <Link className="k-btn k-btn--key k-btn--l" href={`/sign-in?next=/claim/${token}`}>Sign in to claim</Link>}
          {info.slug && <Link className="k-btn k-btn--ghost k-btn--l" href={`/${info.slug}`}>See your page</Link>}
        </div>
        <p className="k-b text-sm">Free. Nothing changes on your page until you change it.</p>
      </div>
    </div>
  );
}

function Card({ slug, name }: { slug: string; name: string }) {
  return (
    <div className="sp-card cl-card">
      <span className="k-m">Drawing your card</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/card/profile/${slug}?size=story`} alt={`${name}: eras and records on one card`} />
    </div>
  );
}
