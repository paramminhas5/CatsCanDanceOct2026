/**
 * /door/live/<key>: the venue's live count. No sign-in, no names: how many are inside against capacity,
 * and how many came in over the last 15 minutes. Refreshes every 15 seconds. The door lead makes the link.
 */
import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { timeIST } from "@/lib/door";

type Live = { ok: boolean; title?: string; venue?: string; date?: string; capacity?: number | null; inside?: number; expected?: number; last15?: number; at?: string };

export default function DoorLivePage() {
  const { query, isReady } = useRouter();
  const key = typeof query.key === "string" ? query.key : "";
  const [d, setD] = useState<Live | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!isReady || !key) return;
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase.rpc("door_live", { p_key: key });
      if (!alive) return;
      if (error) { setStale(true); return; }
      setStale(false); setD(data as Live);
    };
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [isReady, key]);

  const cap = d?.capacity ?? null;
  const pct = cap && d?.inside != null ? Math.min(100, Math.round((d.inside / cap) * 100)) : null;
  const left = cap && d?.inside != null ? Math.max(0, cap - d.inside) : null;

  return (
    <>
      <Head>
        <title>Live count | Cats Can Dance</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-[100dvh] bg-ink text-cream flex flex-col p-6">
        {!d ? (
          <p className="m-auto font-display text-3xl">Loading…</p>
        ) : !d.ok ? (
          <p className="m-auto text-center text-xl max-w-sm">This live link has been replaced or does not exist. Ask the door lead for the new one.</p>
        ) : (
          <>
            <div>
              <p className="font-display text-acid-yellow text-sm tracking-widest">LIVE COUNT</p>
              <p className="font-display text-2xl sm:text-4xl leading-tight mt-1">{d.title}</p>
              <p className="text-cream/70">{[d.venue, d.date].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="my-auto py-10 text-center">
              <p className="font-display text-[34vw] sm:text-[22vw] leading-none tabular-nums">{d.inside}</p>
              <p className="text-2xl sm:text-3xl mt-2">inside{cap ? ` of ${cap}` : ""}</p>
              {pct !== null && (
                <div className="mt-6 max-w-2xl mx-auto h-5 bg-cream/15 border-2 border-cream">
                  <div className={`h-full ${pct >= 95 ? "bg-magenta" : pct >= 80 ? "bg-orange" : "bg-acid-yellow"}`} style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xl">
                {left !== null && <span><b className="font-display">{left}</b> spaces left</span>}
                <span><b className="font-display">{d.last15}</b> in the last 15 minutes</span>
                {d.expected ? <span><b className="font-display">{d.expected}</b> on the list</span> : null}
              </div>
            </div>
            <p className="text-sm text-cream/50 text-center">{stale ? "No connection. Showing the last count." : d.at ? `Updated ${timeIST(d.at)}. Refreshes every 15 seconds.` : ""}</p>
          </>
        )}
      </div>
    </>
  );
}
