import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const btn = "border-4 border-ink bg-cream px-3 py-2 font-display text-sm text-ink chunk-shadow";

/** "I'm going" and "Like" for one of CCD's own nights, with counts. Asks visitors to join first. */
export default function NightActions({ slug }: { slug: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [going, setGoing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [counts, setCounts] = useState({ going: 0, likes: 0 });
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const s = await supabase.auth.getSession();
    setSignedIn(!!s.data.session);
    const nc = await supabase.rpc("night_counts");
    const row = ((nc.data as any[]) ?? []).find((x) => x.event_slug === slug);
    setCounts({ going: Number(row?.going ?? 0), likes: Number(row?.likes ?? 0) });
    if (s.data.session) {
      const ns = await supabase.rpc("my_night_state");
      const mine = ((ns.data as any[]) ?? []).find((x) => x.event_slug === slug);
      setGoing(!!mine?.going); setLiked(!!mine?.liked);
    }
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  async function act(fn: string, args: Record<string, unknown>) {
    if (!signedIn) { setNote("Join the club to do this."); return; }
    const { data, error } = await supabase.rpc(fn, args);
    setNote(error || (data && data.ok === false) ? (error?.message ?? data.error ?? "Could not save.") : "");
    load();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={btn} onClick={() => act("set_night_going", { p_slug: slug, p_going: !going, p_show_name: false })}>
        {going ? "Going ✓" : "I'm going"} ({counts.going})
      </button>
      <button type="button" className={btn} onClick={() => act("toggle_night_like", { p_slug: slug })}>
        {liked ? "Liked ♥" : "Like"} ({counts.likes})
      </button>
      {note && <span className="text-sm">{note} {!signedIn && <Link href="/join" className="underline">Join</Link>}</span>}
    </div>
  );
}
