/**
 * /bookings: every booking request you can see, for both sides.
 *   You asked      requests you sent (signed in, or saved on this device when sent as a visitor)
 *   Asked of you   requests to your artist page, with fit signals
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import DeskShell, { SignInNudge, btn, btnAlt } from "@/components/booking/DeskShell";
import { StagePill } from "@/components/booking/StageTrack";
import { useMember } from "@/lib/member";
import { loadMyThreads, type ThreadRow } from "@/lib/booking-desk";
import { dayShort, inrShort, roomLabel } from "@/lib/desk";
import { ARTIST_DESK, artistPath, threadPath } from "@/lib/routes";

export default function Bookings() {
  const { loading, signedIn } = useMember();
  const [rows, setRows] = useState<ThreadRow[] | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [tab, setTab] = useState<"requester" | "artist">("requester");

  useEffect(() => {
    if (loading) return;
    loadMyThreads(signedIn).then((r) => {
      setRows(r.rows); setLegacy(r.legacy);
      if (!r.rows.some((x) => x.role === "requester") && r.rows.some((x) => x.role === "artist")) setTab("artist");
    });
  }, [loading, signedIn]);

  const mine = (rows ?? []).filter((r) => r.role === "requester");
  const forMe = (rows ?? []).filter((r) => r.role === "artist");
  const list = tab === "artist" ? forMe : mine;

  return (
    <DeskShell title="Your booking requests" eyebrow="Bookings" heading="YOUR REQUESTS." path="/bookings">
      {rows === null ? (
        <div className="grid gap-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-24 border-4 border-ink/20 bg-ink/5" />)}</div>
      ) : (
        <>
          {forMe.length > 0 && (
            <div className="flex gap-2 mb-6" role="tablist">
              <button role="tab" aria-selected={tab === "requester"} onClick={() => setTab("requester")} className={tab === "requester" ? btn : btnAlt}>You asked {mine.length}</button>
              <button role="tab" aria-selected={tab === "artist"} onClick={() => setTab("artist")} className={tab === "artist" ? btn : btnAlt}>Asked of you {forMe.length}</button>
            </div>
          )}
          {legacy && (
            <p className="mb-6 border-l-4 border-electric-blue pl-3 text-ink/80">Threads, counter offers and receipts switch on with the next database update. For now you see each request and the artist&apos;s answer, and replies go by email.</p>
          )}

          {list.length === 0 ? (
            <div className="border-4 border-dashed border-ink/40 p-6 md:p-8 max-w-2xl">
              <p className="font-display text-2xl leading-tight mb-2">{tab === "artist" ? "No requests for you yet." : "No requests yet."}</p>
              <p className="text-ink/75 mb-5">
                {signedIn
                  ? "Requests you send from the booking desk show here, with every reply."
                  : "Requests sent from this device show here. Join with the email you used to see them anywhere."}
              </p>
              {signedIn ? <Link href="/book" className={btn}>Find an artist</Link> : <SignInNudge />}
            </div>
          ) : (
            <ul className="grid gap-4">
              {list.map((r) => <Row key={r.id} r={r} />)}
            </ul>
          )}

          {forMe.length > 0 && (
            <p className="mt-10"><Link href={ARTIST_DESK} className={btnAlt}>Your calendar and booking settings</Link></p>
          )}
        </>
      )}
    </DeskShell>
  );
}

function Row({ r }: { r: ThreadRow }) {
  const who = r.role === "artist" ? `${r.name}${r.org ? `, ${r.org}` : ""}` : r.artist ?? r.artist_slug;
  const facts = [r.event_date && dayShort(r.event_date), r.city, r.venue, roomLabel(r.room_size), r.set_length].filter(Boolean).join(" · ");
  const money = r.fee_inr ? `Fee ${inrShort(r.fee_inr)}` : r.budget_band ? `Budget ${r.budget_band}` : "";
  const waiting = (r.role === "artist" && ["sent", "seen"].includes(r.stage)) || (r.role === "requester" && ["interested", "countered"].includes(r.stage) && r.last_actor === "artist");
  const body = (
    <div className="grid grid-cols-[auto_1fr] gap-4 p-4 md:p-5 items-start">
      {r.role === "requester" && r.photo_url
        ? <img src={r.photo_url} alt="" className="w-14 h-14 object-cover border-2 border-ink" />
        : <span className="w-14 h-14 border-2 border-ink bg-electric-blue text-cream font-display text-2xl grid place-items-center">{(who || "?").slice(0, 1)}</span>}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StagePill stage={r.stage} />
          {waiting && <span className="text-xs font-bold text-magenta">Your move</span>}
        </div>
        <p className="font-display text-2xl leading-tight mt-1 break-words">{who}</p>
        <p className="text-sm font-bold text-ink/75">{facts}{money ? ` · ${money}` : ""}</p>
        {r.last_message && <p className="mt-1 text-sm text-ink/70 line-clamp-2">{r.last_message}</p>}
        {r.legacy && r.message && r.role === "artist" && <p className="mt-1 text-sm text-ink/70 line-clamp-2">{r.message}</p>}
      </div>
    </div>
  );
  return (
    <li className="border-4 border-ink bg-cream">
      {r.legacy ? (
        <div>
          {body}
          <p className="px-5 pb-4 text-sm">
            {r.role === "artist" ? <>Answer it in <Link href="/club" className="underline font-bold">your club page</Link>.</> : <>See the artist: <Link href={artistPath(r.artist_slug)} className="underline font-bold">{r.artist ?? r.artist_slug}</Link></>}
          </p>
        </div>
      ) : (
        <Link href={threadPath(r.id, r.key)} className="block hover:bg-acid-yellow/40 transition-colors">{body}</Link>
      )}
    </li>
  );
}
