/**
 * /points: how CCD points work, your balance, spend them on a night, and your invite link (migration 063).
 * Points come only from nights the door can prove, so nothing here can be gamed by tapping buttons.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useMember } from "@/lib/member";
import { sendSignInLink } from "@/lib/plans";
import {
  inviteLink, loadMyPoints, loadPerks, loadPointsNights, loadRules, redeem, tierColour,
  type MyPoints, type Perk, type PointsNight, type Rule, type Tier,
} from "@/lib/points";
import { track } from "@/lib/track";

const btn = "font-display px-4 py-2.5 border-4 border-ink";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "25 Nov" from an ISO date or timestamp. */
const day = (iso: string) => { const [, m, d] = iso.slice(0, 10).split("-").map(Number); return m ? `${d} ${MONTHS[m - 1]}` : iso; };

const RULE_LABEL: Record<string, string> = {
  night: "Every night you get scanned in at",
  referral_inviter: "A friend joins with your link and comes to a night",
  referral_friend: "You join with a friend's link and come to a night",
  crew_mate: "Each crew mate who comes to the same night",
  rating: "Rating a night you were at",
};

export default function PointsPage() {
  const router = useRouter();
  const { loading, signedIn, member } = useMember();
  const [rules, setRules] = useState<Rule[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [perks, setPerks] = useState<Perk[]>([]);
  const invited = typeof router.query.i === "string";
  const night = typeof router.query.night === "string" ? router.query.night : null;

  useEffect(() => {
    loadRules().then((r) => { setRules(r.rules); setTiers(r.tiers); });
    loadPerks(null).then(setPerks);
  }, []);

  return (
    <>
      <SEO title="Points: free tickets for going out | Cats Can Dance"
        description="Every night you get scanned in at earns points, including tickets bought on District, BookMyShow or Skillbox when the door uses Gate. Spend them on a guaranteed spot, a +1 or a free ticket."
        path="/points" />
      <main className="bg-background text-ink min-h-screen">
        <Nav />
        <section className="bg-ink text-cream pt-28 md:pt-36 pb-10">
          <div className="container max-w-4xl">
            <p className="font-bold text-acid-yellow mb-3">Points</p>
            <h1 className="font-display text-6xl md:text-8xl leading-[0.85]">GO OUT. GET IN FREE.</h1>
            <p className="mt-4 text-lg max-w-[52ch]">
              Every night you get scanned in at earns points. That includes tickets you bought on District, BookMyShow or Skillbox when the door runs on Gate.
              Spend points on a guaranteed spot, a +1 or a free ticket to our nights.
            </p>
          </div>
        </section>

        <div className="container max-w-4xl py-10 md:py-14 grid gap-12">
          {night && (
            <div className="border-4 border-ink bg-acid-yellow p-5 chunk-shadow">
              <p className="font-display text-2xl leading-tight">Were you at {night.replace(/-/g, " ")}?</p>
              <p className="mt-1">Sign in with the email on your ticket. If the door scanned you, the points are already there.</p>
            </div>
          )}
          {invited && !member && (
            <div className="border-4 border-ink bg-electric-blue text-cream p-5 chunk-shadow">
              <p className="font-display text-2xl leading-tight">A friend sent you this.</p>
              <p className="mt-1">Join with this link and come to a night. You both get points.</p>
            </div>
          )}

          {loading ? <p>Loading…</p>
            : !signedIn ? <SignInBox />
            : !member ? (
              <div className="border-4 border-ink bg-cream p-5">
                <p className="font-display text-2xl">One step left</p>
                <p className="mt-1">Tell us your name and city and your points start counting.</p>
                <Link href="/me" className={`${btn} bg-acid-yellow inline-block mt-3`}>Finish joining</Link>
              </div>
            )
            : <Mine />}

          <section aria-labelledby="earn" className="grid gap-4">
            <h2 id="earn" className="font-display text-4xl leading-none">HOW YOU EARN</h2>
            <ul className="grid gap-2">
              {rules.sort((a, b) => b.points - a.points).map((r) => (
                <li key={r.key} className="flex justify-between gap-4 border-4 border-ink bg-cream p-3">
                  <span>{RULE_LABEL[r.key] ?? r.note}</span><b className="font-display">{r.points}</b>
                </li>
              ))}
            </ul>
            <p className="text-sm opacity-75">
              Points only come from what the door can prove. An outside ticket you add on a night page shows as waiting until the door scans it.
              If a check-in is undone, its points go too.
            </p>
          </section>

          <section aria-labelledby="spend" className="grid gap-4">
            <h2 id="spend" className="font-display text-4xl leading-none">WHAT YOU GET</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {perks.map((p) => (
                <div key={p.id} className="border-4 border-ink bg-cream p-4 chunk-shadow">
                  <p className="font-display text-2xl leading-tight">{p.title}</p>
                  <p className="text-sm mt-1">{p.description}</p>
                  <p className="font-display mt-3">{p.cost} points</p>
                </div>
              ))}
            </div>
          </section>

          {tiers.length > 0 && (
            <section aria-labelledby="status" className="grid gap-4">
              <h2 id="status" className="font-display text-4xl leading-none">STATUS</h2>
              <p>Status comes from how many nights you went to in the last 12 months.</p>
              <div className="grid md:grid-cols-3 gap-4">
                {tiers.map((t) => (
                  <div key={t.key} className="border-4 border-ink bg-cream">
                    <p className={`font-display text-2xl p-3 border-b-4 border-ink ${tierColour(t.key)}`}>{t.title}</p>
                    <div className="p-3">
                      <p className="text-sm font-bold">{t.min_nights === 0 ? "From your first visit" : `${t.min_nights}+ nights`}</p>
                      <p className="text-sm mt-1">{t.perks}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <Footer />
      </main>
    </>
  );
}

function SignInBox() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <form className="border-4 border-ink bg-cream p-5 chunk-shadow grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await sendSignInLink(email.trim(), window.location.pathname + window.location.search);
        setMsg(r.ok ? "Check your email and open the link on this phone." : r.error ?? "Could not send the link.");
      }}>
      <p className="font-display text-2xl">See your points</p>
      <p>Use the email you book tickets with, so your nights count.</p>
      <div className="flex gap-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
          className="flex-1 min-w-0 border-4 border-ink bg-white p-3" autoCapitalize="none" />
        <button className={`${btn} bg-acid-yellow`}>Send link</button>
      </div>
      {msg && <p className="font-bold" role="status">{msg}</p>}
    </form>
  );
}

function Mine() {
  const [p, setP] = useState<MyPoints | null>(null);
  const [nights, setNights] = useState<PointsNight[]>([]);
  const [slug, setSlug] = useState<string>("");
  const [perks, setPerks] = useState<Perk[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = async () => setP(await loadMyPoints());
  useEffect(() => { refresh(); loadPointsNights().then((n) => { setNights(n); if (n[0]) setSlug(n[0].slug); }); }, []);
  useEffect(() => { if (slug) loadPerks(slug).then(setPerks); }, [slug, p?.balance]);

  const chosen = useMemo(() => nights.find((n) => n.slug === slug) ?? null, [nights, slug]);
  if (!p) return <p>Loading your points…</p>;
  const link = inviteLink(p.ref_code);

  const take = async (perk: Perk) => {
    if (!chosen) return;
    setBusy(perk.id); setMsg(""); setCode(null);
    const r = await redeem(perk.id, chosen.slug);
    setBusy(null);
    if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
    track("points_redeem", { perk: perk.id });
    if (r.result?.code) { setCode(r.result.code); setMsg(`Your free ticket for ${chosen.title}. Use this code at checkout on the night page.`); }
    else if (r.result?.on_list) setMsg(`You're on the list for ${chosen.title}.`);
    else if (r.result?.plus_ones) setMsg(`Done. You can bring ${r.result.plus_ones} ${r.result.plus_ones === 1 ? "guest" : "guests"} to ${chosen.title}.`);
    refresh();
  };

  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); track("share", { kind: "invite", channel: "copy" }); } catch {} };

  return (
    <div className="grid gap-8">
      <div className="border-4 border-ink bg-cream chunk-shadow">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b-4 border-ink">
          <p><span className="font-display text-6xl leading-none">{p.balance}</span> points</p>
          <span className={`font-display px-3 py-1 border-4 border-ink ${tierColour(p.tier)}`}>{p.tier_title}</span>
        </div>
        <div className="p-5 grid gap-2 text-sm">
          {p.pending > 0 && <p>+{p.pending} waiting for the door to scan your outside ticket.</p>}
          <p>{p.nights_12m} {p.nights_12m === 1 ? "night" : "nights"} in the last 12 months.{p.next_tier_title && p.nights_to_next != null ? ` ${p.nights_to_next} more to ${p.next_tier_title}.` : ""}</p>
          {p.tier_perks && <p>{p.tier_title}: {p.tier_perks}</p>}
        </div>
      </div>

      <section aria-labelledby="use" className="grid gap-4">
        <h2 id="use" className="font-display text-4xl leading-none">USE YOUR POINTS</h2>
        {nights.length === 0 ? <p>No nights open yet. Points keep until the next one.</p> : (
          <>
            <label className="grid gap-1">
              <span className="font-bold">Night</span>
              <select value={slug} onChange={(e) => { setSlug(e.target.value); setMsg(""); setCode(null); }} className="border-4 border-ink bg-white p-3">
                {nights.map((n) => <option key={n.slug} value={n.slug}>{n.title} · {day(n.event_date)}{n.full ? " · full" : ""}</option>)}
              </select>
            </label>
            <ul className="grid gap-2">
              {perks.map((perk) => {
                const freeNight = chosen && !chosen.paid && perk.kind === "free_ticket";
                const can = perk.affordable && perk.tier_ok && perk.left !== 0 && !freeNight;
                const why = freeNight ? "This night is free already" : !perk.tier_ok ? "Unlocks at a higher status" : perk.left === 0 ? "All taken for this night" : !perk.affordable ? `${perk.cost - p.balance} more points` : "";
                return (
                  <li key={perk.id} className="flex flex-wrap items-center justify-between gap-3 border-4 border-ink bg-cream p-3">
                    <div>
                      <p className="font-display text-xl leading-tight">{perk.title} · {perk.cost}</p>
                      <p className="text-sm">{perk.description}{perk.left != null ? ` ${perk.left} left.` : ""}</p>
                      {why && <p className="text-sm opacity-75">{why}</p>}
                    </div>
                    <button type="button" disabled={!can || busy === perk.id} onClick={() => take(perk)} className={`${btn} bg-acid-yellow disabled:opacity-40`}>
                      {busy === perk.id ? "…" : "Use points"}
                    </button>
                  </li>
                );
              })}
            </ul>
            {msg && <p className="font-bold" role="status">{msg}</p>}
            {code && <p className="font-mono text-2xl select-all border-4 border-ink bg-white p-3 w-fit">{code}</p>}
            {chosen && <Link href={`/nights/${chosen.slug}`} className="underline w-fit">Open {chosen.title}</Link>}
          </>
        )}
      </section>

      <section aria-labelledby="invite" className="grid gap-3">
        <h2 id="invite" className="font-display text-4xl leading-none">BRING A FRIEND</h2>
        <p>When a friend joins with your link and comes to a night, you both get points. {p.friends_joined > 0 ? `${p.friends_joined} joined so far, ${p.friends_came} came.` : ""}</p>
        <div className="flex gap-2 flex-wrap">
          <input readOnly value={link} className="flex-1 min-w-0 border-4 border-ink bg-white p-3 font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={copy} className={`${btn} bg-acid-yellow`}>{copied ? "Copied" : "Copy"}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Come to a Cats Can Dance night with me. Join here and we both get points: ${link}`)}`}
            target="_blank" rel="noreferrer" className={`${btn} bg-cream`}>WhatsApp</a>
        </div>
      </section>

      {p.activity.length > 0 && (
        <section aria-labelledby="activity" className="grid gap-3">
          <h2 id="activity" className="font-display text-4xl leading-none">ACTIVITY</h2>
          <ul className="border-4 border-ink bg-cream divide-y-2 divide-ink">
            {p.activity.map((a, i) => (
              <li key={i} className="flex justify-between gap-4 p-3 text-sm">
                <span>{a.label}{a.status === "pending" ? " (waiting for the door)" : ""}{a.at ? <span className="opacity-60"> · {day(a.at)}</span> : null}</span>
                <b className={a.points < 0 ? "text-magenta" : ""}>{a.points > 0 ? `+${a.points}` : a.points}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
