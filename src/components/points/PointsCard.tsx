/**
 * Points on /me: balance, status, the next status, and the invite link. Also claims a friend's invite
 * the first time a new member lands here after joining (claim_referral, migration 063).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { claimPendingInvite, inviteLink, loadMyPoints, tierColour, type MyPoints } from "@/lib/points";
import { track } from "@/lib/track";

export default function PointsCard() {
  const [p, setP] = useState<MyPoints | null>(null);
  const [inviter, setInviter] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const who = await claimPendingInvite();
      if (who) { setInviter(who); track("invite_join"); }
      setP(await loadMyPoints());
    })();
  }, []);

  if (!p) return null;
  const link = inviteLink(p.ref_code);

  const invite = async () => {
    const text = "Come to a Cats Can Dance night with me. Join with my link and we both get points toward free tickets.";
    try {
      if (navigator.share) { await navigator.share({ text, url: link }); track("share", { kind: "invite", channel: "sheet" }); return; }
    } catch { return; }
    try { await navigator.clipboard.writeText(link); setCopied(true); track("share", { kind: "invite", channel: "copy" }); } catch {}
  };

  return (
    <section aria-labelledby="points" className="border-4 border-ink bg-cream chunk-shadow">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b-4 border-ink">
        <h2 id="points" className="font-display text-3xl leading-none">YOUR POINTS</h2>
        <span className={`font-display px-3 py-1 border-4 border-ink ${tierColour(p.tier)}`}>{p.tier_title}</span>
      </div>
      <div className="p-5 grid gap-4">
        {inviter && <p className="font-bold">You joined with {inviter}'s link. Your first night checked in gives you both points.</p>}
        <div className="flex flex-wrap items-end gap-6">
          <p><span className="font-display text-6xl leading-none">{p.balance}</span> <span className="text-sm">points</span></p>
          {p.pending > 0 && <p className="text-sm opacity-75">+{p.pending} waiting for the door to scan your outside ticket</p>}
        </div>
        <p className="text-sm">
          {p.nights_12m} {p.nights_12m === 1 ? "night" : "nights"} in the last year.
          {p.next_tier_title && p.nights_to_next != null ? ` ${p.nights_to_next} more to ${p.next_tier_title}.` : ""}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/points" className="font-display px-4 py-2.5 border-4 border-ink bg-acid-yellow">Use points</Link>
          <button type="button" onClick={invite} className="font-display px-4 py-2.5 border-4 border-ink bg-cream">{copied ? "Link copied" : "Invite a friend"}</button>
        </div>
        <p className="text-sm opacity-75">
          {p.friends_joined > 0 ? `${p.friends_joined} joined with your link, ${p.friends_came} came to a night. ` : ""}
          A friend who joins with your link and comes to a night gets you both points.
        </p>
      </div>
    </section>
  );
}
