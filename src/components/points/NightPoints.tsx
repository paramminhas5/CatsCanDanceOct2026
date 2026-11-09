/**
 * On a CCD night page: what this night is worth in points and what you can spend here.
 * Signed out it just explains; signed in it lists the perks you can take for this night.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useMember } from "@/lib/member";
import { loadMyPoints, loadPerks, redeem, type MyPoints, type Perk } from "@/lib/points";
import { track } from "@/lib/track";

export default function NightPoints({ slug, title }: { slug: string; title: string }) {
  const { signedIn, member } = useMember();
  const [perks, setPerks] = useState<Perk[]>([]);
  const [me, setMe] = useState<MyPoints | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [code, setCode] = useState<string | null>(null);

  const load = async () => {
    setPerks(await loadPerks(slug));
    if (member) setMe(await loadMyPoints());
  };
  useEffect(() => { load(); }, [slug, member?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const take = async (p: Perk) => {
    setBusy(p.id); setMsg("");
    const r = await redeem(p.id, slug);
    setBusy(null);
    if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
    track("points_redeem", { perk: p.id });
    if (r.result?.code) { setCode(r.result.code); setMsg(`Your free ticket code. Use it at checkout for ${title}.`); }
    else if (r.result?.on_list) setMsg("You're on the list. It shows in Your account.");
    else if (r.result?.plus_ones) setMsg(`Done. You can bring ${r.result.plus_ones} ${r.result.plus_ones === 1 ? "guest" : "guests"}.`);
    load();
  };

  return (
    <div className="border-4 border-ink bg-white p-4">
      <p className="font-display text-xl leading-tight">Points for this night</p>
      <p className="text-sm mt-1">Get scanned in and it counts toward free tickets. Same for outside tickets the door scans.</p>
      {!signedIn || !member ? (
        <Link href="/points" className="inline-block mt-3 text-sm underline">How points work</Link>
      ) : (
        <>
          {me && <p className="text-sm mt-2">You have <b>{me.balance}</b> points.</p>}
          {perks.length > 0 && (
            <ul className="mt-3 grid gap-2">
              {perks.map((p) => {
                const can = p.affordable && p.tier_ok && p.left !== 0;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 border-2 border-ink p-2">
                    <span className="text-sm"><b>{p.title}</b> · {p.cost} pts{p.left != null ? ` · ${p.left} left` : ""}</span>
                    <button type="button" disabled={!can || busy === p.id} onClick={() => take(p)}
                      className="font-display text-sm px-3 py-1 border-4 border-ink bg-acid-yellow disabled:opacity-40">
                      {busy === p.id ? "…" : "Use"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {msg && <p className="text-sm font-bold mt-2" role="status">{msg}</p>}
          {code && <p className="font-mono text-lg mt-1 select-all">{code}</p>}
        </>
      )}
    </div>
  );
}
