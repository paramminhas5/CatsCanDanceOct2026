"use client";
/**
 * Today (board F38-A-Today): what needs you now. Asks waiting on you, your next booked or playing day,
 * days you marked open, and a short to-do list built from what is missing on your page.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Readout, Led, Cat } from "@ccd/ui";
import { myArtist, loadMyThreads, loadCalendar, loadMySettings, type ThreadRow, type DayRow, type MySettings } from "@/lib/booking-desk";
import { dayLong, dayShort, STAGE_LABEL } from "@/lib/desk";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function MeToday() {
  const [me, setMe] = useState<{ slug: string; name: string } | null | undefined>(undefined);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [settings, setSettings] = useState<MySettings | null>(null);
  useEffect(() => {
    const today = new Date();
    const until = new Date(Date.now() + 90 * 86400000);
    myArtist().then((r) => setMe(r.ok ? r.data : null));
    loadMyThreads(true).then((r) => setThreads(r.rows.filter((x) => x.role === "artist"))).catch(() => {});
    loadCalendar(iso(today), iso(until)).then((r) => r.ok && setDays(r.data ?? []));
    loadMySettings().then((r) => r.ok && setSettings(r.data));
  }, []);
  if (me === undefined) return <p className="k-b" aria-busy="true">Loading your day</p>;
  if (me === null) {
    return (
      <div className="k-surface grid justify-items-start gap-3 rounded-[22px] p-6">
        <Cat name="lime" height={72} />
        <b className="text-[19px]">No page linked to this email yet</b>
        <p className="k-b m-0">Claim your page and we link it to this account once we have checked it is you.</p>
        <Link className="k-btn k-btn--key" href="/claim">Claim your page</Link>
      </div>
    );
  }
  const waiting = threads.filter((t) => t.last_actor !== "artist" && ["sent", "seen", "countered"].includes(t.stage));
  const next = days.filter((d) => d.state !== "open").sort((a, b) => a.day.localeCompare(b.day))[0];
  const open = days.filter((d) => d.state === "open").length;
  const todo = [
    waiting.length ? { t: `Answer ${waiting.length} ${waiting.length === 1 ? "ask" : "asks"}`, href: "/bookings" } : null,
    !settings?.formats?.length ? { t: "Set your rates and set lengths", href: "/me/page" } : null,
    !open ? { t: "Mark the days you are free", href: "/me/page#days" } : null,
    { t: "Put your next tour up", href: "/me/tour" },
  ].filter(Boolean) as { t: string; href: string }[];
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_420px]">
      <div className="grid content-start gap-8">
        <div>
          <h1 className="k-d text-[44px] md:text-[64px]">{me.name}</h1>
          <Link href={`/${me.slug}`} className="k-b text-sm">See your public page</Link>
        </div>
        <Readout cells={[{ value: waiting.length || "0", label: "Asks waiting" }, { value: next ? dayShort(next.day) : "None", label: "Next booked" }, { value: open || "0", label: "Open days" }]} />
        <div>
          <h2 className="k-d text-[28px]">To do</h2>
          <ul className="mt-3 list-none p-0">
            {todo.map((x) => (
              <li key={x.t}><a className="k-li" href={x.href}><span className="k-chk" aria-hidden="true" /><span className="flex-1"><b>{x.t}</b></span></a></li>
            ))}
          </ul>
        </div>
        {waiting.length > 0 && (
          <div>
            <h2 className="k-d text-[28px]">Waiting on you</h2>
            <ul className="mt-3 list-none p-0">
              {waiting.slice(0, 5).map((t) => (
                <li key={t.id}><Link className="k-li" href={`/bookings/${t.id}`}><Led>{STAGE_LABEL[t.stage]}</Led><span className="min-w-0 flex-1"><b>{[t.name, t.org].filter(Boolean).join(", ")}</b><small>{[t.event_date ? dayShort(t.event_date) : null, t.city, t.budget_band].filter(Boolean).join(" · ")}</small></span></Link></li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <aside className="grid content-start gap-4">
        {next ? (
          <div className="k-paper rounded-[18px] p-6" style={{ transform: "rotate(-1deg)" }}>
            <span className="k-m !text-[#141414]">Next {next.state === "playing" ? "show" : "booking"}</span>
            <div className="k-d mt-2 text-[34px] text-[#141414]">{dayLong(next.day)}</div>
            <p className="m-0 mt-1 text-[#141414]/70">{next.city ?? next.note ?? ""}</p>
          </div>
        ) : (
          <div className="k-surface rounded-[18px] p-6"><b>Nothing booked in the next 90 days</b><p className="k-b m-0 mt-1 text-sm">Mark your free days so promoters can find you on their date.</p></div>
        )}
        <Link className="k-btn k-btn--key k-btn--l" href="/me/tour">Put a tour up</Link>
      </aside>
    </div>
  );
}
