/**
 * /claim/[token]: an artist opens the link we sent, signs in with an email link, and their page is theirs.
 * One step for them: sign in (if needed), then "Claim my page". Uses claim_invite_info and claim_with_invite (migration 048).
 */
import { track } from "@/lib/track";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import DeskShell, { btn, btnAlt, field } from "@/components/booking/DeskShell";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/member";
import { sendSignInLink } from "@/lib/plans";

type Info = { ok: boolean; slug?: string; name?: string; photo_url?: string | null; valid?: boolean; reason?: string | null };

export default function Claim() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const { loading, signedIn } = useMember();
  const [info, setInfo] = useState<Info | null>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) { if (router.isReady) setInfo({ ok: false }); return; }
    supabase.rpc("claim_invite_info", { p_token: token }).then(({ data }) => setInfo((data as Info) ?? { ok: false }), () => setInfo({ ok: false }));
  }, [token, router.isReady]);

  const claim = async () => {
    setState("busy"); setErr("");
    const { data, error } = await supabase.rpc("claim_with_invite", { p_token: token });
    const d = data as { ok: boolean; error?: string } | null;
    if (error || !d?.ok) { setState("error"); setErr(d?.error ?? error?.message ?? "Could not claim. Try again."); return; }
    setState("done");
    track("claim");
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy"); setErr("");
    const r = await sendSignInLink(email.trim().toLowerCase(), `/claim/${token}`);
    if (r.ok) setState("sent"); else { setState("error"); setErr(r.error ?? "Could not send the link."); }
  };

  const name = info?.name ?? "your page";
  return (
    <DeskShell title="Claim your page" eyebrow="For artists" heading="CLAIM YOUR PAGE." path={`/claim/${token}`}>
      {!info || loading ? (
        <div className="h-40 border-4 border-ink/20 bg-ink/5" aria-busy="true" />
      ) : !info.ok ? (
        <div className="border-4 border-ink bg-cream p-6 max-w-xl grid gap-3">
          <p className="font-display text-2xl">This link is not valid.</p>
          <p>Ask us for a new one at <a className="underline font-bold" href="mailto:hello@catscandance.com">hello@catscandance.com</a>.</p>
        </div>
      ) : state === "done" ? (
        <div className="border-4 border-ink bg-acid-yellow p-6 md:p-8 max-w-xl grid gap-4 chunk-shadow">
          <p className="font-display text-3xl leading-tight">{name} is yours.</p>
          <p>Set your rates and travel, mark the dates you're free, and answer booking requests. Fix anything on the page we got wrong and we'll update it.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/club/artist" className={btn}>Open your desk</Link>
            <Link href={`/artists/${info.slug}`} className={btnAlt}>See your page</Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start max-w-3xl">
          {info.photo_url ? <img src={info.photo_url} alt="" className="w-32 h-32 md:w-40 md:h-40 object-cover border-4 border-ink" /> : <span className="w-32 h-32 border-4 border-ink bg-electric-blue" />}
          <div className="grid gap-4">
            <p className="font-display text-3xl md:text-4xl leading-none">{info.name}</p>
            {!info.valid ? (
              <p className="font-bold">{info.reason === "owned" ? "This page already has an owner." : info.reason === "used" ? "This link was already used." : "This link has expired."} Write to <a className="underline" href="mailto:hello@catscandance.com">hello@catscandance.com</a>.</p>
            ) : signedIn ? (
              <>
                <p>Your page is built from your releases, gigs and press, each with its source. Claim it to take bookings, post tour dates and fix anything.</p>
                <button type="button" onClick={claim} disabled={state === "busy"} className={`${btn} justify-self-start`}>{state === "busy" ? "Claiming…" : "Claim my page"}</button>
              </>
            ) : state === "sent" ? (
              <p className="font-bold">Check your email. The link brings you back here, signed in.</p>
            ) : (
              <form onSubmit={send} className="grid gap-3 max-w-md">
                <p>Sign in with the email you want booking requests to go to.</p>
                <label className="grid gap-1 text-sm font-bold">Email
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} autoComplete="email" />
                </label>
                <button className={`${btn} justify-self-start`} disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Email me a sign-in link"}</button>
              </form>
            )}
            {err && <p className="text-sm font-bold text-magenta">{err}</p>}
          </div>
        </div>
      )}
    </DeskShell>
  );
}
