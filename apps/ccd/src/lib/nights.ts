/**
 * Helpers for CCD's own nights: status from the real date, display dates,
 * start time, calendar links and directions. Shared by the event page,
 * the ticket page and the ticket pass.
 */
import { parseEventDate } from "@/lib/parse-date";

export type NightLike = {
  slug: string;
  title: string;
  date?: string | null;          // human text, e.g. "Wed, Nov 25, 2026"
  event_date?: string | null;    // ISO date, e.g. "2026-11-25"
  start_time?: string | null;    // "8 PM", "19:30"
  status?: string | null;
  venue?: string | null;
  city?: string | null;
  published?: boolean | null;
  listed?: boolean | null;
};

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

function isoDay(n: NightLike): string | null {
  if (n.event_date && /^\d{4}-\d{2}-\d{2}/.test(n.event_date)) return n.event_date.slice(0, 10);
  const d = parseEventDate(n.date ?? null);
  if (!d) return null;
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Upcoming or past from the real date, so a stale status column never shows an old night as upcoming. */
export function nightStatus(n: NightLike): "upcoming" | "past" | "cancelled" {
  if (n.status === "cancelled") return "cancelled";
  const d = isoDay(n);
  if (!d) return n.status === "past" ? "past" : "upcoming";
  return d >= todayIST() ? "upcoming" : "past";
}

/** Should this night show in public lists? Unpublished, cancelled and test nights stay out. */
export function isListed(n: NightLike): boolean {
  if (n.published === false) return false;
  if (n.status === "cancelled") return false;
  if (n.listed === false) return false;
  if (n.listed == null && n.slug.startsWith("test-night")) return false;
  return true;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Wed 25 Nov 2026". Falls back to whatever text the row has. */
export function displayDate(n: NightLike, withYear = true): string {
  const d = isoDay(n);
  if (!d) return n.date ?? "Date to be announced";
  const [y, m, day] = d.split("-").map(Number);
  const wd = DAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  return `${wd} ${day} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

/** Parses "8 PM", "8:30pm", "20:00". Returns [hour, minute] or null. */
export function parseTime(t?: string | null): [number, number] | null {
  if (!t) return null;
  const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return [h, min];
}

/** "8 PM" style label, or null. */
export function displayTime(t?: string | null): string | null {
  const p = parseTime(t);
  if (!p) return null;
  const [h, m] = p;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

/** Start as a Date (IST). Defaults to 8 PM when no time is set. */
export function startDate(n: NightLike, time?: string | null): Date | null {
  const d = isoDay(n);
  if (!d) return null;
  const [h, m] = parseTime(time ?? n.start_time) ?? [20, 0];
  return new Date(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`);
}

const calStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function googleCalendarUrl(n: NightLike, opts: { time?: string | null; url: string; hours?: number }): string | null {
  const s = startDate(n, opts.time);
  if (!s) return null;
  const e = new Date(s.getTime() + (opts.hours ?? 5) * 3600 * 1000);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `Cats Can Dance: ${n.title}`,
    dates: `${calStamp(s)}/${calStamp(e)}`,
    location: [n.venue, n.city].filter(Boolean).join(", "),
    details: `Your tickets: ${opts.url}`,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Downloads an .ics file (Apple Calendar, Outlook). */
export function downloadIcs(n: NightLike, opts: { time?: string | null; url: string; hours?: number }) {
  const s = startDate(n, opts.time);
  if (!s) return;
  const e = new Date(s.getTime() + (opts.hours ?? 5) * 3600 * 1000);
  const esc = (x: string) => x.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cats Can Dance//Tickets//EN", "BEGIN:VEVENT",
    `UID:${n.slug}@catscandance.com`, `DTSTAMP:${calStamp(new Date())}`, `DTSTART:${calStamp(s)}`, `DTEND:${calStamp(e)}`,
    `SUMMARY:${esc(`Cats Can Dance: ${n.title}`)}`,
    `LOCATION:${esc([n.venue, n.city].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${esc(`Your tickets: ${opts.url}`)}`, `URL:${opts.url}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${n.slug}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Google Maps link: the curated map link when we have one, otherwise a search for the venue. */
export function directionsUrl(venue?: string | null, city?: string | null, mapUrl?: string | null): string | null {
  if (mapUrl) return mapUrl;
  if (!venue) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue, city].filter(Boolean).join(", "))}`;
}

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
