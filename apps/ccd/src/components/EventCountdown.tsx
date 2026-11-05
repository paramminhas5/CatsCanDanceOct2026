/**
 * Live countdown to an event start.
 *
 *  - Parses a wide variety of human-readable date strings (the events table
 *    stores things like "Sun, Jun 29, 2026"). Falls back to ISO parsing.
 *  - Hides itself if the date is in the past, unparseable, or < 1 minute
 *    away (the page transitions to "happening now" status visually).
 *  - Updates every 60 seconds — the seconds counter is intentional decoration
 *    (it keeps the page feeling alive) but ticks on its own interval so the
 *    bigger components don't re-render every second.
 */

import { useEffect, useState } from "react";
import { parseEventDate } from "@/lib/parse-date";

type Props = {
  /** The same string you'd put in events.date — e.g. "Sun, Jun 29, 2026". */
  date: string;
  /** Optional doors_time override for the "starts at" line. */
  doorsTime?: string;
  /** Tone the countdown for the surrounding hero. Default is dark on cream. */
  invert?: boolean;
};

const PAD = (n: number) => n.toString().padStart(2, "0");

const EventCountdown = ({ date, doorsTime, invert = false }: Props) => {
  // Start at 0 so server-render and first client render match (no hydration mismatch).
  // The real timestamp is set in useEffect, which only runs on the client.
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    // Tick every second so the seconds counter is actually live.
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, []);

  // Not yet hydrated on the client — render nothing to avoid a flash.
  if (!now) return null;

  const target = parseEventDate(date);
  if (!target) return null;

  // If doorsTime is given (e.g. "4 PM", "4:30 PM") set the countdown to that
  // hour on the event day rather than midnight so it counts to the actual start.
  if (doorsTime) {
    const clean = doorsTime.trim().toUpperCase();
    const m = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
    if (m) {
      let h = parseInt(m[1]);
      const mins = parseInt(m[2] ?? "0");
      if (m[3] === "PM" && h < 12) h += 12;
      if (m[3] === "AM" && h === 12) h = 0;
      target.setHours(h, mins, 0, 0);
    }
  }

  const diff = target.getTime() - now;
  if (diff < 60_000) return null; // < 1 minute — hide; status pill takes over

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins    = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const bg = invert ? "bg-acid-yellow text-ink" : "bg-ink text-cream";
  const accent = invert ? "text-magenta" : "text-acid-yellow";

  return (
    <div
      className={`${bg} border-y-4 border-ink py-5 md:py-7`}
      role="timer"
      aria-live="polite"
      aria-label={`Doors open in ${days} days, ${hours} hours, ${mins} minutes`}
    >
      <div className="container flex flex-wrap items-center justify-between gap-4 md:gap-6">
        <div>
          <p className={`font-display text-xs md:text-sm tracking-widest mb-1 ${accent}`}>
            / DOORS OPEN IN
          </p>
          <p className="font-display text-3xl md:text-5xl leading-none">
            {days > 0 && <><span>{days}</span><span className="opacity-50">D</span><span className="mx-2 opacity-30">·</span></>}
            <span>{PAD(hours)}</span><span className="opacity-50">H</span>
            <span className="mx-2 opacity-30">·</span>
            <span>{PAD(mins)}</span><span className="opacity-50">M</span>
            <span className="mx-2 opacity-30">·</span>
            <span className="tabular-nums">{PAD(Math.floor(seconds))}</span><span className="opacity-50">S</span>
          </p>
        </div>
        {doorsTime && (
          <div className="text-right">
            <p className={`font-display text-xs md:text-sm tracking-widest mb-1 ${accent}`}>
              / KICK-OFF
            </p>
            <p className="font-display text-xl md:text-2xl leading-none">{doorsTime}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCountdown;
