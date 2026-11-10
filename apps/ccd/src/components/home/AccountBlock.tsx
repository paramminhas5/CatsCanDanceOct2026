/**
 * Your account: what one login holds across the three products, and the sign-in form.
 * Signing in emails a 6-digit code (SignInCode), the same as the Going sheet. Signed-in visitors get a link to /me.
 */
import { useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import catRight from "@/assets/cat-right.svg";
import { imgUrl } from "@/lib/img";
import { sendSignInLink, useMe } from "@/lib/plans";
import SignInCode from "@/components/SignInCode";

const GETS: { name: string; head: string; dot: string; items: string[] }[] = [
  { name: "Nights", head: "bg-electric-blue text-cream", dot: "bg-electric-blue", items: ["Tickets and QR codes for our Episodes", "Nights you are going to, saved and in your calendar", "Your crew for each night, with the meet point and chat"] },
  { name: "Artists", head: "bg-acid-yellow text-ink", dot: "bg-acid-yellow", items: ["Artists you follow", "Booking requests you have sent, and the replies", "Your own artist page, if you are an artist"] },
  { name: "School", head: "bg-magenta text-cream", dot: "bg-magenta", items: ["Opens with the same email", "Your lessons, tracks and streak, saved in School", "One login across both is on the way"] },
];

export default function AccountBlock() {
  const me = useMe();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 35%"] });
  const x = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["120%", "0%"]);
  const rot = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [20, 0]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setState("error"); setErr("That email doesn't look right."); return; }
    setState("busy");
    const r = await sendSignInLink(email.trim().toLowerCase(), "/me");
    if (r.ok) setState("sent");
    else { setState("error"); setErr(r.error ?? "Could not send the code."); }
  };

  return (
    <section id="join" ref={ref} className="relative bg-electric-blue text-cream border-b-4 border-ink py-14 md:py-24 overflow-hidden">
      <motion.div style={{ x, rotate: rot }} className="absolute -right-5 -bottom-8 w-32 md:w-52 pointer-events-none" aria-hidden>
        <img src={imgUrl(catRight)} alt="" className="wiggle w-full drop-shadow-[6px_6px_0_hsl(var(--ink))]" />
      </motion.div>
      <div className="container relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-10">
          <div>
            <p className="font-display text-acid-yellow text-xs md:text-sm uppercase tracking-[0.2em] mb-3">Your account</p>
            <h2 className="font-display text-[2.6rem] sm:text-6xl md:text-7xl leading-[0.92] drop-shadow-[6px_6px_0_hsl(var(--ink))]">Sign in<br />once.</h2>
          </div>
          <p className="text-cream/90 text-base md:text-lg max-w-[36ch]">Your tickets, the nights you're going to, your crew, the artists you follow and your booking requests, on your phone and your laptop.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 md:gap-6 my-8 md:my-10">
          {GETS.map((g) => (
            <div key={g.name} className="border-4 border-ink bg-cream text-ink shadow-[6px_6px_0_0_hsl(var(--ink))]">
              <div className={`font-display text-base md:text-lg px-4 py-2.5 border-b-4 border-ink ${g.head}`}>{g.name}</div>
              <ul className="p-4 pb-2">
                {g.items.map((t) => (
                  <li key={t} className="flex gap-2 text-sm leading-snug mb-2"><span className={`shrink-0 w-2 h-2 mt-1.5 border-2 border-ink ${g.dot}`} aria-hidden />{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {me.signedIn ? (
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/me" className="bg-magenta text-cream font-display px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform">Open your account</Link>
            <span className="text-sm text-cream/85">You're signed in.</span>
          </div>
        ) : state === "sent" ? (
          <div className="max-w-md border-4 border-ink bg-cream text-ink p-5"><SignInCode email={email.trim().toLowerCase()} next="/me" onBack={() => setState("idle")} /></div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-[760px]">
            <label className="flex-1 text-xs font-bold uppercase tracking-[0.12em]">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                className="block w-full mt-1.5 bg-cream text-ink border-4 border-ink px-4 py-3.5 text-base font-medium normal-case tracking-normal placeholder:text-ink/50 focus:outline-none focus:bg-acid-yellow"
              />
            </label>
            <button type="submit" disabled={state === "busy"} className="bg-magenta text-cream font-display px-6 py-3.5 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform disabled:opacity-60">
              {state === "busy" ? "Sending…" : "Email me a code"}
            </button>
          </form>
        )}
        {state === "error" && <p className="mt-2 text-sm font-semibold">{err}</p>}
        <p className="mt-3 text-sm text-cream/80">No password. Bought a ticket already? Your account is made, use the same email.</p>
      </div>
    </section>
  );
}
